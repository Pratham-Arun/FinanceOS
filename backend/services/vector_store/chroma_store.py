from typing import Dict, Any, List
from repositories.knowledge_repository import knowledge_repository
from services.vector_store.base_vector_store import BaseVectorStore

class ChromaVectorStore(BaseVectorStore):
    async def add_documents(self, docs: List[Dict[str, Any]]) -> None:
        for d in docs:
            await knowledge_repository.insert_doc(d)

    async def similarity_search(self, query: str, top_k: int = 3) -> List[Dict[str, Any]]:
        results = await knowledge_repository.search_by_text(query, limit=top_k)
        if not results:
            results = await knowledge_repository.find_all()
        return results[:top_k]
