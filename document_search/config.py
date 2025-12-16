"""
Configuration module for Document Search AI Tool
Loads environment variables and defines global constants
"""

import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# OpenAI API Configuration
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
OPENAI_API_BASE = os.getenv("OPENAI_API_BASE", None)

# Model Configuration
EMBEDDING_MODEL = "text-embedding-3-small"  # Faster and cost-effective (1536 dimensions)
CHAT_MODEL = "gpt-4o-mini"  # Good balance of quality and speed

# Search Configuration
DEFAULT_TOP_K = 5  # Number of results to return by default
SIMILARITY_THRESHOLD = 0.3  # Minimum similarity score (0-1)
MAX_RESULTS = 10  # Maximum number of results

# File Upload Configuration
# Use root data folder (not document_search/data)
UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "uploads")
EMBEDDINGS_FOLDER = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "embeddings")
ALLOWED_EXTENSIONS = {'.pdf', '.docx', '.doc', '.txt', '.md', '.html', '.htm'}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB max file size
MAX_FILES_PER_UPLOAD = 10  # Maximum files per upload batch

# Storage paths
EMBEDDINGS_INDEX_PATH = os.path.join(EMBEDDINGS_FOLDER, "documents_index.pkl")
METADATA_PATH = os.path.join(EMBEDDINGS_FOLDER, "metadata.json")

# Flask API Configuration
API_HOST = os.getenv("API_HOST", "0.0.0.0")
API_PORT = int(os.getenv("DOC_SEARCH_PORT", "5001"))
API_DEBUG = os.getenv("API_DEBUG", "False").lower() == "true"

# UI Configuration
UI_CONFIG = {
    "page_title": "AI Document Search",
    "main_heading": "AI Document Search",
    "subtitle": "Search through your documents using AI-powered semantic search",
    "entity_name": "documents",
    "entity_name_singular": "document",
    "search_placeholder": "Ask in natural language: e.g., Find documents about machine learning...",
    "search_button": "Search",
    "results_heading": "Search Results",
    "no_results_title": "No documents found",
    "no_results_message": "Try adjusting your search query",
    "loading_message": "Searching documents...",
    "summary_heading": "AI Summary",
    "generate_summary_button": "Generate AI Summary",
    "filter_threshold_label": "Similarity Threshold",
    "filter_max_results_label": "Maximum Results",
    "icons": {
        "main_logo": "warehouse.svg",
        "file_text": "file-text.svg",
        "search": "search.svg",
        "microphone": "microphone.svg",
        "pause": "pause.svg",
        "refresh": "refresh.svg",
        "lightbulb": "lightbulb.svg",
        "filter": "filter.svg",
        "chevron_down": "chevron-down.svg",
        "alert_circle": "alert-circle.svg",
        "check_circle": "check-circle.svg",
        "search_x": "search-x.svg",
        "alert_triangle": "alert-triangle.svg",
        "recording_dot": "recording-dot.svg",
        "upload": "upload.svg",
        "file": "file.svg",
        "download": "download.svg",
        "trash": "trash.svg",
        "eye": "eye.svg",
        "sparkles": "sparkles.svg"
    }
}
