import os
from typing import Dict, Any, List, Optional
from services.llm.base_provider import BaseLLMProvider

class GeminiProvider(BaseLLMProvider):
    def __init__(self, model_name: str = "gemini-2.5-pro"):
        self.model_name = os.getenv("GEMINI_MODEL", model_name)
        self.api_key = os.getenv("GEMINI_API_KEY", "demo_gemini_key")

    async def generate_text(self, prompt: str, system_prompt: Optional[str] = None) -> str:
        return f"[Google Gemini {self.model_name}] Response for: {prompt[:60]}..."

    async def analyze_json(self, prompt: str, system_prompt: Optional[str] = None) -> Dict[str, Any]:
        return {
            "model": self.model_name,
            "provider": "Google Gemini",
            "extracted_data": {"status": "success"}
        }

    async def get_embedding(self, text: str) -> List[float]:
        import hashlib
        h = int(hashlib.md5(text.encode()).hexdigest(), 16)
        return [(h >> i & 0xFF) / 255.0 for i in range(16)]
