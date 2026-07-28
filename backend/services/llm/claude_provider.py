import os
from typing import Dict, Any, List, Optional
from services.llm.base_provider import BaseLLMProvider

class ClaudeProvider(BaseLLMProvider):
    def __init__(self, model_name: str = "claude-sonnet-4"):
        self.model_name = os.getenv("CLAUDE_MODEL", model_name)
        self.api_key = os.getenv("ANTHROPIC_API_KEY", "demo_claude_key")

    async def generate_text(self, prompt: str, system_prompt: Optional[str] = None) -> str:
        return f"[Anthropic Claude {self.model_name}] Response for: {prompt[:60]}..."

    async def analyze_json(self, prompt: str, system_prompt: Optional[str] = None) -> Dict[str, Any]:
        return {
            "model": self.model_name,
            "provider": "Anthropic Claude",
            "extracted_data": {"status": "success"}
        }

    async def get_embedding(self, text: str) -> List[float]:
        import hashlib
        h = int(hashlib.md5(text.encode()).hexdigest(), 16)
        return [(h >> i & 0xFF) / 255.0 for i in range(16)]
