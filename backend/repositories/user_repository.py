from typing import Optional, List, Dict, Any
from database import mongo, format_doc, format_docs
from repositories.interfaces.base import IUserRepository

class UserRepository(IUserRepository):
    @property
    def col(self):
        return mongo.collection("users")

    async def count(self) -> int:
        return await self.col.count_documents({})

    async def insert_many(self, users: List[Dict[str, Any]]) -> None:
        await self.col.insert_many([dict(u) for u in users])

    async def find_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        doc = await self.col.find_one({"email": email})
        return format_doc(doc)

    async def find_by_id(self, user_id: str) -> Optional[Dict[str, Any]]:
        doc = await self.col.find_one({"id": user_id})
        return format_doc(doc)

    async def find_managers_and_finance(self) -> List[Dict[str, Any]]:
        cursor = self.col.find({"role": {"$in": ["Manager", "Finance", "Admin"]}}, {"_id": 0, "id": 1, "name": 1, "role": 1})
        docs = await cursor.to_list(None)
        return format_docs(docs)

    async def find_direct_reports(self, manager_id: str) -> List[Dict[str, Any]]:
        cursor = self.col.find({"manager_id": manager_id}, {"_id": 0, "id": 1})
        docs = await cursor.to_list(None)
        return format_docs(docs)

    async def create_user(self, user_data: Dict[str, Any]) -> Dict[str, Any]:
        data = dict(user_data)
        await self.col.insert_one(data)
        return format_doc(data)

user_repository: IUserRepository = UserRepository()
