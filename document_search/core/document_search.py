"""
Document Search Engine Module
Main interface for file-based semantic search
"""

import os
import hashlib
from typing import List, Dict, Any, Optional
from core.file_vector_store import FileVectorStore
from core.embeddings import EmbeddingGenerator
from utils.file_parsers import extract_text, get_file_info, clean_text
import config


class DocumentSearchEngine:
    """Main search engine for file-based semantic search"""
    
    def __init__(self, upload_folder=None, embeddings_folder=None):
        """
        Initialize DocumentSearchEngine
        
        Args:
            upload_folder: Custom upload folder path (optional, defaults to config)
            embeddings_folder: Custom embeddings folder path (optional, defaults to config)
        """
        self.vector_store = FileVectorStore()
        self.embedding_generator = EmbeddingGenerator()
        
        # Use custom folders if provided, otherwise use config
        self.uploads_folder = upload_folder or config.UPLOAD_FOLDER
        embeddings_folder = embeddings_folder or config.EMBEDDINGS_FOLDER
        self.index_path = os.path.join(embeddings_folder, "documents_index.pkl")
        
        # Create folders if they don't exist
        os.makedirs(self.uploads_folder, exist_ok=True)
        os.makedirs(embeddings_folder, exist_ok=True)
        
        # Load existing index if available
        self.load_index()
    
    def load_index(self):
        """Load existing vector store from disk"""
        if os.path.exists(self.index_path):
            self.vector_store.load(self.index_path)
            print(f"✓ Loaded {self.vector_store.get_count()} documents from index")
        else:
            print("No existing index found. Starting fresh.")
    
    def save_index(self):
        """Save vector store to disk"""
        self.vector_store.save(self.index_path)
    
    def add_document(self, file_path: str, save_index: bool = True) -> Dict[str, Any]:
        """
        Add a document to the search index
        
        Args:
            file_path: Path to the document file
            save_index: Whether to save the index after adding
            
        Returns:
            Dictionary with success status and document info
        """
        try:
            # Extract text from file
            print(f"Processing file: {file_path}")
            text = extract_text(file_path)
            
            if not text or len(text.strip()) < 10:
                return {
                    'success': False,
                    'error': 'No text content found or content too short'
                }
            
            # Clean text
            text = clean_text(text)
            
            # Get file info
            file_info = get_file_info(file_path)
            
            # Generate document ID
            doc_id = self._generate_doc_id(file_path)
            
            # Generate embedding
            print(f"Generating embedding for: {file_info['filename']}")
            embedding = self.embedding_generator.generate_embedding(text)
            
            # Create metadata
            metadata = {
                'doc_id': doc_id,
                'filename': file_info['filename'],
                'filepath': file_path,
                'extension': file_info['extension'],
                'size_mb': file_info['size_mb'],
                'text_excerpt': text[:500],  # First 500 chars for preview
                'text_length': len(text),
                'full_text': text  # Store full text for result display
            }
            
            # Add to vector store
            self.vector_store.add_document(embedding, metadata)
            
            # Save index
            if save_index:
                self.save_index()
            
            return {
                'success': True,
                'doc_id': doc_id,
                'filename': file_info['filename'],
                'message': f"Document added successfully"
            }
            
        except Exception as e:
            print(f"Error adding document: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def add_documents_batch(self, file_paths: List[str]) -> Dict[str, Any]:
        """
        Add multiple documents to the search index
        
        Args:
            file_paths: List of file paths
            
        Returns:
            Dictionary with success status and results
        """
        results = []
        successful = 0
        failed = 0
        
        for file_path in file_paths:
            result = self.add_document(file_path, save_index=False)
            results.append(result)
            
            if result['success']:
                successful += 1
            else:
                failed += 1
        
        # Save index once at the end
        if successful > 0:
            self.save_index()
        
        return {
            'success': True,
            'total': len(file_paths),
            'successful': successful,
            'failed': failed,
            'results': results
        }
    
    def remove_document(self, filename: str) -> Dict[str, Any]:
        """
        Remove a document from the search index
        
        Args:
            filename: Name of the file to remove
            
        Returns:
            Dictionary with success status
        """
        try:
            # Remove from vector store
            self.vector_store.remove_by_filename(filename)
            
            # Save index
            self.save_index()
            
            return {
                'success': True,
                'message': f"Document {filename} removed successfully"
            }
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def search(self, query: str, top_k: int = 5, 
               threshold: Optional[float] = None) -> List[Dict[str, Any]]:
        """
        Search for documents matching the query
        Searches both document content AND filename for matches
        
        Args:
            query: Search query
            top_k: Number of results to return
            threshold: Minimum similarity score
            
        Returns:
            List of matching documents with metadata
        """
        try:
            # Generate query embedding
            query_embedding = self.embedding_generator.generate_embedding(query)
            
            # Create combined query: include query text in filename search
            # This ensures files with matching names get higher priority
            filename_boost_query = f"{query} filename: {query}"
            filename_embedding = self.embedding_generator.generate_embedding(filename_boost_query)
            
            # Search vector store with both queries
            content_results = self.vector_store.search(
                query_embedding, 
                top_k=top_k * 2,  # Get more results initially
                threshold=threshold * 0.5 if threshold else None  # Lower threshold for initial search
            )
            
            # Also do filename-based matching
            all_docs = self.vector_store.get_all_documents()
            query_lower = query.lower()
            
            # Boost scores for filename matches
            boosted_results = {}
            for metadata, score in content_results:
                filename = metadata.get('filename', '').lower()
                doc_id = metadata.get('doc_id', '')
                
                # Check if query appears in filename
                if query_lower in filename:
                    # Boost score significantly for filename matches
                    score = min(1.0, score + 0.3)  # Add 30% boost
                
                boosted_results[doc_id] = (metadata, score)
            
            # Add documents that weren't in content results but match filename
            for doc in all_docs:
                filename = doc.get('filename', '').lower()
                doc_id = doc.get('doc_id', '')
                
                if doc_id not in boosted_results and query_lower in filename:
                    # These docs didn't match content but match filename
                    # Give them a reasonable score
                    boosted_results[doc_id] = (doc, 0.6)
            
            # Sort by score and take top_k
            sorted_results = sorted(boosted_results.values(), key=lambda x: x[1], reverse=True)
            
            # Apply final threshold if specified
            if threshold:
                sorted_results = [(meta, score) for meta, score in sorted_results if score >= threshold]
            
            # Take only top_k results
            sorted_results = sorted_results[:top_k]
            
            # Format results
            formatted_results = []
            for metadata, score in sorted_results:
                # Add the similarity score to metadata
                metadata_with_score = metadata.copy()
                metadata_with_score['similarity_score'] = score
                formatted_results.append(metadata_with_score)
            
            return formatted_results
            
        except Exception as e:
            print(f"Error searching: {e}")
            return []
    
    def get_all_documents(self) -> List[Dict[str, Any]]:
        """Get list of all indexed documents"""
        docs = self.vector_store.get_all_documents()
        
        # Remove full_text from listings (too large)
        cleaned_docs = []
        for doc in docs:
            cleaned_doc = doc.copy()
            if 'full_text' in cleaned_doc:
                del cleaned_doc['full_text']
            cleaned_docs.append(cleaned_doc)
        
        return cleaned_docs
    
    def get_document_count(self) -> int:
        """Get total number of indexed documents"""
        return self.vector_store.get_count()
    
    def rebuild_index(self) -> Dict[str, Any]:
        """
        Rebuild the entire index from files in upload folder
        
        Returns:
            Dictionary with rebuild status
        """
        try:
            # Clear existing index
            self.vector_store.clear()
            
            # Get all files in upload folder
            file_paths = []
            if os.path.exists(self.uploads_folder):
                for filename in os.listdir(self.uploads_folder):
                    file_path = os.path.join(self.uploads_folder, filename)
                    if os.path.isfile(file_path):
                        _, ext = os.path.splitext(filename)
                        if ext.lower() in config.ALLOWED_EXTENSIONS:
                            file_paths.append(file_path)
            
            if not file_paths:
                return {
                    'success': True,
                    'message': 'No files found to index',
                    'count': 0
                }
            
            # Add all documents
            result = self.add_documents_batch(file_paths)
            
            return {
                'success': True,
                'message': f"Index rebuilt successfully",
                'count': result['successful'],
                'failed': result['failed']
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def _generate_doc_id(self, file_path: str) -> str:
        """
        Generate a unique document ID based on file path
        
        Args:
            file_path: Path to file
            
        Returns:
            Unique document ID
        """
        return hashlib.md5(file_path.encode()).hexdigest()
