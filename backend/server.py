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
from repositories.knowledge_repository import knowledge_repository
from repositories.ai_logs_repository import ai_logs_repository
from repositories.expense_repository import expense_repository

from services.expense_service import expense_service
from services.analytics_service import analytics_service
from services.ocr_service import ocr_service
from services.rule_engine import rule_engine
from services.duplicate_service import duplicate_service
from services.ai_service import ai_service
from services.rag_service import rag_service
from services.chat_service import chat_service
from services.analytics_ai import analytics_ai_service
from services.notification_service import notification_service
from services.llm.llm_factory import set_active_llm_provider
from services.ocr.ocr_factory import set_active_ocr_provider

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
        "name": "Pratham Employee",
        "email": "employee@demo.com",
        "password_hash": bcrypt.hashpw(b"demo1234", bcrypt.gensalt(10)).decode('utf-8'),
        "role": "Employee",
        "manager_id": "60d5ec49f1b29c2d18c1d503"
    },
    {
        "id": "60d5ec49f1b29c2d18c1d503",
        "name": "Pratham Manager",
        "email": "manager@demo.com",
        "password_hash": bcrypt.hashpw(b"demo1234", bcrypt.gensalt(10)).decode('utf-8'),
        "role": "Manager",
        "manager_id": "60d5ec49f1b29c2d18c1d504"
    },
    {
        "id": "60d5ec49f1b29c2d18c1d504",
        "name": "Pratham Finance",
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

class RuleValidateRequest(BaseModel):
    category: str
    amount: float
    title: Optional[str] = ""
    description: Optional[str] = ""
    receipt_url: Optional[str] = None
    expense_date: Optional[str] = None

class AIAnalyzeRequest(BaseModel):
    expense_data: Dict[str, Any]
    ocr_result: Optional[Dict[str, Any]] = None

class ChatMessageRequest(BaseModel):
    message: str

class KnowledgeUploadRequest(BaseModel):
    title: str
    category: str
    content: str

class AIConfigRequest(BaseModel):
    llm_provider: Optional[str] = None     # openai | gemini | claude
    ocr_provider: Optional[str] = None     # tesseract | google | azure
    temperature: Optional[float] = None
    max_tokens: Optional[int] = None
    risk_threshold_auto_approve: Optional[float] = 0.95
    risk_threshold_review: Optional[float] = 0.80

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


# --- Phase 1: Advanced OCR Endpoints ---
@app.post("/api/ocr/upload")
async def process_ocr_upload(
    file: UploadFile = File(...),
    user: Dict[str, Any] = Depends(get_current_user)
):
    contents = await file.read()
    valid, msg = ocr_service.validate_file(file.filename, len(contents))
    if not valid:
        raise HTTPException(status_code=400, detail=msg)
    
    res = await ocr_service.process_receipt(contents, file.filename)
    await ai_logs_repository.log_event(
        expense_id=None,
        user_id=user["id"],
        event_type="OCR_PROCESSED",
        ocr_data=res
    )
    return res

@app.get("/api/ocr/{expenseId}")
async def get_ocr_by_expense(
    expenseId: str,
    user: Dict[str, Any] = Depends(get_current_user)
):
    expense = await expense_service.get_expense_details(user, expenseId)
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    ocr_results = await ocr_service.process_receipt(b"mock_content", expense.get("receipt_url", "receipt.jpg"))
    return {"expense_id": expenseId, "ocr_data": ocr_results}


# --- Phase 2: Rule Engine Endpoint ---
@app.post("/api/rules/validate")
async def validate_rules(
    req: RuleValidateRequest,
    user: Dict[str, Any] = Depends(get_current_user)
):
    res = await rule_engine.validate_expense(req.dict())
    await ai_logs_repository.log_event(
        expense_id=None,
        user_id=user["id"],
        event_type="RULE_VALIDATION",
        rule_output=res
    )
    return res


# --- Phase 3 & 4 & 8: Finance AI Agent Endpoint ---
@app.post("/api/ai/analyze")
async def analyze_expense_ai(
    req: AIAnalyzeRequest,
    user: Dict[str, Any] = Depends(get_current_user)
):
    exp_data = req.expense_data
    rule_res = await rule_engine.validate_expense(exp_data)
    dup_res = await duplicate_service.check_duplicate(
        user["id"],
        exp_data.get("vendor") or exp_data.get("title"),
        exp_data.get("invoice_number"),
        float(exp_data.get("amount", 0.0)),
        exp_data.get("expense_date", "")
    )
    
    emp_history = await expense_repository.find_all_by_employee(user["id"])
    ai_res = await ai_service.analyze_expense(
        exp_data,
        ocr_result=req.ocr_result,
        rule_result=rule_res,
        duplicate_result=dup_res,
        employee_history=emp_history
    )

    await ai_logs_repository.log_event(
        expense_id=exp_data.get("id"),
        user_id=user["id"],
        event_type="AI_ANALYSIS",
        ocr_data=req.ocr_result,
        rule_output=rule_res,
        ai_recommendation=ai_res
    )
    return ai_res


# --- Phase 5 & 6: AI Chat & RAG Knowledge Endpoints ---
@app.post("/api/chat")
async def chat_with_ai(
    req: ChatMessageRequest,
    user: Dict[str, Any] = Depends(get_current_user)
):
    return await chat_service.process_chat_message(user["id"], user["role"], req.message)

@app.post("/api/knowledge/upload")
async def upload_knowledge_doc(
    req: KnowledgeUploadRequest,
    user: Dict[str, Any] = Depends(get_current_user)
):
    if user["role"] not in ["Admin", "Finance"]:
        raise HTTPException(status_code=403, detail="Admin or Finance role required")
    res = await rag_service.ingest_document(req.title, req.category, req.content)
    await audit_repository.create(user["id"], "KNOWLEDGE_INGESTED", f"Uploaded RAG document: {req.title}")
    return res

@app.get("/api/knowledge/search")
async def search_knowledge_docs(
    q: str = Query(...),
    user: Dict[str, Any] = Depends(get_current_user)
):
    return await rag_service.search_policies(q)


# --- Phase 7: Dashboard Intelligence Endpoint ---
@app.get("/api/analytics/ai")
async def get_ai_analytics(user: Dict[str, Any] = Depends(get_current_user)):
    return await analytics_ai_service.get_dashboard_intelligence()


# --- Phase 10: AI Audit Logs Endpoint ---
@app.get("/api/audit/ai-logs")
async def get_ai_audit_logs(
    limit: int = Query(50, ge=1, le=200),
    user: Dict[str, Any] = Depends(get_current_user)
):
    return await ai_logs_repository.get_logs(limit=limit)


# --- AI Configuration Panel (Improvement #12) ---
_ai_config_state: Dict[str, Any] = {
    "llm_provider": "openai",
    "ocr_provider": "tesseract",
    "temperature": 0.2,
    "max_tokens": 1024,
    "risk_threshold_auto_approve": 0.95,
    "risk_threshold_review": 0.80
}

@app.get("/api/admin/ai-config")
async def get_ai_config(user: Dict[str, Any] = Depends(get_current_user)):
    return _ai_config_state

@app.put("/api/admin/ai-config")
async def update_ai_config(
    req: AIConfigRequest,
    user: Dict[str, Any] = Depends(get_current_user)
):
    if user["role"] != "Admin":
        raise HTTPException(status_code=403, detail="Admin role required")

    if req.llm_provider:
        _ai_config_state["llm_provider"] = set_active_llm_provider(req.llm_provider)
    if req.ocr_provider:
        _ai_config_state["ocr_provider"] = set_active_ocr_provider(req.ocr_provider)
    if req.temperature is not None:
        _ai_config_state["temperature"] = req.temperature
    if req.max_tokens is not None:
        _ai_config_state["max_tokens"] = req.max_tokens
    if req.risk_threshold_auto_approve is not None:
        _ai_config_state["risk_threshold_auto_approve"] = req.risk_threshold_auto_approve
    if req.risk_threshold_review is not None:
        _ai_config_state["risk_threshold_review"] = req.risk_threshold_review

    await audit_repository.create(
        user["id"],
        "AI_CONFIG_UPDATED",
        f"AI Config: LLM={_ai_config_state['llm_provider']}, OCR={_ai_config_state['ocr_provider']}"
    )
    logger.info(f"Admin {user['id']} updated AI config: {_ai_config_state}")
    return _ai_config_state


# --- Policy Version History (Improvement #13) ---
@app.get("/api/admin/policies/history")
async def get_policy_version_history(user: Dict[str, Any] = Depends(get_current_user)):
    if user["role"] not in ["Admin", "Finance"]:
        raise HTTPException(status_code=403, detail="Admin or Finance role required")
    return await policy_repository.get_version_history()


# --- Approval Timeline (Improvement #14) ---
@app.get("/api/expenses/{id}/timeline")
async def get_expense_timeline(
    id: str,
    user: Dict[str, Any] = Depends(get_current_user)
):
    expense = await expense_service.get_expense_details(user, id)
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")

    from repositories.approval_repository import approval_repository
    approvals = await approval_repository.find_by_expense_id(id)
    ai_logs = await ai_logs_repository.get_logs_by_expense(id)

    steps = [
        {
            "step": "Submitted",
            "status": "completed",
            "timestamp": expense.get("created_at"),
            "details": f"Submitted by {expense.get('employee_name')}"
        },
        {
            "step": "OCR Processing",
            "status": "completed" if expense.get("receipt_url") else "pending",
            "timestamp": expense.get("created_at"),
            "details": f"Receipt processed via OCR" if expense.get("receipt_url") else "No receipt attached"
        },
        {
            "step": "Rule Engine",
            "status": "completed" if any(l.get("event_type") == "RULE_VALIDATION" for l in ai_logs) else "pending",
            "timestamp": next((l.get("timestamp") for l in ai_logs if l.get("event_type") == "RULE_VALIDATION"), None),
            "details": "Policy compliance validation completed"
        },
        {
            "step": "AI Analysis",
            "status": "completed" if any(l.get("event_type") == "AI_ANALYSIS" for l in ai_logs) else "pending",
            "timestamp": next((l.get("timestamp") for l in ai_logs if l.get("event_type") == "AI_ANALYSIS"), None),
            "details": "Risk scoring & explainable recommendation generated"
        },
        {
            "step": "Manager Approval",
            "status": "completed" if expense.get("status") in ["Approved", "Paid"] else
                      "rejected" if expense.get("status") == "Rejected" else "pending",
            "timestamp": next((a.get("actioned_at") for a in approvals if a.get("approver_role") == "Manager"), None),
            "details": next((a.get("comments") for a in approvals if a.get("approver_role") == "Manager"), "Awaiting manager review")
        },
        {
            "step": "Payment Processed",
            "status": "completed" if expense.get("status") == "Paid" else "pending",
            "timestamp": next((a.get("actioned_at") for a in approvals if a.get("action") == "Approve & Pay"), None),
            "details": f"Payment Ref: {expense.get('payment_reference')}" if expense.get("payment_reference") else "Awaiting finance payout"
        }
    ]

    return {"expense_id": id, "timeline": steps}
