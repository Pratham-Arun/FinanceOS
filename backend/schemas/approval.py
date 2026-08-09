from pydantic import BaseModel

class ApprovalActionRequest(BaseModel):
    action: str
    comments: str
