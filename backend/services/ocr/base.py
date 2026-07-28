from abc import ABC, abstractmethod
from typing import Dict, Any

class BaseOCRProvider(ABC):
    """
    Abstract Base Class for OCR Drivers (Tesseract, Google Document AI, Azure Document Intelligence).
    Decouples document processing from specific cloud vendor APIs.
    """

    @abstractmethod
    async def extract_receipt_data(self, file_bytes: bytes, filename: str) -> Dict[str, Any]:
        """Processes file bytes and extracts structured receipt field values with confidence metrics."""
        pass
