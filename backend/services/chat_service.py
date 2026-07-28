from typing import Dict, Any, List
from services.rag_service import rag_service
from repositories.expense_repository import expense_repository

class ChatService:
    async def process_chat_message(self, user_id: str, user_role: str, message: str) -> Dict[str, Any]:
        msg_lower = message.lower()

        # 1. Reject / Expense status questions
        if "reject" in msg_lower or "why" in msg_lower and "expense" in msg_lower:
            # Look up recent rejected expenses for user
            user_expenses = await expense_repository.find_all_by_employee(user_id)
            rejected = [e for e in user_expenses if e.get("status") in ["Rejected", "Draft"]]
            if rejected:
                latest = rejected[-1]
                flags = latest.get("risk_flags", [])
                flag_str = "; ".join(flags) if flags else "Amount exceeded category limit or missing required receipt."
                return {
                    "reply": f"Your expense '{latest.get('title')}' (${latest.get('amount')}) was rejected or returned to draft due to policy validation: {flag_str}. Reference: Food Policy Section 2.3 / Travel Policy Section 4.2.",
                    "intent": "EXPENSE_REJECTION_REASON"
                }
            return {
                "reply": "No recently rejected expenses were found for your account. You can check individual claim cards on your Dashboard for full details.",
                "intent": "EXPENSE_STATUS"
            }

        # 2. General status check
        if "status" in msg_lower or "pending" in msg_lower or "my expenses" in msg_lower:
            user_expenses = await expense_repository.find_all_by_employee(user_id)
            pending = [e for e in user_expenses if e.get("status") in ["Submitted", "Under Review"]]
            return {
                "reply": f"You currently have {len(pending)} expense claim(s) pending review. Total submitted expenses: {len(user_expenses)}.",
                "intent": "EXPENSE_STATUS"
            }

        # 3. Policy & Reimbursement Questions (delegated to RAG)
        if any(w in msg_lower for w in ["limit", "hotel", "meal", "food", "taxi", "policy", "handbook", "claim", "receipt", "rule"]):
            rag_res = await rag_service.answer_policy_question(message)
            return {
                "reply": rag_res["answer"],
                "intent": "POLICY_QA",
                "sources": rag_res.get("sources", [])
            }

        # 4. Analytics & General Assistant
        if "analytics" in msg_lower or "spending" in msg_lower or "total" in msg_lower:
            return {
                "reply": "You can view complete spending breakdowns, monthly forecasts, and policy violation charts on the Analytics tab.",
                "intent": "ANALYTICS_GUIDANCE"
            }

        # 5. Default friendly response
        return {
            "reply": "I am your FinanceOS AI Assistant. I can help you with receipt upload guidelines, policy limits, status checks, and rejection reasons. How can I assist you today?",
            "intent": "GENERAL_HELP"
        }

chat_service = ChatService()
