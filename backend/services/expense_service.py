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
from repositories.ai_logs_repository import ai_logs_repository
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

    async def _run_ai_pipeline(
        self,
        user: Dict[str, Any],
        expense_data: Dict[str, Any],
        expense_id: str
    ) -> Dict[str, Any]:
        """
        Runs the full AI intelligence pipeline on an expense:
        Rule Engine → Duplicate Detection → AI Analysis
        Returns an ai_bundle dict to embed on the expense document.
        """
        from services.rule_engine import rule_engine
        from services.duplicate_service import duplicate_service
        from services.ai_service import ai_service

        # 1. Rule Engine
        rule_result = await rule_engine.validate_expense(expense_data)

        # 2. Duplicate Detection
        dup_result = await duplicate_service.check_duplicate(
            employee_id=user["id"],
            vendor=expense_data.get("title"),
            invoice_number=None,
            amount=float(expense_data.get("amount", 0.0)),
            expense_date=expense_data.get("expense_date", ""),
        )

        # 3. Employee history for anomaly detection
        history = await expense_repository.find_all_by_employee(user["id"])

        # 4. AI Analysis
        ai_result = await ai_service.analyze_expense(
            expense_data,
            ocr_result=expense_data.get("ocr_result"),
            rule_result=rule_result,
            duplicate_result=dup_result,
            employee_history=history,
        )

        # 5. Log the AI event
        await ai_logs_repository.log_event(
            expense_id=expense_id,
            user_id=user["id"],
            event_type="AI_ANALYSIS",
            rule_output=rule_result,
            ai_recommendation=ai_result,
        )

        # Map numeric fraud_score to semantic risk_score for legacy display
        fraud_score = ai_result.get("fraud_score", 0)
        if fraud_score <= 20:
            risk_score = "Low"
        elif fraud_score <= 60:
            risk_score = "Medium"
        else:
            risk_score = "High"

        return {
            "rule_engine": rule_result,
            "duplicate_check": dup_result,
            "ai_analysis": ai_result,
            "risk_score": risk_score,
        }

    async def create_expense(self, user: Dict[str, Any], req: Any) -> Dict[str, Any]:
        target_status = req.status if req.status in ["Draft", "Submitted"] else "Submitted"
        expense_id = f"exp_{time.time_ns()}"
        req_dict = req.model_dump()

        # Build base expense first so AI pipeline can reference it
        new_expense: Dict[str, Any] = {
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
            "risk_score": "Low",
            "risk_flags": [],
            "rule_engine": {},
            "duplicate_check": {},
            "ai_analysis": {},
            "timeline": [
                {
                    "step": "Submitted",
                    "actor": user["name"],
                    "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
                    "details": f"Expense submitted by {user['name']}"
                }
            ],
            "created_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
            "payment_reference": None,
        }

        if target_status == "Submitted":
            # Run full AI pipeline and store results on the document
            try:
                ai_bundle = await self._run_ai_pipeline(user, {**req_dict, "id": expense_id}, expense_id)
                new_expense["rule_engine"] = ai_bundle["rule_engine"]
                new_expense["duplicate_check"] = ai_bundle["duplicate_check"]
                new_expense["ai_analysis"] = ai_bundle["ai_analysis"]
                new_expense["risk_score"] = ai_bundle["risk_score"]

                # Build risk_flags from rule engine violations for backward compat
                violations = ai_bundle["rule_engine"].get("violations", [])
                dup = ai_bundle["duplicate_check"]
                if dup.get("duplicate"):
                    violations = violations + [f"Duplicate match: {dup.get('similar_expense')} ({dup.get('reason','')})"]
                new_expense["risk_flags"] = violations

                # Append AI analysis timeline step
                new_expense["timeline"].append({
                    "step": "AI Analysis",
                    "actor": "FinanceOS AI",
                    "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
                    "details": f"Risk: {new_expense['risk_score']} · {ai_bundle['ai_analysis'].get('recommendation','')}"
                })
            except Exception as ai_err:
                logger.warning("AI Pipeline Failed", expense_id=expense_id, error=str(ai_err))
                fallback = await self.validate_policy_rules(user["id"], req_dict)
                new_expense["risk_score"] = fallback["risk_score"]
                new_expense["risk_flags"] = fallback["risk_flags"]

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

        logger.info("Expense Created", expense_id=expense_id, user_id=user['id'], status=target_status)
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
            logger.warning("Expense Access Denied", expense_id=id, user_id=user['id'])
            raise HTTPException(status_code=403, detail="Not authorized to view this expense")

        if user["role"] == "Manager" and expense["status"] == "Submitted":
            expense["status"] = "Under Review"
            await expense_repository.update_expense(id, {"status": "Under Review"})
            await audit_repository.create(user["id"], "EXPENSE_UNDER_REVIEW", f"Manager {user['name']} opened expense {id} for review")

        history = await approval_repository.find_by_expense_id(id)
        ai_logs = await ai_logs_repository.get_logs_by_expense(id)

        # Fetch OCR result for this expense (Phase 2)
        ocr_result = None
        try:
            from repositories.ocr_results_repository import ocr_results_repository
            ocr_result = await ocr_results_repository.find_by_expense_id(id)
        except Exception:
            pass

        # If expense lacks AI data (seeded/legacy), run pipeline on-demand
        if expense.get("status") not in ["Draft"] and not expense.get("ai_analysis"):
            try:
                ai_bundle = await self._run_ai_pipeline(user, expense, id)
                expense["rule_engine"] = ai_bundle["rule_engine"]
                expense["duplicate_check"] = ai_bundle["duplicate_check"]
                expense["ai_analysis"] = ai_bundle["ai_analysis"]
                if not expense.get("risk_score") or expense.get("risk_score") == "Low":
                    expense["risk_score"] = ai_bundle["risk_score"]
                await expense_repository.update_expense(id, {
                    "rule_engine": expense["rule_engine"],
                    "duplicate_check": expense["duplicate_check"],
                    "ai_analysis": expense["ai_analysis"],
                })
            except Exception as e:
                logger.warning("On-Demand AI Pipeline Failed", expense_id=id, error=str(e))

        # Build unified timeline from stored timeline + approvals
        timeline = list(expense.get("timeline") or [])
        for appr in history:
            timeline.append({
                "step": f"{appr.get('action')} by {appr.get('approver_name')}",
                "actor": appr.get("approver_name"),
                "timestamp": appr.get("actioned_at"),
                "details": appr.get("comments") or "",
                "role": "approval",
            })
        if expense.get("status") == "Paid" and expense.get("payment_reference"):
            timeline.append({
                "step": "Payment Processed",
                "actor": "Finance",
                "timestamp": expense.get("updated_at") or expense.get("created_at"),
                "details": f"Reference: {expense['payment_reference']}",
                "role": "payment",
            })
        # Sort by timestamp
        def _ts(x):
            return x.get("timestamp") or ""
        timeline.sort(key=_ts)

        return {
            "expense": expense,
            "history": history,
            "ai_logs": ai_logs,
            "timeline": timeline,
            "ocr_result": ocr_result,   # Phase 2: OCR structured fields
        }

    async def update_expense(self, user: Dict[str, Any], id: str, req: Any) -> Dict[str, Any]:
        expense = await expense_repository.find_by_id(id)
        if not expense:
            raise HTTPException(status_code=404, detail="Expense not found")
        if expense["employee_id"] != user["id"]:
            raise HTTPException(status_code=403, detail="Not authorized to edit this expense")
        if expense["status"] not in ["Draft"]:
            raise HTTPException(status_code=400, detail="Only Draft expenses can be edited")

        update_fields = req.model_dump(exclude_none=True)
        target_status = update_fields.pop("status", None)

        for field, value in update_fields.items():
            expense[field] = value

        if target_status == "Submitted":
                validations = await self.validate_policy_rules(user["id"], expense)
                expense["risk_score"] = validations["risk_score"]
                expense["risk_flags"] = validations["risk_flags"]
                expense["status"] = "Submitted"
                # Re-run AI pipeline on re-submit
                try:
                    ai_bundle = await self._run_ai_pipeline(user, expense, id)
                    expense["rule_engine"] = ai_bundle["rule_engine"]
                    expense["duplicate_check"] = ai_bundle["duplicate_check"]
                    expense["ai_analysis"] = ai_bundle["ai_analysis"]
                    expense["risk_score"] = ai_bundle["risk_score"]
                    violations = ai_bundle["rule_engine"].get("violations", [])
                    dup = ai_bundle["duplicate_check"]
                    if dup.get("duplicate"):
                        violations = violations + [f"Duplicate match: {dup.get('similar_expense')}"]
                    expense["risk_flags"] = violations
                except Exception as e:
                    logger.warning("Re-submit AI Pipeline Failed", expense_id=id, error=str(e))
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
        logger.info("Expense Updated", expense_id=id, user_id=user['id'])
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
        logger.info("Expense Deleted", expense_id=id, user_id=user['id'])
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
                        logger.warning("Transaction Fallback", expense_id=id, error=str(tx_exc))
                        return await _execute_approval_flow(session=None)
            else:
                return await _execute_approval_flow(session=None)
        except Exception as e:
            logger.error("Approval Processing Failed", expense_id=id, error=str(e))
            raise HTTPException(status_code=500, detail=f"Failed to process approval: {str(e)}")

    async def get_expense_timeline(self, user: Dict[str, Any], id: str) -> Dict[str, Any]:
        result = await self.get_expense_details(user, id)
        expense = result.get("expense", result)
        approvals = await approval_repository.find_by_expense_id(id)
        ai_logs = await ai_logs_repository.get_logs_by_expense(id)

        steps = [
            {"step": "Submitted", "status": "completed",
             "timestamp": expense.get("created_at"),
             "details": f"Submitted by {expense.get('employee_name')}"},
            {"step": "OCR Processing",
             "status": "completed" if expense.get("receipt_url") else "pending",
             "timestamp": expense.get("created_at"),
             "details": "Receipt scanned via OCR" if expense.get("receipt_url") else "No receipt attached"},
            {"step": "Rule Engine",
             "status": "completed" if any(l.get("event_type") == "RULE_VALIDATION" for l in ai_logs) else "pending",
             "timestamp": next((l.get("timestamp") for l in ai_logs if l.get("event_type") == "RULE_VALIDATION"), None),
             "details": "Policy compliance validated"},
            {"step": "AI Analysis",
             "status": "completed" if any(l.get("event_type") == "AI_ANALYSIS" for l in ai_logs) else "pending",
             "timestamp": next((l.get("timestamp") for l in ai_logs if l.get("event_type") == "AI_ANALYSIS"), None),
             "details": "Risk score and recommendation generated"},
            {"step": "Manager Approval",
             "status": "completed" if expense.get("status") in ["Approved", "Paid"] else
                       "rejected" if expense.get("status") == "Rejected" else "pending",
             "timestamp": next((a.get("actioned_at") for a in approvals), None),
             "details": next((a.get("comments") for a in approvals), "Awaiting manager review")},
            {"step": "Payment Processed",
             "status": "completed" if expense.get("status") == "Paid" else "pending",
             "timestamp": None,
             "details": f"Ref: {expense.get('payment_reference')}" if expense.get("payment_reference") else "Awaiting finance payout"},
        ]
        return {"expense_id": id, "timeline": steps}


expense_service = ExpenseService()

