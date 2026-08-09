from typing import Dict, Any
from fastapi import APIRouter, Depends

from dependencies.auth import get_current_user
from services.analytics_service import analytics_service
from services.analytics_ai import analytics_ai_service

router = APIRouter(tags=["Analytics"])

@router.get("/api/analytics/summary")
async def get_analytics_summary(user: Dict[str, Any] = Depends(get_current_user)):
    return await analytics_service.get_summary(user)

@router.get("/api/analytics/ai")
async def get_ai_analytics(user: Dict[str, Any] = Depends(get_current_user)):
    return await analytics_ai_service.get_dashboard_intelligence()
