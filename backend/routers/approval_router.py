from typing import Dict, Any
from fastapi import APIRouter, Depends

from dependencies.auth import get_current_user
from schemas.approval import ApprovalActionRequest
from services.expense_service import expense_service

router = APIRouter(tags=["Approvals"])

@router.post("/api/approvals/{id}/action")
async def action_approval(id: str, req: ApprovalActionRequest,
                          user: Dict[str, Any] = Depends(get_current_user)):
    return await expense_service.process_approval(user, id, req)
