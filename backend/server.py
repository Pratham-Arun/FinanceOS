import os
import jwt
import datetime
import time
import bcrypt
from typing import List, Optional, Dict, Any
from fastapi import FastAPI, HTTPException, Depends, status, File, UploadFile, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

from database import mongo
from utils.logger import logger
from repositories.user_repository import user_repository
from repositories.policy_repository import policy_repository
from repositories.notification_repository import notification_repository
from repositories.audit_repository import audit_repository
from services.expense_service import expense_service
from services.analytics_service import analytics_service

load_dotenv()

app = FastAPI(title="Expense Reimbursement Automation API", version="1.0")


SEED_USERS = [
    {
        "id": "60d5ec49f1b29c2d18c1d501",
        "name": "System Administrator",
        "email": "admin@demo.com",
        "password_hash": bcrypt.hashpw(b"admin123", bcrypt.gensalt(10)).decode('utf-8'),
        "role": "Admin",
        "manager_id": None
    },
    {
        "id": "60d5ec49f1b29c2d18c1d502",
        "name": "Jane Employee",
        "email": "employee@demo.com",
        "password_hash": bcrypt.hashpw(b"demo1234", bcrypt.gensalt(10)).decode('utf-8'),
        "role": "Employee",
        "manager_id": "60d5ec49f1b29c2d18c1d503"
    },
    {
        "id": "60d5ec49f1b29c2d18c1d503",
        "name": "John Manager",
        "email": "manager@demo.com",
        "password_hash": bcrypt.hashpw(b"demo1234", bcrypt.gensalt(10)).decode('utf-8'),
        "role": "Manager",
        "manager_id": "60d5ec49f1b29c2d18c1d504"
    },
    {
        "id": "60d5ec49f1b29c2d18c1d504",
        "name": "Frank Finance",
        "email": "finance@demo.com",
        "password_hash": bcrypt.hashpw(b"demo1234", bcrypt.gensalt(10)).decode('utf-8'),
        "role": "Finance",
        "manager_id": None
    }
]

SEED_POLICIES = [
    {"category": "Meals", "max_limit": 75.0, "receipt_required": True, "duplicate_window_days": 30},
    {"category": "Travel", "max_limit": 500.0, "receipt_required": True, "duplicate_window_days": 30},
    {"category": "Accommodation", "max_limit": 1000.0, "receipt_required": True, "duplicate_window_days": 30},
    {"category": "Supplies", "max_limit": 200.0, "receipt_required": False, "duplicate_window_days": 30},
    {"category": "Other", "max_limit": 150.0, "receipt_required": False, "duplicate_window_days": 30}
]


@app.on_event("startup")
async def connect_mongodb():
    await mongo.connect()
    # Seed default users if empty
    if await user_repository.count() == 0:
        await user_repository.insert_many(SEED_USERS)
        logger.info("Seeded default demo users.")
    # Seed default policies if empty
    if await policy_repository.count() == 0:
        await policy_repository.insert_many(SEED_POLICIES)
        logger.info("Seeded default policy configurations.")


@app.on_event("shutdown")
async def disconnect_mongodb():
    await mongo.disconnect()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

JWT_SECRET = os.getenv("JWT_SECRET", "demo_jwt_secret_key_12345")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))


# --- Pydantic Schemas ---
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

class ExpenseSubmitRequest(BaseModel):
    title: str
    category: str
    amount: float
    expense_date: str
    description: str
    receipt_url: Optional[str] = None
    status: Optional[str] = "Submitted"

class ExpenseUpdateRequest(BaseModel):
    title: Optional[str] = None
    category: Optional[str] = None
    amount: Optional[float] = None
    expense_date: Optional[str] = None
    description: Optional[str] = None
    receipt_url: Optional[str] = None
    status: Optional[str] = None

class ApprovalActionRequest(BaseModel):
    action: str
    comments: str

class PolicyUpdateRequest(BaseModel):
    category: str
    max_limit: float
    receipt_required: bool
    duplicate_window_days: int = 30


# --- Security Helpers ---
def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET, algorithm="HS256")
    return encoded_jwt

