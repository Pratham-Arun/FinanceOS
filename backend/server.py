"""
FinanceOS Backend Entrypoint
Bootstrap file delegating application configuration to modular app package.
"""

from app import app
from core.config import settings
from core.security import (
    create_access_token,
    get_current_user_from_token,
    security,
)
from dependencies.auth import get_current_user
from services.ocr_service import ocr_service
from services.ai_service import ai_service

JWT_SECRET = settings.JWT_SECRET
ACCESS_TOKEN_EXPIRE_MINUTES = settings.ACCESS_TOKEN_EXPIRE_MINUTES
mock_ocr_parsing = ocr_service.mock_ocr_parsing

__all__ = [
    "app",
    "settings",
    "JWT_SECRET",
    "ACCESS_TOKEN_EXPIRE_MINUTES",
    "create_access_token",
    "get_current_user_from_token",
    "get_current_user",
    "security",
    "mock_ocr_parsing",
]
