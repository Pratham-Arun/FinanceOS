import hashlib
from typing import Dict, Any, Optional
from repositories.expense_repository import expense_repository

class DuplicateService:
    def compute_image_hash(self, file_bytes: bytes) -> str:
        """Computes SHA-256 hash for image/file content deduplication."""
        return hashlib.sha256(file_bytes).hexdigest()

    async def check_duplicate(
        self,
        employee_id: str,
        vendor: Optional[str],
        invoice_number: Optional[str],
        amount: float,
        expense_date: str,
        image_hash: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Scans existing records for exact/fuzzy duplicate matches across:
        Invoice Number, Merchant, Amount, Date, and Image Hash.
        """
        # Query existing user expenses
        existing_expenses = await expense_repository.find_all_by_employee(employee_id)
        
        for exp in existing_expenses:
            exp_id = exp.get("id", "EXP-000")
            exp_amount = float(exp.get("amount", 0.0))
            exp_date = exp.get("expense_date", "")
            exp_vendor = (exp.get("vendor") or exp.get("title") or "").lower()
            exp_inv = exp.get("invoice_number")
            exp_hash = exp.get("image_hash")

            # 1. Exact Invoice Number match
            if invoice_number and exp_inv and invoice_number.strip().lower() == exp_inv.strip().lower():
                return {
                    "duplicate": True,
                    "similar_expense": exp_id,
                    "confidence": 0.98,
                    "reason": f"Exact match on Invoice Number '{invoice_number}'."
                }

            # 2. Image Hash match
            if image_hash and exp_hash and image_hash == exp_hash:
                return {
                    "duplicate": True,
                    "similar_expense": exp_id,
                    "confidence": 0.99,
                    "reason": "Receipt image content hash is identical to a prior submission."
                }

            # 3. Composite Fuzzy Match: Same Amount + Same Date + Similar Vendor
            if abs(exp_amount - amount) < 0.01 and exp_date == expense_date:
                curr_v = (vendor or "").lower()
                if curr_v and curr_v in exp_vendor or exp_vendor in curr_v or curr_v == exp_vendor:
                    return {
                        "duplicate": True,
                        "similar_expense": exp_id,
                        "confidence": 0.91,
                        "reason": f"Matching transaction of ${amount:.2f} at {vendor} on {expense_date}."
                    }

        return {
            "duplicate": False,
            "similar_expense": None,
            "confidence": 0.0,
            "reason": "No duplicate claims detected."
        }

duplicate_service = DuplicateService()
