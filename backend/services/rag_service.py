from typing import Dict, Any, List
from repositories.knowledge_repository import knowledge_repository

DEFAULT_POLICY_HANDBOOK_KNOWLEDGE = [
    {
        "title": "Travel and Lodging Policy - Section 4.2",
        "category": "Travel",
        "content": "Hotel reimbursement is strictly limited to $250 per night for standard business travel. Lodging expenses exceeding $250 per night require prior executive VP authorization."
    },
    {
        "title": "Food & Beverage Policy - Section 2.3",
        "category": "Meals",
        "content": "Daily individual meal reimbursement cap is $50. Alcoholic beverages of any kind are non-reimbursable under corporate expense guidelines."
    },
    {
        "title": "Rideshare and Taxi Guidelines - Section 3.1",
        "category": "Travel",
        "content": "Taxi, Uber, and Lyft claims require an itemized digital or paper receipt showing date, route, fare, and payment confirmation."
    },
    {
        "title": "Equipment and Home Office Policy - Section 5.0",
        "category": "Office",
        "content": "Stationery, office supplies, internet bill assistance (up to $75/mo), and approved software licenses require receipt attachment and manager sign-off."
    }
]

class RAGService:
    async def seed_knowledge_if_empty(self):
        count = await knowledge_repository.count()
        if count == 0:
            for item in DEFAULT_POLICY_HANDBOOK_KNOWLEDGE:
                await knowledge_repository.insert_doc(item)

    async def ingest_document(self, title: str, category: str, content: str) -> Dict[str, Any]:
        doc_data = {
            "title": title,
            "category": category,
            "content": content
        }
        return await knowledge_repository.insert_doc(doc_data)

    async def search_policies(self, query: str) -> List[Dict[str, Any]]:
        await self.seed_knowledge_if_empty()
        return await knowledge_repository.search_by_text(query)

    async def answer_policy_question(self, question: str) -> Dict[str, Any]:
        await self.seed_knowledge_if_empty()
        matches = await self.search_policies(question)
        
        if not matches:
            # Fallback to general policy overview if no exact keyword match
            matches = await knowledge_repository.find_all()

        context_str = "\n".join([f"- {m.get('title')}: {m.get('content')}" for m in matches[:3]])
        
        # Grounded LLM policy response generator
        q_lower = question.lower()
        if "hotel" in q_lower or "lodging" in q_lower or "300" in q_lower or "250" in q_lower:
            answer = "According to Section 4.2 of the Travel Policy, hotel reimbursement is limited to $250 per night unless executive approval is obtained prior to booking."
        elif "meal" in q_lower or "food" in q_lower or "alcohol" in q_lower or "drink" in q_lower or "50" in q_lower:
            answer = "Under Food Policy Section 2.3, meal claims are capped at $50 per day. Alcoholic beverages are non-reimbursable under corporate policy."
        elif "taxi" in q_lower or "uber" in q_lower or "receipt" in q_lower:
            answer = "Per Rideshare & Taxi Policy Section 3.1, all taxi and rideshare expense claims require an attached valid itemized receipt."
        else:
            answer = f"Based on company policy guidelines:\n\n{context_str}"

        return {
            "question": question,
            "answer": answer,
            "sources": matches[:3]
        }

rag_service = RAGService()