async def get_current_user_from_token(token: str) -> Dict[str, Any]:
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        user_email = payload.get("email")
        if user_email is None:
            raise HTTPException(status_code=401, detail="Invalid token details")
        user = await user_repository.find_by_email(user_email)
        if user is None:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid token signature")

from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
security = HTTPBearer()

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> Dict[str, Any]:
    return await get_current_user_from_token(credentials.credentials)


# --- Mock AI OCR parsing logic ---
def mock_ocr_parsing(filename: str) -> Dict[str, Any]:
    fn = filename.lower()
    today_str = datetime.date.today().isoformat()
    if "uber" in fn or "taxi" in fn or "cab" in fn or "travel" in fn:
        return {
            "vendor": "Uber Inc.",
            "invoice_number": "UB-88127",
            "amount": 24.50,
            "expense_date": today_str,
            "category": "Travel",
            "gst_details": "GST-123456",
            "confidence_scores": {"vendor": 0.98, "amount": 0.99, "date": 0.95}
        }
    elif "starbucks" in fn or "meal" in fn or "food" in fn or "lunch" in fn or "dinner" in fn:
        return {
            "vendor": "Starbucks Cafe",
            "invoice_number": "STB-99128",
            "amount": 12.80,
            "expense_date": today_str,
            "category": "Meals",
            "gst_details": None,
            "confidence_scores": {"vendor": 0.95, "amount": 0.97, "date": 0.92}
        }
    elif "hotel" in fn or "stay" in fn or "accommodation" in fn or "hilton" in fn:
        return {
            "vendor": "Hilton Hotels",
            "invoice_number": "HLT-77291",
            "amount": 320.00,
            "expense_date": today_str,
            "category": "Accommodation",
            "gst_details": "VAT-992128",
            "confidence_scores": {"vendor": 0.97, "amount": 0.98, "date": 0.94}
        }
    elif "supplies" in fn or "office" in fn or "paper" in fn:
        return {
            "vendor": "Office Depot",
            "invoice_number": "OD-4421",
            "amount": 85.00,
            "expense_date": today_str,
            "category": "Supplies",
            "gst_details": "GST-8812",
            "confidence_scores": {"vendor": 0.92, "amount": 0.96, "date": 0.89}
        }
    else:
        return {
            "vendor": "General Merchant Inc.",
            "invoice_number": "TX-1002",
            "amount": 45.00,
            "expense_date": today_str,
            "category": "Other",
            "gst_details": None,
            "confidence_scores": {"vendor": 0.85, "amount": 0.90, "date": 0.80}
        }


# --- Authentication Endpoints ---

@app.post("/api/auth/register", response_model=TokenResponse)
async def register(req: RegisterRequest):
    if await user_repository.find_by_email(req.email):
        raise HTTPException(status_code=400, detail="Email already registered")
        
    user_id = f"user_{time.time_ns()}"
    hashed_pwd = bcrypt.hashpw(req.password.encode('utf-8'), bcrypt.gensalt(10)).decode('utf-8')
    
    new_user = {
        "id": user_id,
        "name": req.name,
        "email": req.email,
        "password_hash": hashed_pwd,
        "role": req.role,
        "manager_id": req.manager_id or "60d5ec49f1b29c2d18c1d503"
    }
    await user_repository.create_user(new_user)
    await audit_repository.create(user_id, "USER_REGISTER", f"Registered as {req.role}")
    logger.info(f"User registered successfully: {req.email} ({user_id})")

    token = create_access_token({"email": req.email})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user_id,
            "name": req.name,
            "email": req.email,
            "role": req.role
        }
    }

@app.post("/api/auth/login", response_model=TokenResponse)
async def login(req: LoginRequest):
    user = await user_repository.find_by_email(req.email)
    if not user:
        logger.warning(f"Failed login attempt for unknown email: {req.email}")
        raise HTTPException(status_code=401, detail="Invalid email or password")
        
    if not bcrypt.checkpw(req.password.encode('utf-8'), user["password_hash"].encode('utf-8')):
        logger.warning(f"Failed login attempt (invalid password) for email: {req.email}")
        raise HTTPException(status_code=401, detail="Invalid email or password")
        
    await audit_repository.create(user["id"], "USER_LOGIN", "Logged into system")
    logger.info(f"User logged in successfully: {req.email} ({user['id']})")
    
    token = create_access_token({"email": req.email})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user["id"],
            "name": user["name"],
            "email": user["email"],
            "role": user["role"]
        }
    }

