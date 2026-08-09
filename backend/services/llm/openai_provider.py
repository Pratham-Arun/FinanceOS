import json
import os
from typing import Dict, Any, List, Optional
import httpx
from services.llm.base_provider import BaseLLMProvider
from utils.logger import logger

_DEMO_KEY_PREFIXES = ("demo_", "sk-demo", "your_", "replace_")

class OpenAIProvider(BaseLLMProvider):
    BASE_URL = "https://api.openai.com/v1"

    def __init__(self, model_name: str = "gpt-4o-mini"):
        self.model_name = os.getenv("OPENAI_MODEL", model_name)
        self.api_key = os.getenv("OPENAI_API_KEY", "demo_openai_key")

    def _is_demo(self) -> bool:
        return not self.api_key or any(self.api_key.lower().startswith(p) for p in _DEMO_KEY_PREFIXES)

    async def generate_text(self, prompt: str, system_prompt: Optional[str] = None) -> str:
        if self._is_demo():
            return f"[OpenAI {self.model_name} — demo mode] {prompt[:80]}"
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                f"{self.BASE_URL}/chat/completions",
                headers={"Authorization": f"Bearer {self.api_key}"},
                json={"model": self.model_name, "messages": messages, "max_tokens": 512},
            )
            resp.raise_for_status()
            data = resp.json()
            return data["choices"][0]["message"]["content"]

    async def analyze_json(self, prompt: str, system_prompt: Optional[str] = None) -> str:
        """
        Calls OpenAI chat completions and returns the raw assistant content string.
        ai_service._parse_llm_response() handles JSON extraction.
        Falls back to raising an exception so ai_service can use its rule-engine tier.
        """
        if self._is_demo():
            raise RuntimeError(
                f"OpenAI API key not configured (running in demo mode). "
                f"Set OPENAI_API_KEY to enable LLM analysis."
            )
        sys = system_prompt or (
            "You are a financial compliance AI. Return ONLY valid JSON, no markdown."
        )
        messages = [
            {"role": "system", "content": sys},
            {"role": "user", "content": prompt},
        ]
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                f"{self.BASE_URL}/chat/completions",
                headers={"Authorization": f"Bearer {self.api_key}"},
                json={
                    "model": self.model_name,
                    "messages": messages,
                    "response_format": {"type": "json_object"},
                    "temperature": float(os.getenv("LLM_TEMPERATURE", "0.2")),
                    "max_tokens": int(os.getenv("LLM_MAX_TOKENS", "1024")),
                },
            )
            resp.raise_for_status()
            data = resp.json()

        raw_content = data["choices"][0]["message"]["content"]
        usage = data.get("usage", {})
        logger.info(
            "OpenAI response received",
            model=self.model_name,
            prompt_tokens=usage.get("prompt_tokens"),
            completion_tokens=usage.get("completion_tokens"),
        )
        return raw_content

    async def get_embedding(self, text: str) -> List[float]:
        if self._is_demo():
            import hashlib
            h = int(hashlib.md5(text.encode()).hexdigest(), 16)
            return [(h >> i & 0xFF) / 255.0 for i in range(16)]
        async with httpx.AsyncClient(timeout=20.0) as client:
            resp = await client.post(
                f"{self.BASE_URL}/embeddings",
                headers={"Authorization": f"Bearer {self.api_key}"},
                json={"model": "text-embedding-3-small", "input": text},
            )
            resp.raise_for_status()
            return resp.json()["data"][0]["embedding"]
