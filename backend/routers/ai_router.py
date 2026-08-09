from typing import Dict, Any
from fastapi import APIRouter, Depends, File, UploadFile

from dependencies.auth import get_current_user
from schemas.ai import RuleValidateRequest, AIAnalyzeRequest, ChatMessageRequest
from services.ocr_service import ocr_service
from services.rule_engine import rule_engine
from services.ai_service import ai_service
from services.chat_service import chat_service

router = APIRouter(tags=["AI"])

@router.post("/api/ocr/upload")
async def process_ocr_upload(file: UploadFile = File(...),
                              user: Dict[str, Any] = Depends(get_current_user)):
    contents = await file.read()
    return await ocr_service.process_receipt(contents, file.filename)

@router.post("/api/rules/validate")
async def validate_rules(req: RuleValidateRequest,
                         user: Dict[str, Any] = Depends(get_current_user)):
    return await rule_engine.validate_expense_and_log(user["id"], req.model_dump())

@router.post("/api/ai/analyze")
async def analyze_expense_ai(req: AIAnalyzeRequest,
                              user: Dict[str, Any] = Depends(get_current_user)):
    return await ai_service.analyze_expense_with_context(user["id"], req.expense_data, req.ocr_result)

@router.post("/api/chat")
async def chat_with_ai(req: ChatMessageRequest,
                       user: Dict[str, Any] = Depends(get_current_user)):
    return await chat_service.process_chat_message(user["id"], user["role"], req.message)
