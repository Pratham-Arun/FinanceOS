import datetime
from typing import Dict, Any
import jwt
from fastapi import HTTPException
from fastapi.security import HTTPBearer
from core.config import settings
from repositories.user_repository import user_repository

def create_access_token(data: dict) -> str:
    payload = data.copy()
    expire = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    payload.update({"exp": expire})
    return jwt.encode(payload, settings.JWT_SECRET, algorithm="HS256")

async def get_current_user_from_token(token: str) -> Dict[str, Any]:
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=["HS256"])
        email = payload.get("email")
        if not email:
            raise HTTPException(status_code=401, detail="Invalid token")
        user = await user_repository.find_by_email(email)
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid token signature")

security = HTTPBearer()
