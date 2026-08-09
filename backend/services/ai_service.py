"""
FinanceOS AI Service — Gemini 2.5 Flash integration.

analyze_expense() calls Gemini and falls back through a 2-tier chain:
  Tier 1: Gemini 2.5 Flash API
  Tier 2: Rule-engine-based analysis (deterministic fallback)

Every call generates a UUID request_id logged to ai_logs for full observability.
"""

import uuid
import time
import datetime
import asyncio
import json
from typing import Dict, Any, List, Optional

from utils.logger import logger
import services.groq_service as llm_service

# Keep gemini_service importable for the metrics endpoint
import services.gemini_service as gemini_service

# ── Custom exceptions ─────────────────────────────────────────────────────────

class LLMParseError(Exception):
    pass

# ── Prompt builder ────────────────────────────────────────────────────────────

def _build_prompt(
    expense_data:     Dict[str, Any],
    ocr_result:       Optional[Dict[str, Any]],
    rule_result:      Optional[Dict[str, Any]],
    duplicate_result: Optional[Dict[str, Any]],
    employee_history: Optional[List[Dict[str, Any]]],
    policy_text:      Optional[str] = None,
) -> str:
    title    = expense_data.get("title", "Expense")
    category = expense_data.get("category", "General")
    amount   = float(expense_data.get("amount", 0.0))
    date     = expense_data.get("expense_date", "")
    desc     = expense_data.get("description", "")

    # OCR section
    if ocr_result and ocr_result.get("ocr_data"):
        fields = ocr_result["ocr_data"]
        def fv(k): return fields.get(k, {}).get("value", "N/A") if isinstance(fields.get(k), dict) else fields.get(k, "N/A")
        def fc(k): return fields.get(k, {}).get("confidence", 0.0) if isinstance(fields.get(k), dict) else 0.0
        ocr_section = (
            f"- Vendor:         {fv('vendor')} (confidence {fc('vendor'):.0%})\n"
            f"- Invoice:        {fv('invoice_number')}\n"
            f"- Date (OCR):     {fv('transaction_date')} (confidence {fc('transaction_date'):.0%})\n"
            f"- Subtotal:       ${fv('subtotal')}\n"
            f"- Tax:            ${fv('tax_amount')}\n"
            f"- Total (OCR):    ${fv('total_amount')} (confidence {fc('total_amount'):.0%})\n"
            f"- OCR Engine:     Tesseract OCR\n"
            f"- Overall conf:   {ocr_result.get('overall_confidence', 0.0):.0%}"
        )
    else:
        ocr_section = "No receipt uploaded or OCR data unavailable."

    # History section
    if employee_history:
        past = [float(e.get("amount", 0)) for e in employee_history if e.get("amount")]
        avg  = sum(past) / len(past) if past else 0.0
        history_section = (
            f"- Total prior claims:   {len(employee_history)}\n"
            f"- Average claim amount: ${avg:.2f}\n"
            f"- Recent amounts:       {[f'${a:.2f}' for a in past[-5:]]}"
        )
    else:
        history_section = "No prior claim history available."

    # Policy violations
    violations    = rule_result.get("violations", []) if rule_result else []
    policy_status = rule_result.get("policy_status", "PASS") if rule_result else "PASS"
    violations_section = "\n".join(f"  - {v}" for v in violations) if violations else "  None"

    # Duplicate
    dup = duplicate_result or {}
    if dup.get("duplicate"):
        dup_section = (
            f"DUPLICATE DETECTED\n"
            f"  Matching expense: {dup.get('similar_expense')}\n"
            f"  Confidence: {dup.get('confidence', 0):.0%}\n"
            f"  Reason: {dup.get('reason', '')}"
        )
    else:
        dup_section = "No duplicate detected."

    return f"""You are FinanceOS AI — an enterprise expense compliance analyst.
Analyze this expense claim and return ONLY valid JSON matching the exact schema below.

EXPENSE:
- Title:       {title}
- Category:    {category}
- Amount:      ${amount:.2f}
- Date:        {date}
- Description: {desc}

OCR EXTRACTED DATA:
{ocr_section}

RULE ENGINE RESULT: {policy_status}
POLICY VIOLATIONS:
{violations_section}

EMPLOYEE HISTORY:
{history_section}

DUPLICATE CHECK:
{dup_section}

COMPANY POLICIES:
{policy_text or 'Standard company expense policy applies.'}

Return this EXACT JSON schema (no markdown, no extra keys):
{{
  "summary": "one sentence summary of this claim",
  "fraud_score": <integer 0-100>,
  "confidence": <float 0.0-1.0>,
  "recommendation": "<Auto Approve Recommendation | Manager Review Required | Manual Investigation Needed>",
  "reasoning": ["<specific reason 1 (if history shows amount exceeds historical average, explicitly state 'historical average' or 'anomaly' in this reason)>", "<specific reason 2>", "..."],
  "policy_citations": ["<Policy Section X.X>", "..."],
  "evidence": ["<evidence item 1 (explicitly list all policy violations, alcohol references, or anomalies here)>", "..."],
  "suggested_action": "<specific instruction for reviewer>"
}}"""


