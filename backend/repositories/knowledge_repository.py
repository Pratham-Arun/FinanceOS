from typing import Optional, List, Dict, Any
from database import mongo, format_doc, format_docs

class KnowledgeRepository:
    @property
    def col(self):
        return mongo.collection("knowledge_base")

    async def count(self) -> int:
        return await self.col.count_documents({})

    async def insert_doc(self, doc_data: Dict[str, Any]) -> Dict[str, Any]:
        result = await self.col.insert_one(doc_data)
        doc_data["_id"] = str(result.inserted_id)
        return doc_data

    async def find_all(self) -> List[Dict[str, Any]]:
        docs = await self.col.find({}).to_list(None)
        return format_docs(docs)

    async def search_by_text(self, query: str, limit: int = 5) -> List[Dict[str, Any]]:
        docs = await self.col.find({
            "$or": [
                {"title": {"$regex": query, "$options": "i"}},
                {"content": {"$regex": query, "$options": "i"}},
                {"category": {"$regex": query, "$options": "i"}}
            ]
        }).to_list(limit)
        return format_docs(docs)

    async def delete_by_id(self, doc_id: str) -> bool:
        res = await self.col.delete_one({"_id": doc_id})
        if res.deleted_count == 0:
            res = await self.col.delete_one({"id": doc_id})
        return res.deleted_count > 0

knowledge_repository = KnowledgeRepository()
