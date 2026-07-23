from typing import Optional, List, Dict, Any
from database import mongo, format_doc, format_docs

class PolicyRepository:
    @property
    def col(self):
        return mongo.collection("policies")

    async def count(self) -> int:
        return await self.col.count_documents({})

    async def insert_many(self, policies: List[Dict[str, Any]]) -> None:
        await self.col.insert_many([dict(p) for p in policies])

    async def find_by_category(self, category: str) -> Optional[Dict[str, Any]]:
        doc = await self.col.find_one({"category": category})
        return format_doc(doc)

    async def find_all(self) -> List[Dict[str, Any]]:
        docs = await self.col.find({}).to_list(None)
        return format_docs(docs)

    async def upsert_policy(self, category: str, max_limit: float, receipt_required: bool, duplicate_window_days: int) -> Dict[str, Any]:
        policy_data = {
            "category": category,
            "max_limit": max_limit,
            "receipt_required": receipt_required,
            "duplicate_window_days": duplicate_window_days
        }
        await self.col.update_one({"category": category}, {"$set": policy_data}, upsert=True)
        return policy_data

policy_repository = PolicyRepository()
