from typing import Optional, Dict, Any
from fastapi import APIRouter, Depends, File, UploadFile, Query

from dependencies.auth import get_current_user
from schemas.expense import ExpenseSubmitRequest, ExpenseUpdateRequest
from services.expense_service import expense_service
from services.ocr_service import ocr_service

router = APIRouter(tags=["Expenses"])

@router.post("/api/expenses/upload")
async def upload_receipt(file: UploadFile = File(...),
                         user: Dict[str, Any] = Depends(get_current_user)):
    contents = await file.read()
    return await ocr_service.upload_and_parse(user["id"], file.filename, contents)

@router.post("/api/expenses")
async def create_expense(req: ExpenseSubmitRequest,
                         user: Dict[str, Any] = Depends(get_current_user)):
    return await expense_service.create_expense(user, req)

@router.get("/api/expenses")
async def get_expenses(page: Optional[int] = Query(None, ge=1),
                       limit: Optional[int] = Query(None, ge=1, le=100),
                       user: Dict[str, Any] = Depends(get_current_user)):
    return await expense_service.get_expenses(user, page=page, limit=limit)

@router.get("/api/expenses/{id}")
async def get_expense_details(id: str,
                               user: Dict[str, Any] = Depends(get_current_user)):
    return await expense_service.get_expense_details(user, id)

@router.put("/api/expenses/{id}")
async def update_expense(id: str, req: ExpenseUpdateRequest,
                         user: Dict[str, Any] = Depends(get_current_user)):
    return await expense_service.update_expense(user, id, req)

@router.delete("/api/expenses/{id}")
async def delete_expense(id: str,
                         user: Dict[str, Any] = Depends(get_current_user)):
    return await expense_service.delete_expense(user, id)

@router.get("/api/expenses/{id}/timeline")
async def get_expense_timeline(id: str,
                                user: Dict[str, Any] = Depends(get_current_user)):
    return await expense_service.get_expense_timeline(user, id)
