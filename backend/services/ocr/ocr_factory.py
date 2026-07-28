import os
from typing import Optional
from services.ocr.base import BaseOCRProvider
from services.ocr.tesseract import TesseractOCRProvider
from services.ocr.google_document_ai import GoogleDocumentAIProvider
from services.ocr.azure_document_intelligence import AzureDocumentIntelligenceProvider

_active_ocr_provider = os.getenv("OCR_PROVIDER", "tesseract").lower()

def get_ocr_provider(provider_name: Optional[str] = None) -> BaseOCRProvider:
    name = (provider_name or _active_ocr_provider).lower()
    if "google" in name or "docai" in name:
        return GoogleDocumentAIProvider()
    elif "azure" in name:
        return AzureDocumentIntelligenceProvider()
    else:
        return TesseractOCRProvider()

def set_active_ocr_provider(provider_name: str) -> str:
    global _active_ocr_provider
    _active_ocr_provider = provider_name.lower()
    return _active_ocr_provider
