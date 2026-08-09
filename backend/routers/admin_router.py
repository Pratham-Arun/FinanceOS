from typing import Dict, Any, Optional
from fastapi import APIRouter, Depends, Query

from dependencies.auth import get_current_user
from schemas.policy import PolicyUpdateRequest
from schemas.ai import AIConfigRequest
from services.admin_service import admin_service

router = APIRouter(tags=["Admin"])

@router.get("/api/admin/policies")
async def get_policies(user: Dict[str, Any] = Depends(get_current_user)):
    return await admin_service.get_policies(user)

@router.put("/api/admin/policies")
async def update_policy(req: PolicyUpdateRequest,
                        user: Dict[str, Any] = Depends(get_current_user)):
    return await admin_service.update_policy(user, req)

@router.get("/api/admin/policies/history")
async def get_policy_history(user: Dict[str, Any] = Depends(get_current_user)):
    return await admin_service.get_policy_history(user)

@router.get("/api/admin/ai-config")
async def get_ai_config(user: Dict[str, Any] = Depends(get_current_user)):
    return await admin_service.get_ai_config(user)

@router.put("/api/admin/ai-config")
async def update_ai_config(req: AIConfigRequest,
                            user: Dict[str, Any] = Depends(get_current_user)):
    return await admin_service.update_ai_config(user, req)

@router.get("/api/admin/ai-config/metrics")
async def get_ai_config_metrics(user: Dict[str, Any] = Depends(get_current_user)):
    """Live provider health and usage metrics derived from ai_logs."""
    return await admin_service.get_ai_metrics(user)

@router.get("/api/audit/ai-logs")
async def get_ai_audit_logs(
    limit: int = Query(50, ge=1, le=200),
    expense_id: Optional[str] = Query(None),
    request_id: Optional[str] = Query(None),
    event_type: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    user: Dict[str, Any] = Depends(get_current_user)
):
    return await admin_service.get_ai_audit_logs(
        user, limit=limit, expense_id=expense_id, request_id=request_id,
        event_type=event_type, status=status
    )
