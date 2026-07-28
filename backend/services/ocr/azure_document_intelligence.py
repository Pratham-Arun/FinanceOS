import datetime
from typing import Dict, Any
from services.ocr.base import BaseOCRProvider

class AzureDocumentIntelligenceProvider(BaseOCRProvider):
    async def extract_receipt_data(self, file_bytes: bytes, filename: str) -> Dict[str, Any]:
        return {
            "provider": "Azure Document Intelligence",
            "ocr_data": {
                "vendor": {"value": "Delta Air Lines", "confidence": 0.98},
                "invoice_number": {"value": "AZ-DL-9921", "confidence": 0.97},
                "transaction_date": {"value": datetime.date.today().isoformat(), "confidence": 0.98},
                "currency": {"value": "USD", "confidence": 0.99},
                "subtotal": {"value": 410.00, "confidence": 0.96},
                "tax_amount": {"value": 40.00, "confidence": 0.95},
                "total_amount": {"value": 450.00, "confidence": 0.98},
                "category": {"value": "Travel", "confidence": 0.97}
            },
            "overall_confidence": 0.97
        }
