from typing import Optional, Dict, Any
from pydantic import BaseModel

class RuleValidateRequest(BaseModel):
    category: str
    amount: float
    title: Optional[str] = ""
    description: Optional[str] = ""
    receipt_url: Optional[str] = None
    expense_date: Optional[str] = None

class AIAnalyzeRequest(BaseModel):
    expense_data: Dict[str, Any]
    ocr_result: Optional[Dict[str, Any]] = None

class ChatMessageRequest(BaseModel):
    message: str

class KnowledgeUploadRequest(BaseModel):
    title: str
    category: str
    content: str

class AIConfigRequest(BaseModel):
    temperature: Optional[float] = None
    max_tokens: Optional[int] = None
    risk_threshold_auto_approve: Optional[float] = None
    risk_threshold_review: Optional[float] = None
