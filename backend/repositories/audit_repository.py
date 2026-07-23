import datetime
import time
from typing import List, Dict, Any
from database import mongo, format_doc, format_docs

class AuditRepository:
    @property
    def col(self):
        return mongo.collection("audit_logs")

    async def create(self, user_id: str, action: str, details: str, session=None) -> Dict[str, Any]:
        log = {
            "id": f"log_{time.time_ns()}",
            "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
            "user_id": user_id,
            "action": action,
            "details": details
        }
        await self.col.insert_one(log, session=session)
        return format_doc(log)

    async def get_recent_logs(self, limit: int = 20) -> List[Dict[str, Any]]:
        docs = await self.col.find({}).sort("timestamp", -1).limit(limit).to_list(None)
        return format_docs(docs)

audit_repository = AuditRepository()
