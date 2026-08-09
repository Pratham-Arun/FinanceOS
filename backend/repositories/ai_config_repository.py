"""
AI Configuration Repository — singleton document storing tunable AI settings.
Collection: ai_configuration

Fixed stack: Gemini 2.5 Flash (LLM) + Tesseract OCR.
Only temperature, max_tokens, and risk thresholds are configurable.
"""
import datetime
from typing import Dict, Any
from database import mongo, format_doc
from repositories.interfaces.base import IAIConfigRepository

_DEFAULT_CONFIG = {
    "id":                     "ai_config_singleton",
    "temperature":            0.2,
    "max_tokens":             1024,
    "risk_threshold":         0.80,
    "auto_approve_threshold": 0.95,
    "updated_by":             "system",
    "updated_at":             datetime.datetime.now(datetime.timezone.utc).isoformat(),
}


class AIConfigRepository(IAIConfigRepository):
    @property
    def col(self):
        return mongo.collection("ai_configuration")

    async def get_config(self) -> Dict[str, Any]:
        """Returns active config doc, seeding defaults if collection is empty."""
        doc = await self.col.find_one({"id": "ai_config_singleton"})
        if doc:
            return format_doc(doc)
        # Seed defaults on first call
        await self.col.insert_one(dict(_DEFAULT_CONFIG))
        return dict(_DEFAULT_CONFIG)

    async def upsert(self, updates: Dict[str, Any], updated_by: str) -> Dict[str, Any]:
        """
        Upserts the singleton config document.
        Only the fields present in `updates` are changed.
        """
        updates["updated_by"] = updated_by
        updates["updated_at"] = datetime.datetime.now(datetime.timezone.utc).isoformat()
        await self.col.update_one(
            {"id": "ai_config_singleton"},
            {"$set": updates},
            upsert=True
        )
        return await self.get_config()


ai_config_repository = AIConfigRepository()
