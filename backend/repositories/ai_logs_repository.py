import datetime
from typing import Optional, List, Dict, Any
from database import mongo, format_doc, format_docs
from repositories.interfaces.base import IAILogsRepository

class AILogsRepository(IAILogsRepository):
    @property
    def col(self):
        return mongo.collection("ai_logs")

    async def log_event(
        self,
        expense_id: Optional[str],
        user_id: str,
        event_type: str,
        ocr_data: Optional[Dict[str, Any]] = None,
        rule_output: Optional[Dict[str, Any]] = None,
        ai_recommendation: Optional[Dict[str, Any]] = None,
        user_decision: Optional[str] = None,
        manager_override: Optional[Dict[str, Any]] = None,
        finance_override: Optional[Dict[str, Any]] = None,
        details: Optional[str] = None,
        prompt: Optional[str] = None,
        retrieved_context: Optional[List[str]] = None,
        llm_response_raw: Optional[str] = None,
        latency_ms: Optional[float] = None,
        token_usage: Optional[int] = None,
        estimated_cost_usd: Optional[float] = None,
        error: Optional[str] = None,
        request_id: Optional[str] = None,       # Phase 2: UUID for end-to-end traceability
        ocr_provider: Optional[str] = None,     # Phase 2: provider name for OCR events
    ) -> Dict[str, Any]:
        log_doc = {
            "expense_id": expense_id,
            "user_id": user_id,
            "event_type": event_type,
            "request_id": request_id,
            "ocr_data": ocr_data or {},
            "rule_output": rule_output or {},
            "ai_recommendation": ai_recommendation or {},
            "user_decision": user_decision,
            "manager_override": manager_override,
            "finance_override": finance_override,
            "details": details,
            "observability": {
                "prompt": prompt,
                "retrieved_context": retrieved_context or [],
                "llm_response_raw": llm_response_raw,
                "latency_ms": latency_ms,
                "token_usage": token_usage,
                "estimated_cost_usd": estimated_cost_usd,
                "ocr_provider": ocr_provider,
                "error": error,
            },
            "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat()
        }
        res = await self.col.insert_one(log_doc)
        log_doc["_id"] = str(res.inserted_id)
        return log_doc

    async def get_logs(
        self,
        limit: int = 50,
        event_type: Optional[str] = None,
        expense_id: Optional[str] = None,
        request_id: Optional[str] = None,
        status: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        query = {}
        if event_type:
            query["event_type"] = event_type
        if expense_id:
            query["expense_id"] = expense_id
        if request_id:
            query["request_id"] = request_id
        if status:
            if status.lower() == "error":
                query["observability.error"] = {"$ne": None}
            elif status.lower() == "success":
                query["observability.error"] = None
        docs = await self.col.find(query).sort("timestamp", -1).to_list(limit)
        return format_docs(docs)

    async def get_logs_by_expense(self, expense_id: str) -> List[Dict[str, Any]]:
        docs = await self.col.find({"expense_id": expense_id}).sort("timestamp", -1).to_list(None)
        return format_docs(docs)

    async def get_logs_by_request_id(self, request_id: str) -> List[Dict[str, Any]]:
        docs = await self.col.find({"request_id": request_id}).sort("timestamp", 1).to_list(None)
        return format_docs(docs)

ai_logs_repository: IAILogsRepository = AILogsRepository()
