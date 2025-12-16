"""
Core framework modules for document search

Easy imports:
    from core import DocumentSearchEngine
    from core import FileVectorStore
    from core import EmbeddingGenerator
"""

from core.document_search import DocumentSearchEngine
from core.file_vector_store import FileVectorStore
from core.embeddings import EmbeddingGenerator

__all__ = [
    'DocumentSearchEngine',
    'FileVectorStore',
    'EmbeddingGenerator'
]
