import json
import os
from typing import Dict, Any, List, Optional
import httpx
from services.llm.base_provider import BaseLLMProvider
from utils.logger import logger

_DEMO_KEY_PREFIXES = ("demo_", "your_", "replace_", "aiza")

class GeminiProvider(BaseLLMProvider):
    BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models"

    def __init__(self, model_name: str = "gemini-1.5-flash"):
        self.model_name = os.getenv("GEMINI_MODEL", model_name)
        self.api_key = os.getenv("GEMINI_API_KEY", "demo_gemini_key")

    def _is_demo(self) -> bool:
        return not self.api_key or any(self.api_key.lower().startswith(p) for p in _DEMO_KEY_PREFIXES)

    async def generate_text(self, prompt: str, system_prompt: Optional[str] = None) -> str:
        if self._is_demo():
            return f"[Gemini {self.model_name} — demo mode] {prompt[:80]}"
        parts = []
        if system_prompt:
            parts.append({"text": f"{system_prompt}\n\n{prompt}"})
        else:
            parts.append({"text": prompt})
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                f"{self.BASE_URL}/{self.model_name}:generateContent?key={self.api_key}",
                json={"contents": [{"parts": parts}]},
            )
            resp.raise_for_status()
            data = resp.json()
            return data["candidates"][0]["content"]["parts"][0]["text"]

    async def analyze_json(self, prompt: str, system_prompt: Optional[str] = None) -> str:
        """
        Calls Gemini generateContent and returns the raw text string.
        ai_service._parse_llm_response() handles JSON extraction.
        Raises RuntimeError in demo mode so ai_service falls to rule-engine tier.
        """
        if self._is_demo():
            raise RuntimeError(
                f"Gemini API key not configured (running in demo mode). "
                f"Set GEMINI_API_KEY to enable LLM analysis."
            )
        sys_instruction = system_prompt or (
            "You are a financial compliance AI. Return ONLY valid JSON, no markdown code fences."
        )
        full_prompt = f"{sys_instruction}\n\n{prompt}"
        payload = {
            "contents": [{"parts": [{"text": full_prompt}]}],
            "generationConfig": {
                "temperature": float(os.getenv("LLM_TEMPERATURE", "0.2")),
                "maxOutputTokens": int(os.getenv("LLM_MAX_TOKENS", "1024")),
                "responseMimeType": "application/json",
            },
        }
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                f"{self.BASE_URL}/{self.model_name}:generateContent?key={self.api_key}",
                json=payload,
            )
            resp.raise_for_status()
            data = resp.json()

        raw_content = data["candidates"][0]["content"]["parts"][0]["text"]
        usage = data.get("usageMetadata", {})
        logger.info(
            "Gemini response received",
            model=self.model_name,
            prompt_tokens=usage.get("promptTokenCount"),
            completion_tokens=usage.get("candidatesTokenCount"),
        )
        return raw_content

    async def get_embedding(self, text: str) -> List[float]:
        if self._is_demo():
            import hashlib
            h = int(hashlib.md5(text.encode()).hexdigest(), 16)
            return [(h >> i & 0xFF) / 255.0 for i in range(16)]
        async with httpx.AsyncClient(timeout=20.0) as client:
            resp = await client.post(
                f"{self.BASE_URL}/text-embedding-004:embedContent?key={self.api_key}",
                json={"model": "models/text-embedding-004", "content": {"parts": [{"text": text}]}},
            )
            resp.raise_for_status()
            return resp.json()["embedding"]["values"]
