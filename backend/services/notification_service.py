from typing import Dict, Any, List
from repositories.notification_repository import notification_repository

class SmartNotificationService:
    async def trigger_smart_notification(
        self,
        user_id: str,
        role: str,
        event_type: str,
        context: Dict[str, Any]
    ) -> Dict[str, Any]:
        title = "Notification"
        message = "System Update"

        if role == "Manager" and event_type == "PENDING_QUEUE":
            count = context.get("count", 1)
            title = "Action Required: Approvals Pending"
            message = f"You have {count} pending expense approval(s) in your review queue."
        elif role == "Finance" and event_type == "HIGH_RISK_SUBMITTED":
            exp_id = context.get("expense_id", "")
            amt = context.get("amount", 0.0)
            title = "High Risk Expense Flagged"
            message = f"High-risk expense {exp_id} (${amt}) requires Finance review prior to payout."
        elif role == "Employee" and event_type == "POLICY_VIOLATION":
            reason = context.get("reason", "Policy limit exceeded")
            title = "Policy Violation Detected"
            message = f"Your claim notice: {reason}. Click to correct before submission."
        elif role == "Admin" and event_type == "POLICY_UPDATED":
            cat = context.get("category", "General")
            title = "Policy Configuration Updated"
            message = f"Reimbursement rules for category '{cat}' were successfully updated."
        else:
            title = context.get("title", title)
            message = context.get("message", message)

        notif = await notification_repository.create(user_id, title, message)
        return notif

notification_service = SmartNotificationService()
