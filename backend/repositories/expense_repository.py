from typing import Optional, List, Dict, Any
from database import mongo, format_doc, format_docs

class ExpenseRepository:
    @property
    def col(self):
        return mongo.collection("expenses")

    async def create(self, expense_data: Dict[str, Any], session=None) -> Dict[str, Any]:
        data = dict(expense_data)
        await self.col.insert_one(data, session=session)
        return format_doc(data)

    async def find_by_id(self, expense_id: str) -> Optional[Dict[str, Any]]:
        doc = await self.col.find_one({"id": expense_id})
        return format_doc(doc)

    async def find_expenses(
        self,
        query: Dict[str, Any],
        page: Optional[int] = None,
        limit: Optional[int] = None
    ) -> List[Dict[str, Any]]:
        cursor = self.col.find(query).sort("created_at", -1)
        if page and limit and page > 0 and limit > 0:
            skip = (page - 1) * limit
            cursor = cursor.skip(skip).limit(limit)
        docs = await cursor.to_list(None)
        return format_docs(docs)

    async def update_expense(self, expense_id: str, update_fields: Dict[str, Any], session=None) -> None:
        await self.col.update_one({"id": expense_id}, {"$set": update_fields}, session=session)

    async def delete_expense(self, expense_id: str, session=None) -> None:
        await self.col.delete_one({"id": expense_id}, session=session)

    async def find_duplicate(self, employee_id: str, amount: float, expense_date: str) -> Optional[Dict[str, Any]]:
        doc = await self.col.find_one({
            "employee_id": employee_id,
            "status": {"$ne": "Rejected"},
            "amount": amount,
            "expense_date": expense_date
        })
        return format_doc(doc)

    async def find_all_by_employee(self, employee_id: str) -> List[Dict[str, Any]]:
        return await self.find_expenses({"employee_id": employee_id})

    async def find_all(self) -> List[Dict[str, Any]]:
        return await self.find_expenses({})

    async def aggregate(self, pipeline: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        cursor = self.col.aggregate(pipeline)
        docs = await cursor.to_list(None)
        return format_docs(docs)

expense_repository = ExpenseRepository()
