from typing import Optional
from pydantic import BaseModel

class ExpenseSubmitRequest(BaseModel):
    title: str
    category: str
    amount: float
    expense_date: str
    description: str
    receipt_url: Optional[str] = None
    status: Optional[str] = "Submitted"

class ExpenseUpdateRequest(BaseModel):
    title: Optional[str] = None
    category: Optional[str] = None
    amount: Optional[float] = None
    expense_date: Optional[str] = None
    description: Optional[str] = None
    receipt_url: Optional[str] = None
    status: Optional[str] = None
