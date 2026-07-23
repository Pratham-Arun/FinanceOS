from typing import Dict, Any
from repositories.user_repository import user_repository
from repositories.expense_repository import expense_repository
from repositories.audit_repository import audit_repository
from utils.logger import logger

class AnalyticsService:
    async def get_summary(self, user: Dict[str, Any]) -> Dict[str, Any]:
        if user["role"] == "Employee":
            match_stage = {"employee_id": user["id"]}
        elif user["role"] == "Manager":
            direct_reports = await user_repository.find_direct_reports(user["id"])
            dr_ids = [u["id"] for u in direct_reports]
            match_stage = {"employee_id": {"$in": dr_ids}}
        else:
            match_stage = {}

        summary_pipeline = [
            {"$match": match_stage},
            {
                "$group": {
                    "_id": None,
                    "total_submitted": {"$sum": "$amount"},
                    "total_paid": {
                        "$sum": {
                            "$cond": [{"$eq": ["$status", "Paid"]}, "$amount", 0.0]
                        }
                    },
                    "total_pending": {
                        "$sum": {
                            "$cond": [{"$in": ["$status", ["Submitted", "Approved"]]}, "$amount", 0.0]
                        }
                    },
                    "count": {"$sum": 1}
                }
            }
        ]
        summary_docs = await expense_repository.aggregate(summary_pipeline)
        if summary_docs:
            summary_res = summary_docs[0]
            total_submitted = float(summary_res.get("total_submitted", 0.0))
            total_paid = float(summary_res.get("total_paid", 0.0))
            total_pending = float(summary_res.get("total_pending", 0.0))
            count = int(summary_res.get("count", 0))
        else:
            total_submitted = 0.0
            total_paid = 0.0
            total_pending = 0.0
            count = 0

        category_pipeline = [
            {"$match": match_stage},
            {
                "$group": {
                    "_id": "$category",
                    "value": {"$sum": "$amount"}
                }
            },
            {
                "$project": {
                    "_id": 0,
                    "name": "$_id",
                    "value": 1
                }
            }
        ]
        categories_data = await expense_repository.aggregate(category_pipeline)

        months = ["Feb", "Mar", "Apr", "May", "Jun", "Jul"]
        monthly_data = [{"month": m, "amount": 0.0} for m in months]
        expenses = await expense_repository.find_expenses(match_stage)
        for e in expenses:
            exp_id = e.get("id", "")
            parts = exp_id.split("_")
            month_index = int(parts[-1]) % 6 if len(parts) > 1 and parts[-1].isdigit() else 5
            monthly_data[month_index]["amount"] += float(e.get("amount", 0.0))

        if user["role"] == "Admin":
            logs = await audit_repository.get_recent_logs(20)
        else:
            logs = []

        logger.info(f"Generated analytics summary for user {user['id']} with role {user['role']}")
        return {
            "summary": {
                "total_submitted": total_submitted,
                "total_paid": total_paid,
                "total_pending": total_pending,
                "count": count
            },
            "categories": categories_data,
            "monthly": monthly_data,
            "logs": logs
        }

analytics_service = AnalyticsService()
