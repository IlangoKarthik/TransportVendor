"""
JWT authentication utilities for Flask document search app
"""
import jwt
import os
from functools import wraps
from flask import request, jsonify
from dotenv import load_dotenv

load_dotenv()

JWT_SECRET = os.getenv('JWT_SECRET', 'netkathir-super-secret-jwt-key-2024-production')

def get_user_from_token():
    """Extract user ID from JWT token in query parameter or header"""
    token = None
    
    # Try to get token from query parameter (iframe URL)
    token = request.args.get('token')
    
    # Fallback to Authorization header
    if not token:
        auth_header = request.headers.get('Authorization')
        if auth_header and auth_header.startswith('Bearer '):
            token = auth_header.replace('Bearer ', '')
    
    if not token:
        return None, "No authentication token provided"
    
    try:
        # Verify and decode token
        decoded = jwt.decode(token, JWT_SECRET, algorithms=['HS256'])
        user_id = decoded.get('userId')
        
        if not user_id:
            return None, "Invalid token payload"
        
        return user_id, None
    except jwt.ExpiredSignatureError:
        return None, "Token expired"
    except jwt.InvalidTokenError:
        return None, "Invalid token"

def require_auth(f):
    """Decorator to require authentication for Flask routes"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        user_id, error = get_user_from_token()
        
        if error:
            return jsonify({'success': False, 'error': error}), 401
        
        # Attach user_id to request context
        request.user_id = user_id
        return f(*args, **kwargs)
    
    return decorated_function

def get_user_data_folder(user_id):
    """Get the data folder path for a specific user"""
    base_path = os.path.join('data', 'users', str(user_id))
    return {
        'base': base_path,
        'uploads': os.path.join(base_path, 'uploads'),
        'embeddings': os.path.join(base_path, 'embeddings')
    }

def ensure_user_folders(user_id):
    """Ensure user-specific folders exist"""
    folders = get_user_data_folder(user_id)
    for folder in folders.values():
        os.makedirs(folder, exist_ok=True)
    return folders
