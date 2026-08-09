from typing import Dict, Any
from fastapi import APIRouter, Depends, Query

from dependencies.auth import get_current_user
from schemas.ai import KnowledgeUploadRequest
from services.rag_service import rag_service

router = APIRouter(tags=["Knowledge"])

@router.post("/api/knowledge/upload")
async def upload_knowledge_doc(req: KnowledgeUploadRequest,
                                user: Dict[str, Any] = Depends(get_current_user)):
    return await rag_service.ingest_user_document(user, req.title, req.category, req.content)

@router.get("/api/knowledge/search")
async def search_knowledge(q: str = Query(...),
                            user: Dict[str, Any] = Depends(get_current_user)):
    return await rag_service.search_policies(q)
