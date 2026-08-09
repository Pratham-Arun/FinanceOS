from typing import Dict, Any
from fastapi import APIRouter, Depends

from dependencies.auth import get_current_user
from services.notification_service import notification_service

router = APIRouter(tags=["Notifications"])

@router.get("/api/notifications")
async def get_notifications(user: Dict[str, Any] = Depends(get_current_user)):
    return await notification_service.get_user_notifications(user["id"])

@router.post("/api/notifications/read")
async def mark_read(user: Dict[str, Any] = Depends(get_current_user)):
    return await notification_service.mark_notifications_read(user["id"])
