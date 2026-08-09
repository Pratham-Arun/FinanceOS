from typing import Dict, Any
from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials
from core.security import security, get_current_user_from_token

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> Dict[str, Any]:
    return await get_current_user_from_token(credentials.credentials)
