from pydantic import BaseModel

class PolicyUpdateRequest(BaseModel):
    category: str
    max_limit: float
    receipt_required: bool
    duplicate_window_days: int = 30
