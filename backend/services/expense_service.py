import datetime
import time
from typing import Dict, Any, List, Optional
from fastapi import HTTPException
from database import mongo
from repositories.user_repository import user_repository
from repositories.policy_repository import policy_repository
from repositories.expense_repository import expense_repository
from repositories.approval_repository import approval_repository
from repositories.notification_repository import notification_repository
from repositories.audit_repository import audit_repository
from utils.logger import logger


class ExpenseService:
    async def validate_policy_rules(self, employee_id: str, expense_req: dict) -> Dict[str, Any]:
        risk_flags = []
        category = expense_req.get("category")
        amount = float(expense_req.get("amount", 0.0))
        
        # 1. Check policy limits
        policy = await policy_repository.find_by_category(category)
        if policy:
            if amount > policy["max_limit"]:
                risk_flags.append(f"Exceeds category maximum limit of ${policy['max_limit']} for {category}")
            if policy["receipt_required"] and not expense_req.get("receipt_url"):
                risk_flags.append("Missing required receipt document")

        # 2. Duplicate detection
        date_val = expense_req.get("expense_date")
        duplicate = await expense_repository.find_duplicate(employee_id, amount, date_val)
        if duplicate:
            risk_flags.append(f"Potential duplicate of expense ID: {duplicate['id']}")

        risk_score = "Low"
        if len(risk_flags) == 1:
            risk_score = "Medium"
        elif len(risk_flags) >= 2:
            risk_score = "High"

        return {
            "risk_score": risk_score,
            "risk_flags": risk_flags
        }

    async def create_expense(self, user: Dict[str, Any], req: Any) -> Dict[str, Any]:
        target_status = req.status if req.status in ["Draft", "Submitted"] else "Submitted"
        
        if target_status == "Submitted":
            validations = await self.validate_policy_rules(user["id"], req.dict())
        else:
            validations = {"risk_score": "Low", "risk_flags": []}

        expense_id = f"exp_{time.time_ns()}"
        new_expense = {
            "id": expense_id,
            "employee_id": user["id"],
            "employee_name": user["name"],
            "title": req.title,
            "category": req.category,
            "amount": req.amount,
            "expense_date": req.expense_date,
            "description": req.description,
            "receipt_url": req.receipt_url,
            "status": target_status,
            "risk_score": validations["risk_score"],
            "risk_flags": validations["risk_flags"],
            "created_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
            "payment_reference": None
        }

        created = await expense_repository.create(new_expense)
        await audit_repository.create(
            user["id"],
            "EXPENSE_CREATED",
            f"{'Saved draft' if target_status == 'Draft' else 'Submitted expense'} {expense_id} for ${req.amount}"
        )

        if target_status == "Submitted" and user.get("manager_id"):
            await notification_repository.create(
                user["manager_id"],
                "New Approval Request",
                f"{user['name']} has submitted an expense of ${req.amount} under {req.category}."
            )

        logger.info(f"User {user['id']} created expense {expense_id} with status {target_status}")
        return created

    async def get_expenses(self, user: Dict[str, Any], page: Optional[int] = None, limit: Optional[int] = None) -> List[Dict[str, Any]]:
        role = user["role"]
        if role in ["Admin", "Finance"]:
            query = {}
        elif role == "Manager":
            direct_reports = await user_repository.find_direct_reports(user["id"])
            dr_ids = [u["id"] for u in direct_reports]
            query = {
                "$or": [
                    {"employee_id": user["id"]},
                    {"employee_id": {"$in": dr_ids}}
                ]
            }
        else:
            query = {"employee_id": user["id"]}

        return await expense_repository.find_expenses(query, page=page, limit=limit)

    async def get_expense_details(self, user: Dict[str, Any], id: str) -> Dict[str, Any]:
        expense = await expense_repository.find_by_id(id)
        if not expense:
            raise HTTPException(status_code=404, detail="Expense not found")

        is_authorized = False
        if user["role"] in ["Admin", "Finance"] or expense["employee_id"] == user["id"]:
            is_authorized = True
        elif user["role"] == "Manager":
            emp = await user_repository.find_by_id(expense["employee_id"])
            if emp and emp.get("manager_id") == user["id"]:
                is_authorized = True

        if not is_authorized:
            logger.warning(f"User {user['id']} denied access to expense {id}")
            raise HTTPException(status_code=403, detail="Not authorized to view this expense")

        if user["role"] == "Manager" and expense["status"] == "Submitted":
            expense["status"] = "Under Review"
            await expense_repository.update_expense(id, {"status": "Under Review"})
            await audit_repository.create(user["id"], "EXPENSE_UNDER_REVIEW", f"Manager {user['name']} opened expense {id} for review")

        history = await approval_repository.find_by_expense_id(id)
        return {
            "expense": expense,
            "history": history
        }

    async def update_expense(self, user: Dict[str, Any], id: str, req: Any) -> Dict[str, Any]:
        expense = await expense_repository.find_by_id(id)
        if not expense:
            raise HTTPException(status_code=404, detail="Expense not found")
        if expense["employee_id"] != user["id"]:
            raise HTTPException(status_code=403, detail="Not authorized to edit this expense")
        if expense["status"] not in ["Draft"]:
            raise HTTPException(status_code=400, detail="Only Draft expenses can be edited")

        update_fields = req.dict(exclude_none=True)
        target_status = update_fields.pop("status", None)

        for field, value in update_fields.items():
            expense[field] = value

        if target_status == "Submitted":
            validations = await self.validate_policy_rules(user["id"], expense)
            expense["risk_score"] = validations["risk_score"]
            expense["risk_flags"] = validations["risk_flags"]
            expense["status"] = "Submitted"
            await audit_repository.create(user["id"], "EXPENSE_SUBMITTED", f"Submitted draft expense {id} for ${expense['amount']}")
            if user.get("manager_id"):
                await notification_repository.create(
                    user["manager_id"],
                    "New Approval Request",
                    f"{user['name']} has submitted an expense of ${expense['amount']} under {expense['category']}."
                )
        elif target_status in ["Draft", None]:
            expense["status"] = "Draft"

        expense["updated_at"] = datetime.datetime.now(datetime.timezone.utc).isoformat()
        await expense_repository.update_expense(id, expense)
        logger.info(f"User {user['id']} updated expense {id}")
        return expense

    async def delete_expense(self, user: Dict[str, Any], id: str) -> Dict[str, Any]:
        expense = await expense_repository.find_by_id(id)
        if not expense:
            raise HTTPException(status_code=404, detail="Expense not found")
        if expense["employee_id"] != user["id"] and user["role"] != "Admin":
            raise HTTPException(status_code=403, detail="Not authorized to delete this expense")
        if expense["status"] not in ["Draft", "Rejected"] and user["role"] != "Admin":
            raise HTTPException(status_code=400, detail="Only Draft or Rejected expenses can be deleted")

        await expense_repository.delete_expense(id)
        await audit_repository.create(user["id"], "EXPENSE_DELETED", f"Deleted expense {id}")
        logger.info(f"User {user['id']} deleted expense {id}")
        return {"status": "success", "message": f"Expense {id} deleted"}

    async def process_approval(self, user: Dict[str, Any], id: str, req: Any) -> Dict[str, Any]:
        expense = await expense_repository.find_by_id(id)
        if not expense:
            raise HTTPException(status_code=404, detail="Expense not found")

        approval_id = f"app_{time.time_ns()}"
        new_approval = {
            "id": approval_id,
            "expense_id": id,
            "approver_id": user["id"],
            "approver_name": user["name"],
            "action": req.action,
            "comments": req.comments,
            "actioned_at": datetime.datetime.now(datetime.timezone.utc).isoformat()
        }

        # Attempt transactional multi-document write with Motor session where available
        async def _execute_approval_flow(session=None):
            await approval_repository.create(new_approval, session=session)
            old_status = expense["status"]

            if user["role"] == "Manager":
                if req.action == "Approved":
                    expense["status"] = "Approved"
                    await notification_repository.create(
                        expense["employee_id"],
                        "Expense Approved by Manager",
                        f"Your claim for ${expense['amount']} was approved by your manager {user['name']}.",
                        session=session
                    )
                    finance_users = await user_repository.find_managers_and_finance()
                    for f_user in finance_users:
                        if f_user["role"] == "Finance":
                            await notification_repository.create(
                                f_user["id"],
                                "Approved Claim Ready for Payment",
                                f"{expense['employee_name']}'s expense of ${expense['amount']} needs payment confirmation.",
                                session=session
                            )
                elif req.action == "Rejected":
                    expense["status"] = "Rejected"
                    await notification_repository.create(
                        expense["employee_id"],
                        "Expense Rejected by Manager",
                        f"Your claim for ${expense['amount']} was rejected by your manager: {req.comments}.",
                        session=session
                    )
                elif req.action == "Clarification":
                    expense["status"] = "Draft"
                    await notification_repository.create(
                        expense["employee_id"],
                        "Clarification Requested",
                        f"Manager {user['name']} requested updates on claim ${expense['amount']}: {req.comments}.",
                        session=session
                    )

            elif user["role"] == "Finance":
                if req.action == "Approved":
                    expense["status"] = "Paid"
                    expense["payment_reference"] = f"TXN-{int(time.time())}"
                    await notification_repository.create(
                        expense["employee_id"],
                        "Reimbursement Payment Completed",
                        f"Payment reference {expense['payment_reference']} has been issued for your claim of ${expense['amount']}.",
                        session=session
                    )
                elif req.action == "Rejected":
                    expense["status"] = "Rejected"
                    await notification_repository.create(
                        expense["employee_id"],
                        "Expense Rejected by Finance",
                        f"Finance officer rejected claim for ${expense['amount']}: {req.comments}.",
                        session=session
                    )

            update_data = {"status": expense["status"]}
            if "payment_reference" in expense:
                update_data["payment_reference"] = expense["payment_reference"]

            await expense_repository.update_expense(id, update_data, session=session)
            await audit_repository.create(user["id"], "EXPENSE_ACTIONED", f"Actioned {id} from {old_status} to {expense['status']}", session=session)
            return expense

        try:
            if mongo.client:
                async with await mongo.client.start_session() as session:
                    try:
                        async with session.start_transaction():
                            return await _execute_approval_flow(session=session)
                    except Exception as tx_exc:
                        logger.warning(f"Transaction unsupported or failed, falling back to direct operations: {tx_exc}")
                        return await _execute_approval_flow(session=None)
            else:
                return await _execute_approval_flow(session=None)
        except Exception as e:
            logger.error(f"Failed to process approval for expense {id}: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to process approval: {str(e)}")


expense_service = ExpenseService()