# ── Response parser ───────────────────────────────────────────────────────────

def _parse_llm_response(raw: str) -> Dict[str, Any]:
    """Extracts and validates the JSON block from Gemini's raw string output."""
    text = raw.strip()
    for fence in ("```json", "```"):
        if text.startswith(fence):
            text = text[len(fence):]
    if text.endswith("```"):
        text = text[:-3]
    text = text.strip()

    try:
        data = json.loads(text)
    except json.JSONDecodeError as e:
        raise LLMParseError(f"JSON decode failed: {e}") from e

    required = {"summary", "fraud_score", "confidence", "recommendation", "reasoning"}
    missing  = required - set(data.keys())
    if missing:
        raise LLMParseError(f"Missing required keys: {missing}")

    data["fraud_score"]      = max(0, min(100, int(data["fraud_score"])))
    data["confidence"]       = max(0.0, min(1.0, float(data["confidence"])))
    data["reasoning"]        = data.get("reasoning", []) if isinstance(data.get("reasoning"), list) else []
    data["policy_citations"] = data.get("policy_citations", []) if isinstance(data.get("policy_citations"), list) else []
    data["evidence"]         = data.get("evidence", []) if isinstance(data.get("evidence"), list) else []
    data["suggested_action"] = str(data.get("suggested_action", "Review this expense manually."))
    return data


# ── Rule-engine fallback ──────────────────────────────────────────────────────

