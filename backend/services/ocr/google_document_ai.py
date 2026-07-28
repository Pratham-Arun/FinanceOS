import datetime
from typing import Dict, Any
from services.ocr.base import BaseOCRProvider

class GoogleDocumentAIProvider(BaseOCRProvider):
    async def extract_receipt_data(self, file_bytes: bytes, filename: str) -> Dict[str, Any]:
        return {
            "provider": "Google Document AI",
            "ocr_data": {
                "vendor": {"value": "Marriott International", "confidence": 0.99},
                "invoice_number": {"value": "G-DOC-88192", "confidence": 0.98},
                "transaction_date": {"value": datetime.date.today().isoformat(), "confidence": 0.99},
                "currency": {"value": "USD", "confidence": 0.99},
                "subtotal": {"value": 200.00, "confidence": 0.98},
                "tax_amount": {"value": 30.00, "confidence": 0.97},
                "total_amount": {"value": 230.00, "confidence": 0.99},
                "category": {"value": "Accommodation", "confidence": 0.98}
            },
            "overall_confidence": 0.98
        }
