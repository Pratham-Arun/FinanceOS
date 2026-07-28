import os
from typing import Optional
from services.llm.base_provider import BaseLLMProvider
from services.llm.openai_provider import OpenAIProvider
from services.llm.gemini_provider import GeminiProvider
from services.llm.claude_provider import ClaudeProvider

_current_provider_name = os.getenv("LLM_PROVIDER", "openai").lower()

def get_llm_provider(provider_name: Optional[str] = None) -> BaseLLMProvider:
    name = (provider_name or _current_provider_name).lower()
    if "gemini" in name:
        return GeminiProvider()
    elif "claude" in name or "anthropic" in name:
        return ClaudeProvider()
    else:
        return OpenAIProvider()

def set_active_llm_provider(provider_name: str) -> str:
    global _current_provider_name
    _current_provider_name = provider_name.lower()
    return _current_provider_name