def _rule_engine_fallback(
    expense_data:     Dict[str, Any],
    ocr_result:       Optional[Dict[str, Any]],
    rule_result:      Optional[Dict[str, Any]],
    duplicate_result: Optional[Dict[str, Any]],
    employee_history: Optional[List[Dict[str, Any]]],
) -> Dict[str, Any]:
    """Deterministic rule-based analysis; same output shape as Gemini response."""
    title    = expense_data.get("title", "Expense")
    category = expense_data.get("category", "General")
    amount   = float(expense_data.get("amount", 0.0))
    desc     = expense_data.get("description", "")
    exp_date = expense_data.get("expense_date", "")

    reasons: List[str] = []
    fraud_indicators: List[str] = []
    policy_citations: List[str] = []
    raw_score = 0

    if category in ("Meals", "Food"):
        policy_citations.append("Food Policy Section 2.3")
    elif category in ("Accommodation", "Hotel"):
        policy_citations.append("Travel Policy Section 4.2")
    elif category in ("Travel", "Taxi", "Flight"):
        policy_citations.append("Rideshare & Taxi Policy Section 3.1")
    else:
        policy_citations.append("General Expense Policy Section 1.0")

    violations = rule_result.get("violations", []) if rule_result else []
    rule_score = rule_result.get("risk_score", 0) if rule_result else 0
    raw_score += rule_score
    if violations:
        for v in violations:
            reasons.append(f"Policy violation ({policy_citations[0]}): {v}")
            fraud_indicators.append(v)
    else:
        reasons.append(f"Expense complies with policy limits under {policy_citations[0]}.")

    dup = duplicate_result or {}
    if dup.get("duplicate"):
        dup_conf = int((dup.get("confidence", 0.91)) * 100)
        sim_id   = dup.get("similar_expense", "unknown")
        reasons.append(f"Duplicate confidence {dup_conf}% — matches Expense ID {sim_id}.")
        fraud_indicators.append(f"Potential duplicate of {sim_id}.")
        raw_score += 50
    else:
        reasons.append("Duplicate check: no matching prior claims found.")

    if ocr_result:
        conf = ocr_result.get("overall_confidence", 0.95)
        if conf >= 0.90:
            reasons.append(f"Receipt verified via Tesseract OCR — confidence {conf:.0%}.")
        else:
            reasons.append(f"Low OCR confidence ({conf:.0%}) — manual receipt verification recommended.")
            fraud_indicators.append("Low OCR extraction confidence.")
            raw_score += 15

    if employee_history:
        past = [float(e.get("amount", 0)) for e in employee_history if e.get("amount")]
        if past:
            avg_past = sum(past) / len(past)
            if amount > 4 * avg_past and amount > 200:
                excess = amount - avg_past
                reasons.append(
                    f"Anomaly: ${amount:.2f} is 4× the employee's historical average "
                    f"(${avg_past:.2f}). Excess: ${excess:.2f}."
                )
                fraud_indicators.append("Amount significantly exceeds historical average.")
                raw_score += 35

    if exp_date:
        try:
            dt = datetime.datetime.fromisoformat(exp_date.replace("Z", "+00:00"))
            if dt.weekday() in (5, 6):
                reasons.append("Transaction date falls on a weekend — verify business purpose.")
                raw_score += 10
        except Exception:
            pass

    desc_lower = desc.lower()
    if any(w in desc_lower for w in ("alcohol", "beer", "wine", "cocktail", "liquor")):
        reasons.append("Description mentions alcohol — non-reimbursable under Food Policy Section 2.3.")
        fraud_indicators.append("Alcohol reference in expense description.")
        raw_score += 45

    fraud_score = max(0, min(100, raw_score))

    if fraud_score <= 20:
        recommendation = "Auto Approve Recommendation"
        confidence     = 0.97
    elif fraud_score <= 60:
        recommendation = "Manager Review Required"
        confidence     = 0.88
    else:
        recommendation = "Manual Investigation Needed"
        confidence     = 0.75

    suggested = (
        "Approve this claim — all checks passed."
        if not fraud_indicators
        else f"Review the following issues before approving: {'; '.join(fraud_indicators[:2])}"
    )

    past = [float(e.get("amount", 0)) for e in (employee_history or []) if e.get("amount")]
    hist_avg = round(sum(past) / len(past), 2) if past else 0.0

    return {
        "summary":          f"{category} claim for '{title}' (${amount:.2f}). Risk Score: {fraud_score}/100.",
        "fraud_score":      fraud_score,
        "confidence":       confidence,
        "recommendation":   recommendation,
        "reasoning":        reasons,
        "policy_citations": policy_citations,
        "evidence":         fraud_indicators,
        "suggested_action": suggested,
        "historical_average": hist_avg,
        "source":           "rule_engine_fallback",
    }


# ── Normalise result ──────────────────────────────────────────────────────────

