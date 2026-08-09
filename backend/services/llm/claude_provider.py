import os
from typing import Dict, Any, List, Optional
import httpx
from services.llm.base_provider import BaseLLMProvider
from utils.logger import logger

_DEMO_KEY_PREFIXES = ("demo_", "your_", "replace_", "sk-ant-demo")

class ClaudeProvider(BaseLLMProvider):
    BASE_URL = "https://api.anthropic.com/v1/messages"
    ANTHROPIC_VERSION = "2023-06-01"

    def __init__(self, model_name: str = "claude-3-haiku-20240307"):
        self.model_name = os.getenv("CLAUDE_MODEL", model_name)
        self.api_key = os.getenv("ANTHROPIC_API_KEY", "demo_claude_key")

    def _is_demo(self) -> bool:
        return not self.api_key or any(self.api_key.lower().startswith(p) for p in _DEMO_KEY_PREFIXES)

    async def generate_text(self, prompt: str, system_prompt: Optional[str] = None) -> str:
        if self._is_demo():
            return f"[Claude {self.model_name} — demo mode] {prompt[:80]}"
        payload: Dict[str, Any] = {
            "model": self.model_name,
            "max_tokens": 512,
            "messages": [{"role": "user", "content": prompt}],
        }
        if system_prompt:
            payload["system"] = system_prompt
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                self.BASE_URL,
                headers={
                    "x-api-key": self.api_key,
                    "anthropic-version": self.ANTHROPIC_VERSION,
                    "content-type": "application/json",
                },
                json=payload,
            )
            resp.raise_for_status()
            data = resp.json()
            return data["content"][0]["text"]

    async def analyze_json(self, prompt: str, system_prompt: Optional[str] = None) -> str:
        """
        Calls Anthropic Messages API and returns the raw text content string.
        ai_service._parse_llm_response() handles JSON extraction.
        Raises RuntimeError in demo mode so ai_service falls to rule-engine tier.
        """
        if self._is_demo():
            raise RuntimeError(
                f"Anthropic API key not configured (running in demo mode). "
                f"Set ANTHROPIC_API_KEY to enable LLM analysis."
            )
        sys = system_prompt or (
            "You are a financial compliance AI. Return ONLY valid JSON, no markdown code fences."
        )
        payload: Dict[str, Any] = {
            "model": self.model_name,
            "max_tokens": int(os.getenv("LLM_MAX_TOKENS", "1024")),
            "system": sys,
            "messages": [{"role": "user", "content": prompt}],
        }
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                self.BASE_URL,
                headers={
                    "x-api-key": self.api_key,
                    "anthropic-version": self.ANTHROPIC_VERSION,
                    "content-type": "application/json",
                },
                json=payload,
            )
            resp.raise_for_status()
            data = resp.json()

        raw_content = data["content"][0]["text"]
        usage = data.get("usage", {})
        logger.info(
            "Claude response received",
            model=self.model_name,
            input_tokens=usage.get("input_tokens"),
            output_tokens=usage.get("output_tokens"),
        )
        return raw_content

    async def get_embedding(self, text: str) -> List[float]:
        # Anthropic does not provide embeddings — use a deterministic hash fallback
        import hashlib
        h = int(hashlib.md5(text.encode()).hexdigest(), 16)
        return [(h >> i & 0xFF) / 255.0 for i in range(16)]
