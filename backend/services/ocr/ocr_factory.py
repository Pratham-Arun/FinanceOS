"""
OCR Provider Factory — resolves the active OCR driver at call time.

Runtime switching: set_active_ocr_provider() updates the module-level variable
immediately, affecting all subsequent calls in the same process without a restart.

Startup recovery: reload_from_config() reads the persisted value from MongoDB's
ai_configuration collection and restores the active provider.
"""
import os
from typing import Optional
from utils.logger import logger
from services.ocr.base import BaseOCRProvider
from services.ocr.tesseract import TesseractOCRProvider
from services.ocr.google_document_ai import GoogleDocumentAIProvider
from services.ocr.azure_document_intelligence import AzureDocumentIntelligenceProvider

_active_ocr_provider: str = os.getenv("OCR_PROVIDER", "tesseract").lower()
_last_known_provider: str = _active_ocr_provider   # fallback cache when MongoDB unavailable


def get_ocr_provider(provider_name: Optional[str] = None) -> BaseOCRProvider:
    """Returns a new instance of the currently active OCR provider."""
    name = (provider_name or _active_ocr_provider).lower()
    if "google" in name or "docai" in name:
        return GoogleDocumentAIProvider()
    elif "azure" in name:
        return AzureDocumentIntelligenceProvider()
    else:
        return TesseractOCRProvider()


def set_active_ocr_provider(provider_name: str) -> str:
    """
    Hot-swaps the active OCR provider. Takes effect on the very next call to
    get_ocr_provider() with no server restart required.
    """
    global _active_ocr_provider, _last_known_provider
    _active_ocr_provider = provider_name.lower()
    _last_known_provider = _active_ocr_provider
    logger.info("OCR provider switched", provider=_active_ocr_provider)
    return _active_ocr_provider


def get_active_ocr_provider_name() -> str:
    """Returns the currently active provider name string."""
    return _active_ocr_provider


async def reload_from_config() -> str:
    """
    Called at application startup to restore the persisted provider selection
    from the ai_configuration MongoDB collection.

    Falls back to the environment variable if the collection is empty or
    unavailable, using _last_known_provider as an in-process cache guard.
    """
    global _active_ocr_provider, _last_known_provider
    try:
        from repositories.ai_config_repository import ai_config_repository
        config = await ai_config_repository.get_config()
        stored = config.get("active_ocr", "").lower()
        if stored:
            _active_ocr_provider = stored
            _last_known_provider = stored
            logger.info("OCR provider loaded from config", provider=stored)
        return _active_ocr_provider
    except Exception as exc:
        logger.warning("OCR factory reload failed, using last-known provider",
                       provider=_last_known_provider, error=str(exc))
        _active_ocr_provider = _last_known_provider
        return _active_ocr_provider