def _normalise_result(r: Dict[str, Any]) -> Dict[str, Any]:
    """
    Maps canonical schema to the legacy keys expected by the frontend.

    anomaly  — True when fraud_indicators contains a significant anomaly signal
               (amount spike, duplicate, or low OCR confidence).
    severity — derived from fraud_score bands; not a static "Low".
    """
    fraud = r.get("fraud_score", 0)

    if fraud <= 20:
        risk_level = "Very Safe"
    elif fraud <= 40:
        risk_level = "Low Risk"
    elif fraud <= 60:
        risk_level = "Review Required"
    elif fraud <= 80:
        risk_level = "High Risk"
    else:
        risk_level = "Very High Risk"

    # Derive severity from fraud score
    if fraud <= 20:
        severity = "Low"
    elif fraud <= 60:
        severity = "Medium"
    else:
        severity = "High"

    # Compute anomaly from evidence / fraud_indicators content
    indicators: List[str] = list(r.get("evidence", []))
    for ind in r.get("fraud_indicators", []):
        if ind not in indicators:
            indicators.append(ind)

    # If evidence missed explicit flags mentioned in reasoning (e.g. alcohol), include them
    for line in r.get("reason", r.get("reasoning", [])):
        if "alcohol" in str(line).lower() and not any("alcohol" in str(ind).lower() for ind in indicators):
            indicators.append(str(line))

    anomaly_keywords = (
        "anomaly", "historical", "duplicate", "4×", "4x",
        "spike", "unusual", "exceeds historical",
    )
    anomaly = any(
        any(kw in str(ind).lower() for kw in anomaly_keywords)
        for ind in indicators
    )
    # Also check reasoning list in case evidence is empty (rule-engine path)
    if not anomaly:
        for line in r.get("reason", r.get("reasoning", [])):
            if any(kw in str(line).lower() for kw in anomaly_keywords):
                anomaly = True
                break

    r.setdefault("risk",             risk_level)
    r["severity"]         = severity          # always overwrite — never static
    r["anomaly"]          = anomaly           # always overwrite — computed above
    r.setdefault("reason",           r.pop("reasoning", []) if "reasoning" in r else r.get("reason", []))
    r["fraud_indicators"] = indicators
    r.setdefault("policy_sections",  r.get("policy_citations", []))
    return r


# ── AI Service ────────────────────────────────────────────────────────────────

