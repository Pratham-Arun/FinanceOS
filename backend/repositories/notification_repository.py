import datetime
import time
from typing import List, Dict, Any
from database import mongo, format_doc, format_docs

class NotificationRepository:
    @property
    def col(self):
        return mongo.collection("notifications")

    async def create(self, user_id: str, title: str, message: str, session=None) -> Dict[str, Any]:
        notif = {
            "id": f"notif_{time.time_ns()}",
            "user_id": user_id,
            "title": title,
            "message": message,
            "read": False,
            "created_at": datetime.datetime.now(datetime.timezone.utc).isoformat()
        }
        await self.col.insert_one(notif, session=session)
        return format_doc(notif)

    async def find_by_user_id(self, user_id: str) -> List[Dict[str, Any]]:
        docs = await self.col.find({"user_id": user_id}).sort("created_at", -1).to_list(None)
        return format_docs(docs)

    async def mark_read_by_user_id(self, user_id: str, session=None) -> None:
        await self.col.update_many({"user_id": user_id}, {"$set": {"read": True}}, session=session)

notification_repository = NotificationRepository()
