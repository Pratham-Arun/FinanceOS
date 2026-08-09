from typing import List, Dict, Any
from database import mongo, format_doc, format_docs
from repositories.interfaces.base import IApprovalRepository

class ApprovalRepository(IApprovalRepository):
    @property
    def col(self):
        return mongo.collection("approvals")

    async def create(self, approval_data: Dict[str, Any], session=None) -> Dict[str, Any]:
        data = dict(approval_data)
        await self.col.insert_one(data, session=session)
        return format_doc(data)

    async def find_by_expense_id(self, expense_id: str) -> List[Dict[str, Any]]:
        docs = await self.col.find({"expense_id": expense_id}).sort("actioned_at", 1).to_list(None)
        return format_docs(docs)

approval_repository: IApprovalRepository = ApprovalRepository()