class AIService:

    async def analyze_expense(
        self,
        expense_data:     Dict[str, Any],
        ocr_result:       Optional[Dict[str, Any]]       = None,
        rule_result:      Optional[Dict[str, Any]]       = None,
        duplicate_result: Optional[Dict[str, Any]]       = None,
        employee_history: Optional[List[Dict[str, Any]]] = None,
        # provider_name kept for backward compat with existing callers — ignored
        provider_name:    Optional[str]                  = None,
        policy_text:      Optional[str]                  = None,
    ) -> Dict[str, Any]:
        """
        Full AI analysis pipeline.
          Tier 1 — Gemini 2.5 Flash
          Tier 2 — Rule-engine fallback (when Gemini is unavailable)
        Always returns a result; never raises.
        """
        from repositories.ai_logs_repository import ai_logs_repository

        request_id = str(uuid.uuid4())
        start_time = time.time()
        prompt     = _build_prompt(
            expense_data, ocr_result, rule_result, duplicate_result, employee_history,
            policy_text=policy_text,
        )

        # ── Tier 1: Groq LLM ────────────────────────────────────────────────
        tier1_error: Optional[str] = None
        try:
            raw = await asyncio.wait_for(
                llm_service.analyze_json(prompt),
                timeout=30.0,
            )
            result = _parse_llm_response(raw)
            result["source"] = "groq"

            latency_ms = round((time.time() - start_time) * 1000, 2)
            result["version_metadata"] = {
                "model":           llm_service.GROQ_MODEL,
                "prompt_version":  "v1.0",
                "policy_version":  "v2.3",
                "generated_at":    datetime.datetime.now(datetime.timezone.utc).isoformat(),
                "latency_ms":      latency_ms,
                "token_usage":     result.get("token_usage", 0),
                "estimated_cost_usd": 0.0,
            }
            past = [float(e.get("amount", 0)) for e in (employee_history or []) if e.get("amount")]
            result["historical_average"] = round(sum(past) / len(past), 2) if past else 0.0
            result = _normalise_result(result)

            await ai_logs_repository.log_event(
                expense_id=expense_data.get("id"),
                user_id=expense_data.get("employee_id", "system"),
                event_type="AI_ANALYSIS",
                ai_recommendation=result,
                rule_output=rule_result,
                prompt=prompt[:2000],
                latency_ms=latency_ms,
                request_id=request_id,
            )
            logger.info("AI analysis via Groq", request_id=request_id,
                        latency_ms=latency_ms, fraud_score=result.get("fraud_score"))
            return result

        except asyncio.TimeoutError as e:
            tier1_error = f"Groq timeout after 30s: {e}"
            logger.warning("Groq timeout", request_id=request_id)
        except LLMParseError as e:
            tier1_error = f"Groq parse error: {e}"
            logger.warning("Groq parse error", request_id=request_id, error=str(e))
        except Exception as e:
            tier1_error = f"Groq API error: {e}"
            logger.warning("Groq API error", request_id=request_id, error=str(e))

        # ── Tier 2: Rule-engine fallback ──────────────────────────────────────
        result = _rule_engine_fallback(
            expense_data, ocr_result, rule_result, duplicate_result, employee_history
        )
        latency_ms = round((time.time() - start_time) * 1000, 2)
        result["version_metadata"] = {
            "model": "rule_engine", "prompt_version": "v1.0", "policy_version": "v2.3",
            "generated_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
            "latency_ms": latency_ms, "token_usage": 0, "estimated_cost_usd": 0.0,
        }
        result = _normalise_result(result)

        await ai_logs_repository.log_event(
            expense_id=expense_data.get("id"),
            user_id=expense_data.get("employee_id", "system"),
            event_type="AI_ANALYSIS",
            ai_recommendation=result,
            rule_output=rule_result,
            latency_ms=latency_ms,
            error=tier1_error,
            request_id=request_id,
        )
        logger.info("AI analysis via rule-engine fallback",
                    request_id=request_id, fraud_score=result.get("fraud_score"))
        return result

    async def analyze_expense_with_context(
        self,
        user_id: str,
        expense_data: Dict[str, Any],
        ocr_result: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        from services.rule_engine import rule_engine
        from services.duplicate_service import duplicate_service
        from repositories.expense_repository import expense_repository
        from repositories.policy_repository import policy_repository

        rule_res = await rule_engine.validate_expense(expense_data)
        dup_res  = await duplicate_service.check_duplicate(
            user_id,
            expense_data.get("vendor") or expense_data.get("title"),
            expense_data.get("invoice_number"),
            float(expense_data.get("amount", 0.0)),
            expense_data.get("expense_date", ""),
        )
        history = await expense_repository.find_all_by_employee(user_id)

        # Build structured policy text from DB so Gemini gets real limits
        policy_text: Optional[str] = None
        try:
            policies = await policy_repository.find_all()
            if policies:
                lines = ["Company Expense Policy Limits:"]
                for p in policies:
                    receipt_note = "receipt required" if p.get("receipt_required") else "receipt optional"
                    lines.append(
                        f"  • {p['category']}: max ${p['max_limit']:.2f} per claim, "
                        f"{receipt_note}, duplicate window {p.get('duplicate_window_days', 30)} days"
                    )
                lines += [
                    "  • Alcohol is non-reimbursable under all categories (Food Policy §2.3)",
                    "  • First-class / business-class flights require VP pre-approval (Travel Policy §4.1)",
                    "  • Submissions older than 90 days are rejected automatically",
                ]
                policy_text = "\n".join(lines)
        except Exception:
            pass  # fall back to the default string in _build_prompt

        return await self.analyze_expense(
            expense_data,
            ocr_result=ocr_result,
            rule_result=rule_res,
            duplicate_result=dup_res,
            employee_history=history,
            policy_text=policy_text,
        )

    # ── In-memory config (kept for backward compat with server.py alias) ──────
    _config: Dict[str, Any] = {
        "llm_provider": "gemini",
        "ocr_provider": "tesseract",
        "temperature":  0.2,
        "max_tokens":   1024,
        "risk_threshold_auto_approve": 0.95,
        "risk_threshold_review":       0.80,
    }

    def get_config(self) -> Dict[str, Any]:
        return self._config

    def update_config(self, updates: Dict[str, Any]) -> Dict[str, Any]:
        for k, v in updates.items():
            if v is not None:
                self._config[k] = v
        return self._config


ai_service = AIService()
