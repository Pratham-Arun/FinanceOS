import time
import bcrypt
from typing import Dict, Any
from fastapi import HTTPException

from core.security import create_access_token
from repositories.user_repository import user_repository
from repositories.audit_repository import audit_repository
from schemas.auth import LoginRequest, RegisterRequest, TokenResponse
from utils.logger import logger

class AuthService:
    async def register(self, req: RegisterRequest) -> Dict[str, Any]:
        if await user_repository.find_by_email(req.email):
            raise HTTPException(status_code=400, detail="Email already registered")
        user_id = f"user_{time.time_ns()}"
        pwd_hash = bcrypt.hashpw(req.password.encode(), bcrypt.gensalt(10)).decode()
        new_user = {
            "id": user_id,
            "name": req.name,
            "email": req.email,
            "password_hash": pwd_hash,
            "role": req.role,
            "manager_id": req.manager_id or "60d5ec49f1b29c2d18c1d503"
        }
        await user_repository.create_user(new_user)
        await audit_repository.create(user_id, "USER_REGISTER", f"Registered as {req.role}")
        logger.info("User Registered", email=req.email, role=req.role, user_id=user_id)
        token = create_access_token({"email": req.email})
        return {
            "access_token": token,
            "token_type": "bearer",
            "user": {"id": user_id, "name": req.name, "email": req.email, "role": req.role}
        }

    async def login(self, req: LoginRequest) -> Dict[str, Any]:
        user = await user_repository.find_by_email(req.email)
        if not user or not bcrypt.checkpw(req.password.encode(), user["password_hash"].encode()):
            logger.warning("Login Failed", email=req.email, reason="Invalid credentials")
            raise HTTPException(status_code=401, detail="Invalid email or password")
        await audit_repository.create(user["id"], "USER_LOGIN", "Logged into system")
        logger.info("User Logged In", email=req.email, user_id=user["id"], role=user["role"])
        token = create_access_token({"email": req.email})
        return {
            "access_token": token,
            "token_type": "bearer",
            "user": {"id": user["id"], "name": user["name"], "email": user["email"], "role": user["role"]}
        }

    def get_me(self, user: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "id": user["id"],
            "name": user["name"],
            "email": user["email"],
            "role": user["role"]
        }

    async def get_users(self) -> Any:
        return await user_repository.find_managers_and_finance()

auth_service = AuthService()
