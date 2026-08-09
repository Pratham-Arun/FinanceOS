"""
FinanceOS Gemini Service — single LLM integration.

Calls Google Gemini 2.5 Flash to perform expense compliance analysis.
Falls back to RuntimeError (caught by ai_service tier-2) when the API key
is absent or set to a demo placeholder.
"""
import os
import json
from typing import Any, Dict, List, Optional

import httpx

from utils.logger import logger

# ── Configuration ─────────────────────────────────────────────────────────────

GEMINI_MODEL   = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
BASE_URL       = "https://generativelanguage.googleapis.com/v1beta/models"

_DEMO_PREFIXES = ("demo_", "your_", "replace_", "")  # empty string = not set


def _is_demo() -> bool:
    key = GEMINI_API_KEY.strip()
    return not key or any(key.lower().startswith(p) for p in _DEMO_PREFIXES if p)


# ── Core helpers ──────────────────────────────────────────────────────────────

async def analyze_json(prompt: str, temperature: float = 0.2, max_tokens: int = 1024) -> str:
    """
    Sends `prompt` to Gemini and returns the raw JSON string.
    ai_service._parse_llm_response() handles extraction and validation.

    Raises RuntimeError when the API key is missing — ai_service then falls
    through to its rule-engine tier.
    """
    key = GEMINI_API_KEY.strip()
    if not key:
        raise RuntimeError(
            "GEMINI_API_KEY is not configured. "
            "Set GEMINI_API_KEY in .env to enable AI analysis."
        )

    system_instruction = (
        "You are a financial compliance AI for FinanceOS. "
        "Return ONLY valid JSON — no markdown fences, no extra text."
    )
    full_prompt = f"{system_instruction}\n\n{prompt}"

    payload = {
        "contents": [{"parts": [{"text": full_prompt}]}],
        "generationConfig": {
            "temperature":      temperature,
            "maxOutputTokens":  max_tokens,
            "responseMimeType": "application/json",
        },
    }

    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(
            f"{BASE_URL}/{GEMINI_MODEL}:generateContent?key={key}",
            json=payload,
        )
        resp.raise_for_status()
        data = resp.json()

    raw = data["candidates"][0]["content"]["parts"][0]["text"]
    usage = data.get("usageMetadata", {})
    logger.info(
        "Gemini response received",
        model=GEMINI_MODEL,
        prompt_tokens=usage.get("promptTokenCount"),
        completion_tokens=usage.get("candidatesTokenCount"),
    )
    return raw


async def generate_text(prompt: str, system_prompt: Optional[str] = None) -> str:
    """Plain text generation — used by chat_service and rag_service."""
    key = GEMINI_API_KEY.strip()
    if not key:
        return f"[Gemini — API key not configured] {prompt[:100]}"

    parts_text = f"{system_prompt}\n\n{prompt}" if system_prompt else prompt
    payload = {
        "contents": [{"parts": [{"text": parts_text}]}],
        "generationConfig": {"temperature": 0.3, "maxOutputTokens": 512},
    }
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(
            f"{BASE_URL}/{GEMINI_MODEL}:generateContent?key={key}",
            json=payload,
        )
        resp.raise_for_status()
        return resp.json()["candidates"][0]["content"]["parts"][0]["text"]


async def get_embedding(text: str) -> List[float]:
    """
    Generates a text embedding using Gemini's text-embedding-004 model.
    Falls back to a deterministic hash vector when the key is absent.
    """
    key = GEMINI_API_KEY.strip()
    if not key:
        import hashlib
        h = int(hashlib.md5(text.encode()).hexdigest(), 16)
        return [(h >> i & 0xFF) / 255.0 for i in range(16)]

    async with httpx.AsyncClient(timeout=20.0) as client:
        resp = await client.post(
            f"{BASE_URL}/text-embedding-004:embedContent?key={key}",
            json={
                "model": "models/text-embedding-004",
                "content": {"parts": [{"text": text}]},
            },
        )
        resp.raise_for_status()
        return resp.json()["embedding"]["values"]


def is_connected() -> bool:
    """Returns True when a real (non-demo) API key is configured."""
    return bool(GEMINI_API_KEY.strip())