@app.get("/api/auth/me")
def get_me(user: Dict[str, Any] = Depends(get_current_user)):
    return {
        "id": user["id"],
        "name": user["name"],
        "email": user["email"],
        "role": user["role"]
    }

@app.post("/api/auth/logout")
def logout():
    return {"status": "success", "message": "Logged out successfully"}

@app.get("/api/users")
async def get_users(user: Dict[str, Any] = Depends(get_current_user)):
    return await user_repository.find_managers_and_finance()


# --- Expense Endpoints ---

@app.post("/api/expenses/upload")
def upload_receipt(
    file: UploadFile = File(...),
    user: Dict[str, Any] = Depends(get_current_user)
):
    receipt_url = f"/uploads/{file.filename}"
    ocr_results = mock_ocr_parsing(file.filename)
    return {
        "receipt_url": receipt_url,
        "ai_extraction": ocr_results
    }

@app.post("/api/expenses")
async def create_expense(
    req: ExpenseSubmitRequest,
    user: Dict[str, Any] = Depends(get_current_user)
):
    return await expense_service.create_expense(user, req)

@app.get("/api/expenses")
async def get_expenses(
    page: Optional[int] = Query(None, ge=1),
    limit: Optional[int] = Query(None, ge=1, le=100),
    user: Dict[str, Any] = Depends(get_current_user)
):
    return await expense_service.get_expenses(user, page=page, limit=limit)

@app.get("/api/expenses/{id}")
async def get_expense_details(
    id: str,
    user: Dict[str, Any] = Depends(get_current_user)
):
    return await expense_service.get_expense_details(user, id)

@app.put("/api/expenses/{id}")
async def update_expense(
    id: str,
    req: ExpenseUpdateRequest,
    user: Dict[str, Any] = Depends(get_current_user)
):
    return await expense_service.update_expense(user, id, req)

@app.delete("/api/expenses/{id}")
async def delete_expense(
    id: str,
    user: Dict[str, Any] = Depends(get_current_user)
):
    return await expense_service.delete_expense(user, id)


# --- Approvals Endpoints ---

@app.post("/api/approvals/{id}/action")
async def action_approval(
    id: str,
    req: ApprovalActionRequest,
    user: Dict[str, Any] = Depends(get_current_user)
):
    return await expense_service.process_approval(user, id, req)


# --- System Policies Config (Admin) ---

@app.get("/api/admin/policies")
async def get_policies(user: Dict[str, Any] = Depends(get_current_user)):
    return await policy_repository.find_all()

@app.put("/api/admin/policies")
async def update_policy(
    req: PolicyUpdateRequest,
    user: Dict[str, Any] = Depends(get_current_user)
):
    if user["role"] != "Admin":
        raise HTTPException(status_code=403, detail="Admin role required")
        
    updated = await policy_repository.upsert_policy(
        req.category,
        req.max_limit,
        req.receipt_required,
        req.duplicate_window_days
    )
    await audit_repository.create(user["id"], "POLICY_UPDATED", f"Updated policy limit for {req.category} to ${req.max_limit}")
    logger.info(f"Admin {user['id']} updated policy limit for category {req.category}")
    return updated


# --- Notifications API ---

@app.get("/api/notifications")
async def get_notifications(user: Dict[str, Any] = Depends(get_current_user)):
    return await notification_repository.find_by_user_id(user["id"])

@app.post("/api/notifications/read")
async def mark_read(user: Dict[str, Any] = Depends(get_current_user)):
    await notification_repository.mark_read_by_user_id(user["id"])
    return {"status": "success"}


# --- Analytics API ---

@app.get("/api/analytics/summary")
async def get_analytics_summary(user: Dict[str, Any] = Depends(get_current_user)):
    return await analytics_service.get_summary(user)
