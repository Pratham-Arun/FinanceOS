from typing import Optional, Dict, Any
from pydantic import BaseModel

class LoginRequest(BaseModel):
    email: str
    password: str

class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str
    role: str = "Employee"
    manager_id: Optional[str] = None

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    user: Dict[str, Any]
