import os
from typing import Optional
from services.vector_store.base_vector_store import BaseVectorStore
from services.vector_store.chroma_store import ChromaVectorStore

_active_vector_store = os.getenv("VECTOR_STORE", "chromadb").lower()

def get_vector_store(store_name: Optional[str] = None) -> BaseVectorStore:
    # Factory interface for switching between ChromaDB (dev) and Pinecone / Qdrant (prod)
    return ChromaVectorStore()
