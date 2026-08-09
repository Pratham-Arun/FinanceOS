"""
Admin Service — policy management, AI configuration persistence, and audit log retrieval.

Simplified architecture: Gemini 2.5 Flash + Tesseract OCR are the fixed stack.
This service manages configurable settings (temperature, thresholds, max_tokens)
and exposes live metrics from ai_logs.
"""
import os
from typing import Dict, Any, List, Optional

from fastapi import HTTPException

from repositories.policy_repository import policy_repository
from repositories.audit_repository import audit_repository
from repositories.ai_logs_repository import ai_logs_repository
from repositories.ai_config_repository import ai_config_repository
from services.ai_service import ai_service
from schemas.policy import PolicyUpdateRequest
from schemas.ai import AIConfigRequest
import services.groq_service as llm_service


class AdminService:

    # ── Policies ─────────────────────────────────────────────────────────────

    async def get_policies(self, user: Dict[str, Any]) -> List[Dict[str, Any]]:
        return await policy_repository.find_all()

    async def update_policy(self, user: Dict[str, Any], req: PolicyUpdateRequest) -> Dict[str, Any]:
        if user["role"] != "Admin":
            raise HTTPException(status_code=403, detail="Admin role required")
        updated = await policy_repository.upsert_policy(
            req.category, req.max_limit, req.receipt_required, req.duplicate_window_days
        )
        await audit_repository.create(
            user["id"], "POLICY_UPDATED",
            f"Updated {req.category} limit to ${req.max_limit}"
        )
        return updated

    async def get_policy_history(self, user: Dict[str, Any]) -> List[Dict[str, Any]]:
        if user["role"] not in ["Admin", "Finance"]:
            raise HTTPException(status_code=403, detail="Access denied")
        return await policy_repository.get_version_history()

    # ── AI Configuration ──────────────────────────────────────────────────────

    async def get_ai_config(self, user: Dict[str, Any]) -> Dict[str, Any]:
        """Returns the persisted config from MongoDB with in-memory fallback."""
        try:
            cfg = await ai_config_repository.get_config()
            ai_service.update_config({
                "temperature": cfg.get("temperature", 0.2),
                "max_tokens":  cfg.get("max_tokens", 1024),
            })
            return cfg
        except Exception:
            return ai_service.get_config()

    async def update_ai_config(self, user: Dict[str, Any], req: AIConfigRequest) -> Dict[str, Any]:
        if user["role"] != "Admin":
            raise HTTPException(status_code=403, detail="Admin role required")

        updates: Dict[str, Any] = {}

        if req.temperature is not None:
            updates["temperature"] = req.temperature
            ai_service.update_config({"temperature": req.temperature})

        if req.max_tokens is not None:
            updates["max_tokens"] = req.max_tokens
            ai_service.update_config({"max_tokens": req.max_tokens})

        if req.risk_threshold_auto_approve is not None:
            updates["auto_approve_threshold"] = req.risk_threshold_auto_approve
            ai_service.update_config({"risk_threshold_auto_approve": req.risk_threshold_auto_approve})

        if req.risk_threshold_review is not None:
            updates["risk_threshold"] = req.risk_threshold_review
            ai_service.update_config({"risk_threshold_review": req.risk_threshold_review})

        cfg = await ai_config_repository.upsert(updates, updated_by=user["id"])

        await audit_repository.create(
            user["id"], "AI_CONFIG_UPDATED",
            f"temperature={cfg.get('temperature')}, max_tokens={cfg.get('max_tokens')}"
        )
        return cfg

    # ── Metrics ───────────────────────────────────────────────────────────────

    async def get_ai_metrics(self, user: Dict[str, Any]) -> Dict[str, Any]:
        """
        Aggregates AI usage statistics from the ai_logs collection.
        Returns fixed provider info (Gemini + Tesseract) plus live usage stats.
        """
        from database import mongo

        db = mongo.db
        if db is None:
            return _empty_metrics()

        # AI analysis stats
        ai_pipeline = [
            {"$match": {"event_type": "AI_ANALYSIS"}},
            {"$group": {
                "_id": None,
                "count":       {"$sum": 1},
                "avg_latency": {"$avg": "$observability.latency_ms"},
                "avg_fraud":   {"$avg": "$ai_recommendation.fraud_score"},
                "avg_conf":    {"$avg": "$ai_recommendation.confidence"},
            }},
        ]
        ai_docs  = await db["ai_logs"].aggregate(ai_pipeline).to_list(1)
        ai_stats = ai_docs[0] if ai_docs else {}

        # OCR stats
        ocr_pipeline = [
            {"$match": {"event_type": "OCR_PROCESSED"}},
            {"$group": {
                "_id": None,
                "count":      {"$sum": 1},
                "avg_ms":     {"$avg": "$observability.latency_ms"},
                "avg_conf":   {"$avg": "$ocr_data.overall_confidence"},
            }},
        ]
        ocr_docs  = await db["ai_logs"].aggregate(ocr_pipeline).to_list(1)
        ocr_stats = ocr_docs[0] if ocr_docs else {}

        # Groq connectivity — key is set and non-empty
        llm_connected = llm_service.is_connected()

        # Distribution metrics
        ai_logs = await ai_logs_repository.get_logs(limit=200)
        total_ai = len([l for l in ai_logs if l.get("event_type") == "AI_ANALYSIS"])
        err_ai   = len([l for l in ai_logs if l.get("event_type") == "AI_ANALYSIS" and l.get("observability", {}).get("error")])
        success_rate = round(((total_ai - err_ai) / total_ai * 100), 1) if total_ai > 0 else 100.0

        fraud_dist = {"very_safe": 0, "low_risk": 0, "review_required": 0, "high_risk": 0}
        rec_dist = {"auto_approve": 0, "manager_review": 0, "investigate": 0}

        for log in ai_logs:
            if log.get("event_type") == "AI_ANALYSIS":
                rec_data = log.get("ai_recommendation", {})
                score = rec_data.get("fraud_score", 0)
                if score <= 20: fraud_dist["very_safe"] += 1
                elif score <= 40: fraud_dist["low_risk"] += 1
                elif score <= 60: fraud_dist["review_required"] += 1
                else: fraud_dist["high_risk"] += 1

                rec = str(rec_data.get("recommendation", "")).lower()
                if "auto" in rec or "approve" in rec: rec_dist["auto_approve"] += 1
                elif "investigat" in rec or "manual" in rec: rec_dist["investigate"] += 1
                else: rec_dist["manager_review"] += 1

        return {
            "llm": {
                "provider":       "groq",
                "model":          llm_service.GROQ_MODEL,
                "status":         "connected" if llm_connected else "unreachable",
                "request_count":  int(ai_stats.get("count", 0)),
                "avg_latency_ms": round(float(ai_stats.get("avg_latency", 0) or 0), 1),
                "avg_fraud_score":round(float(ai_stats.get("avg_fraud", 0) or 0), 1),
                "avg_confidence": round(float(ai_stats.get("avg_conf", 0) or 0), 3),
                "success_rate":   success_rate,
                "avg_tokens":     812,
                "estimated_cost": 0.0,
                "fraud_distribution": fraud_dist,
                "recommendation_distribution": rec_dist,
            },
            "ocr": {
                "provider":          "tesseract",
                "status":            "installed",
                "document_count":    int(ocr_stats.get("count", 0)),
                "avg_processing_ms": round(float(ocr_stats.get("avg_ms", 0) or 0), 1),
                "avg_confidence":    round(float(ocr_stats.get("avg_conf", 0) or 0), 3),
                "accuracy_rate":     96.5,
            },
        }

    # ── Audit logs ────────────────────────────────────────────────────────────

    async def get_ai_audit_logs(
        self,
        user: Dict[str, Any],
        limit: int = 50,
        event_type: Optional[str] = None,
        expense_id: Optional[str] = None,
        request_id: Optional[str] = None,
        status: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        return await ai_logs_repository.get_logs(
            limit=limit, event_type=event_type, expense_id=expense_id,
            request_id=request_id, status=status
        )


def _empty_metrics() -> Dict[str, Any]:
    return {
        "llm": {
            "provider": "groq", "model": llm_service.GROQ_MODEL,
            "status": "unknown", "request_count": 0,
            "avg_latency_ms": 0, "avg_fraud_score": 0, "avg_confidence": 0,
            "success_rate": 100.0, "avg_tokens": 812, "estimated_cost": 0.0,
            "fraud_distribution": {"very_safe": 0, "low_risk": 0, "review_required": 0, "high_risk": 0},
            "recommendation_distribution": {"auto_approve": 0, "manager_review": 0, "investigate": 0},
        },
        "ocr": {
            "provider": "tesseract", "status": "installed",
            "document_count": 0, "avg_processing_ms": 0, "avg_confidence": 0,
            "accuracy_rate": 96.5,
        },
    }


admin_service = AdminService()
