from abc import ABC, abstractmethod
from typing import Dict, Any, List

class BaseVectorStore(ABC):
    """
    Abstract Base Class for Vector DB Drivers (ChromaDB local, Pinecone, Weaviate, Qdrant).
    Allows seamless switching from local dev store to production cloud vector DBs.
    """

    @abstractmethod
    async def add_documents(self, docs: List[Dict[str, Any]]) -> None:
        """Adds text documents and embeddings to vector store."""
        pass

    @abstractmethod
    async def similarity_search(self, query: str, top_k: int = 3) -> List[Dict[str, Any]]:
        """Performs vector similarity search for given text query."""
        pass
