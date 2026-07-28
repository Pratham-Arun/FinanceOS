from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional

class BaseLLMProvider(ABC):
    """
    Abstract Base Class for LLM Provider abstraction (OpenAI, Gemini, Claude).
    Decouples business logic from specific AI models.
    """

    @abstractmethod
    async def generate_text(self, prompt: str, system_prompt: Optional[str] = None) -> str:
        """Generates natural language text response."""
        pass

    @abstractmethod
    async def analyze_json(self, prompt: str, system_prompt: Optional[str] = None) -> Dict[str, Any]:
        """Extracts structured JSON object from a prompt."""
        pass

    @abstractmethod
    async def get_embedding(self, text: str) -> List[float]:
        """Generates vector embedding for RAG search."""
        pass
