"""
FinanceOS Groq Service — LLM integration via Groq API.

Uses llama-3.3-70b-versatile (or whatever GROQ_MODEL is set to) for
expense compliance analysis.  Raises RuntimeError when the API key is
absent so ai_service falls through to the rule-engine fallback.
"""
import os
from typing import List, Optional

from utils.logger import logger

# ── Configuration ─────────────────────────────────────────────────────────────

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GROQ_MODEL   = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")


def is_connected() -> bool:
    """Returns True when a real API key is configured."""
    return bool(GROQ_API_KEY.strip())


# ── Core helpers ──────────────────────────────────────────────────────────────

async def analyze_json(prompt: str, temperature: float = 0.2, max_tokens: int = 1024) -> str:
    """
    Sends `prompt` to Groq and returns the raw JSON string.
    ai_service._parse_llm_response() handles extraction and validation.

    Raises RuntimeError when key is missing — ai_service falls to rule-engine.
    """
    key = GROQ_API_KEY.strip()
    if not key:
        raise RuntimeError(
            "GROQ_API_KEY is not configured. "
            "Set GROQ_API_KEY in .env to enable LLM analysis."
        )

    # Groq SDK is sync; run in executor to keep FastAPI async
    import asyncio
    from groq import Groq

    system = (
        "You are a financial compliance AI for FinanceOS. "
        "Return ONLY valid JSON — no markdown fences, no extra text."
    )

    def _call() -> str:
        client = Groq(api_key=key)
        response = client.chat.completions.create(
            model=GROQ_MODEL,
            messages=[
                {"role": "system", "content": system},
                {"role": "user",   "content": prompt},
            ],
            temperature=temperature,
            max_tokens=max_tokens,
            response_format={"type": "json_object"},
        )
        usage = response.usage
        logger.info(
            "Groq response received",
            model=GROQ_MODEL,
            prompt_tokens=usage.prompt_tokens if usage else None,
            completion_tokens=usage.completion_tokens if usage else None,
        )
        return response.choices[0].message.content

    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, _call)


async def generate_text(prompt: str, system_prompt: Optional[str] = None) -> str:
    """Plain text generation — used by chat_service and rag_service."""
    key = GROQ_API_KEY.strip()
    if not key:
        return f"[Groq — API key not configured] {prompt[:100]}"

    import asyncio
    from groq import Groq

    system = system_prompt or "You are a helpful assistant."

    def _call() -> str:
        client = Groq(api_key=key)
        response = client.chat.completions.create(
            model=GROQ_MODEL,
            messages=[
                {"role": "system", "content": system},
                {"role": "user",   "content": prompt},
            ],
            temperature=0.3,
            max_tokens=512,
        )
        return response.choices[0].message.content

    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, _call)


async def get_embedding(text: str) -> List[float]:
    """
    Groq doesn't provide embeddings — deterministic hash fallback.
    Consistent with the Claude provider behaviour.
    """
    import hashlib
    h = int(hashlib.md5(text.encode()).hexdigest(), 16)
    return [(h >> i & 0xFF) / 255.0 for i in range(16)]
