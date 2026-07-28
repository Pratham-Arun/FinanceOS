import datetime
from typing import Dict, Any, List
from repositories.policy_repository import policy_repository

class RuleEngine:
    """
    Automated company policy compliance engine.
    Validates limits, category restrictions, item rules (e.g. alcohol), and receipt requirements.
    """
    DEFAULT_POLICY_LIMITS = {
        "Meals": {"max": 50.0, "receipt_required": True, "alcohol_allowed": False},
        "Travel": {"max_hotel": 250.0, "max_flight": 1000.0, "taxi_receipt_required": True},
        "Accommodation": {"max": 250.0, "receipt_required": True},
        "Supplies": {"max": 200.0, "receipt_required": False},
        "Office": {"max": 500.0, "receipt_required": True},
        "Other": {"max": 150.0, "receipt_required": False}
    }

    async def validate_expense(self, expense_data: Dict[str, Any]) -> Dict[str, Any]:
        violations: List[str] = []
        risk_score = 0

        category = expense_data.get("category", "Other")
        amount = float(expense_data.get("amount", 0.0))
        description = (expense_data.get("description") or "").lower()
        title = (expense_data.get("title") or "").lower()
        has_receipt = bool(expense_data.get("receipt_url"))
        expense_date_str = expense_data.get("expense_date")

        # 1. Category-specific Policy Rules
        if category in ["Meals", "Food"]:
            limit = self.DEFAULT_POLICY_LIMITS["Meals"]["max"]
            if amount > limit:
                violations.append(f"Meal expense (${amount:.2f}) exceeds policy maximum limit of ${limit:.2f}.")
                risk_score += 35
            
            if "beer" in description or "wine" in description or "cocktail" in description or "alcohol" in description or "liquor" in description:
                violations.append("Alcohol items are strictly non-reimbursable under Section 2.3 of Food Policy.")
                risk_score += 45

        elif category in ["Accommodation", "Hotel"]:
            limit = self.DEFAULT_POLICY_LIMITS["Travel"]["max_hotel"]
            if amount > limit:
                violations.append(f"Hotel expense (${amount:.2f}) exceeds maximum allowance of ${limit:.2f}/night.")
                risk_score += 35

        elif category in ["Travel", "Taxi", "Flight"]:
            if "taxi" in title or "taxi" in description or "uber" in title or "lyft" in title:
                if not has_receipt:
                    violations.append("Taxi/Rideshare reimbursement requires a valid receipt.")
                    risk_score += 30
            elif "first class" in description or "business class" in description:
                violations.append("Flights must be booked in Economy Class as per Travel Policy Section 4.1.")
                risk_score += 40

        # Dynamic check against database policy repository
        db_policy = await policy_repository.find_by_category(category)
        if db_policy:
            max_limit = db_policy.get("max_limit", 1000.0)
            if amount > max_limit and f"exceeds policy maximum" not in "".join(violations):
                violations.append(f"Amount (${amount:.2f}) exceeds configured category maximum limit of ${max_limit:.2f}.")
                risk_score += 30
            if db_policy.get("receipt_required") and not has_receipt:
                if "requires a valid receipt" not in "".join(violations):
                    violations.append("A valid receipt is required for this expense category.")
                    risk_score += 25

        # 2. Date Validation
        if expense_date_str:
            try:
                exp_date = datetime.datetime.fromisoformat(expense_date_str.replace("Z", "+00:00")).date()
                today = datetime.date.today()
                if exp_date > today:
                    violations.append("Expense transaction date cannot be in the future.")
                    risk_score += 50
                elif (today - exp_date).days > 90:
                    violations.append("Expense transaction is older than the allowed 90-day submission window.")
                    risk_score += 20
            except ValueError:
                pass

        # 3. Final Policy Status Determination
        policy_status = "PASS" if len(violations) == 0 else "VIOLATION"
        risk_score = min(risk_score, 100)

        return {
            "policy_status": policy_status,
            "violations": violations,
            "risk_score": risk_score
        }

rule_engine = RuleEngine()
