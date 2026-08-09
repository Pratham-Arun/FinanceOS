"""
LLM Provider Factory — resolves the active LLM driver at call time.

Runtime switching: set_active_llm_provider() updates the module-level variable
immediately, affecting all subsequent calls in the same process without a restart.

Startup recovery: reload_from_config() reads the persisted value from MongoDB's
ai_configuration collection and restores the active provider.
"""
import os
from typing import Optional
from utils.logger import logger
from services.llm.base_provider import BaseLLMProvider
from services.llm.openai_provider import OpenAIProvider
from services.llm.gemini_provider import GeminiProvider
from services.llm.claude_provider import ClaudeProvider

_current_provider_name: str = os.getenv("LLM_PROVIDER", "openai").lower()
_last_known_provider: str = _current_provider_name   # fallback cache


def get_llm_provider(provider_name: Optional[str] = None) -> BaseLLMProvider:
    """Returns a new instance of the currently active LLM provider."""
    name = (provider_name or _current_provider_name).lower()
    if "gemini" in name or "google" in name:
        return GeminiProvider()
    elif "claude" in name or "anthropic" in name:
        return ClaudeProvider()
    else:
        return OpenAIProvider()


def set_active_llm_provider(provider_name: str) -> str:
    """
    Hot-swaps the active LLM provider. Takes effect on the very next call to
    get_llm_provider() with no server restart required.
    """
    global _current_provider_name, _last_known_provider
    _current_provider_name = provider_name.lower()
    _last_known_provider = _current_provider_name
    logger.info("LLM provider switched", provider=_current_provider_name)
    return _current_provider_name


def get_active_llm_provider_name() -> str:
    """Returns the currently active provider name string."""
    return _current_provider_name


async def reload_from_config() -> str:
    """
    Called at application startup to restore the persisted provider selection
    from the ai_configuration MongoDB collection.
    """
    global _current_provider_name, _last_known_provider
    try:
        from repositories.ai_config_repository import ai_config_repository
        config = await ai_config_repository.get_config()
        stored = config.get("active_llm", "").lower()
        if stored:
            _current_provider_name = stored
            _last_known_provider = stored
            logger.info("LLM provider loaded from config", provider=stored)
        return _current_provider_name
    except Exception as exc:
        logger.warning("LLM factory reload failed, using last-known provider",
                       provider=_last_known_provider, error=str(exc))
        _current_provider_name = _last_known_provider
        return _current_provider_name
