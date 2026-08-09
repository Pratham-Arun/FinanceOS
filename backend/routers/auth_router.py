from typing import Dict, Any
from fastapi import APIRouter, Depends

from dependencies.auth import get_current_user
from schemas.auth import LoginRequest, RegisterRequest, TokenResponse
from services.auth_service import auth_service

router = APIRouter(tags=["Auth"])

@router.post("/api/auth/register", response_model=TokenResponse)
async def register(req: RegisterRequest):
    return await auth_service.register(req)

@router.post("/api/auth/login", response_model=TokenResponse)
async def login(req: LoginRequest):
    return await auth_service.login(req)

@router.get("/api/auth/me")
async def get_me(user: Dict[str, Any] = Depends(get_current_user)):
    return auth_service.get_me(user)

@router.post("/api/auth/logout")
def logout():
    return {"status": "success", "message": "Logged out"}

@router.get("/api/users")
async def get_users(user: Dict[str, Any] = Depends(get_current_user)):
    return await auth_service.get_users()
