"""
File-based Vector Store Module
Handles storage and similarity search of document embeddings
All data stored locally - no cloud services
"""

import pickle
import json
import os
import numpy as np
from typing import List, Dict, Any, Optional, Tuple
from sklearn.metrics.pairwise import cosine_similarity


class FileVectorStore:
    """Store and search document embeddings using local storage only"""
    
    def __init__(self):
        """Initialize FileVectorStore"""
        self.embeddings = None  # numpy array of embeddings
        self.metadata = []  # List of document metadata
        self.dimension = None
        
    def add_document(self, embedding: List[float], metadata: Dict[str, Any]):
        """
        Add a single document embedding and metadata
        
        Args:
            embedding: Document embedding vector
            metadata: Document metadata (filename, filepath, text excerpt, etc.)
        """
        embedding_array = np.array(embedding).reshape(1, -1)
        
        if self.embeddings is None:
            self.embeddings = embedding_array
            self.metadata = [metadata]
            self.dimension = embedding_array.shape[1]
        else:
            self.embeddings = np.vstack([self.embeddings, embedding_array])
            self.metadata.append(metadata)
        
        print(f"✓ Added document: {metadata.get('filename', 'Unknown')}")
    
    def add_documents(self, embeddings: List[List[float]], 
                     metadata_list: List[Dict[str, Any]]):
        """
        Add multiple document embeddings and metadata
        
        Args:
            embeddings: List of embedding vectors
            metadata_list: List of document metadata (same length as embeddings)
        """
        if len(embeddings) != len(metadata_list):
            raise ValueError("Number of embeddings must match number of metadata items")
        
        embeddings_array = np.array(embeddings)
        
        if self.embeddings is None:
            self.embeddings = embeddings_array
            self.metadata = list(metadata_list)
            self.dimension = embeddings_array.shape[1]
        else:
            self.embeddings = np.vstack([self.embeddings, embeddings_array])
            self.metadata.extend(metadata_list)
        
        print(f"✓ Added {len(embeddings)} documents. Total: {len(self.metadata)}")
    
    def search(self, query_embedding: List[float], top_k: int = 5, 
               threshold: Optional[float] = None) -> List[Tuple[Dict[str, Any], float]]:
        """
        Search for similar documents using cosine similarity
        
        Args:
            query_embedding: Query vector
            top_k: Number of results to return
            threshold: Minimum similarity score (0-1)
            
        Returns:
            List of tuples (metadata, similarity_score) sorted by similarity
        """
        if self.embeddings is None or len(self.metadata) == 0:
            return []
        
        # Convert query to numpy array
        query_vector = np.array(query_embedding).reshape(1, -1)
        
        # Calculate cosine similarity
        similarities = cosine_similarity(query_vector, self.embeddings)[0]
        
        # Get top-k indices
        top_indices = np.argsort(similarities)[::-1][:top_k]
        
        # Build results
        results = []
        for idx in top_indices:
            score = float(similarities[idx])
            
            # Apply threshold if specified
            if threshold is not None and score < threshold:
                continue
            
            # Add metadata with score
            result_metadata = self.metadata[idx].copy()
            result_metadata['similarity_score'] = score
            results.append((result_metadata, score))
        
        return results
    
    def remove_document(self, doc_id: str):
        """
        Remove a document by its ID
        
        Args:
            doc_id: Document ID to remove
        """
        if self.embeddings is None or len(self.metadata) == 0:
            return
        
        # Find index of document
        indices_to_remove = []
        for i, meta in enumerate(self.metadata):
            if meta.get('doc_id') == doc_id:
                indices_to_remove.append(i)
        
        if not indices_to_remove:
            print(f"Document with ID {doc_id} not found")
            return
        
        # Remove from metadata
        self.metadata = [meta for i, meta in enumerate(self.metadata) 
                        if i not in indices_to_remove]
        
        # Remove from embeddings
        mask = np.ones(len(self.embeddings), dtype=bool)
        mask[indices_to_remove] = False
        self.embeddings = self.embeddings[mask]
        
        print(f"✓ Removed {len(indices_to_remove)} document(s)")
    
    def remove_by_filename(self, filename: str):
        """
        Remove documents by filename
        
        Args:
            filename: Filename to remove
        """
        if self.embeddings is None or len(self.metadata) == 0:
            return
        
        # Find indices of documents with matching filename
        indices_to_remove = []
        for i, meta in enumerate(self.metadata):
            if meta.get('filename') == filename:
                indices_to_remove.append(i)
        
        if not indices_to_remove:
            print(f"Document with filename {filename} not found")
            return
        
        # Remove from metadata
        self.metadata = [meta for i, meta in enumerate(self.metadata) 
                        if i not in indices_to_remove]
        
        # Remove from embeddings
        mask = np.ones(len(self.embeddings), dtype=bool)
        mask[indices_to_remove] = False
        self.embeddings = self.embeddings[mask]
        
        print(f"✓ Removed {len(indices_to_remove)} document(s) with filename {filename}")
    
    def get_count(self) -> int:
        """Get total number of documents"""
        return len(self.metadata) if self.metadata else 0
    
    def get_all_documents(self) -> List[Dict[str, Any]]:
        """Get all document metadata"""
        return self.metadata.copy() if self.metadata else []
    
    def clear(self):
        """Clear all documents from the vector store"""
        self.embeddings = None
        self.metadata = []
        self.dimension = None
        print("✓ Vector store cleared")
    
    def save(self, filepath: str):
        """
        Save vector store to disk
        
        Args:
            filepath: Path to save pickle file
        """
        # Create directory if it doesn't exist
        os.makedirs(os.path.dirname(filepath), exist_ok=True)
        
        data = {
            'embeddings': self.embeddings,
            'metadata': self.metadata,
            'dimension': self.dimension
        }
        
        with open(filepath, 'wb') as f:
            pickle.dump(data, f)
        
        print(f"✓ Vector store saved to {filepath}")
    
    def load(self, filepath: str) -> bool:
        """
        Load vector store from disk
        
        Args:
            filepath: Path to pickle file
            
        Returns:
            True if loaded successfully, False otherwise
        """
        if not os.path.exists(filepath):
            print(f"No saved vector store found at {filepath}")
            return False
        
        try:
            with open(filepath, 'rb') as f:
                data = pickle.load(f)
            
            self.embeddings = data.get('embeddings')
            self.metadata = data.get('metadata', [])
            self.dimension = data.get('dimension')
            
            print(f"✓ Vector store loaded from {filepath} ({len(self.metadata)} documents)")
            return True
        except Exception as e:
            print(f"Error loading vector store: {e}")
            return False
    
    def export_metadata(self, filepath: str):
        """
        Export metadata to JSON file
        
        Args:
            filepath: Path to save JSON file
        """
        os.makedirs(os.path.dirname(filepath), exist_ok=True)
        
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(self.metadata, f, indent=2, ensure_ascii=False)
        
        print(f"✓ Metadata exported to {filepath}")
    
    def import_metadata(self, filepath: str):
        """
        Import metadata from JSON file (embeddings must be loaded separately)
        
        Args:
            filepath: Path to JSON file
        """
        if not os.path.exists(filepath):
            print(f"Metadata file not found: {filepath}")
            return
        
        with open(filepath, 'r', encoding='utf-8') as f:
            self.metadata = json.load(f)
        
        print(f"✓ Metadata imported from {filepath}")
