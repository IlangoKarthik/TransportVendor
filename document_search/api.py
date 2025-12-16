"""
Flask REST API for Document Search AI Tool
Handles file uploads, document indexing, and semantic search
"""

from flask import Flask, request, jsonify, render_template, send_file
from flask_cors import CORS
from werkzeug.utils import secure_filename
import os
import sys
from openai import OpenAI
import config

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from core.document_search import DocumentSearchEngine
from auth import get_user_from_token, ensure_user_folders, get_user_data_folder

app = Flask(__name__)
CORS(app)  # Enable CORS for cross-origin requests
app.config['MAX_CONTENT_LENGTH'] = config.MAX_FILE_SIZE
app.config['TEMPLATES_AUTO_RELOAD'] = True
app.config['SEND_FILE_MAX_AGE_DEFAULT'] = 0

# Store per-user search engines
user_search_engines = {}
openai_client = None

def init_app():
    """Initialize OpenAI client on startup"""
    global openai_client
    try:
        openai_client = OpenAI(api_key=config.OPENAI_API_KEY)
        print("✓ OpenAI client initialized successfully")
    except Exception as e:
        print(f"✗ Error initializing OpenAI client: {e}")
        raise

def get_user_search_engine(user_id):
    """Get or create search engine for specific user"""
    if user_id not in user_search_engines:
        # Ensure user folders exist
        folders = ensure_user_folders(user_id)
        
        # Create user-specific search engine
        user_search_engines[user_id] = DocumentSearchEngine(
            upload_folder=folders['uploads'],
            embeddings_folder=folders['embeddings']
        )
        print(f"✓ Created search engine for user {user_id}")
    
    return user_search_engines[user_id]

# Initialize on startup
init_app()


def allowed_file(filename):
    """Check if file extension is allowed"""
    _, ext = os.path.splitext(filename)
    return ext.lower() in config.ALLOWED_EXTENSIONS


@app.route('/')
def index():
    """Serve the main search page"""
    return render_template(
        'index.html',
        similarity_threshold=config.SIMILARITY_THRESHOLD,
        max_results=config.MAX_RESULTS,
        ui=config.UI_CONFIG
    )


@app.route('/upload')
def upload_page():
    """Serve the upload page"""
    return render_template(
        'upload.html',
        ui=config.UI_CONFIG,
        allowed_extensions=', '.join(config.ALLOWED_EXTENSIONS),
        max_file_size_mb=config.MAX_FILE_SIZE / (1024 * 1024)
    )


@app.route('/api/upload', methods=['POST'])
def upload_files():
    """Upload one or more files"""
    try:
        # Get user from token
        user_id, error = get_user_from_token()
        if error:
            return jsonify({'success': False, 'error': error}), 401
        
        # Get user-specific search engine
        search_engine = get_user_search_engine(user_id)
        folders = get_user_data_folder(user_id)
        
        # Check if files are present
        if 'files' not in request.files:
            return jsonify({
                'success': False,
                'error': 'No files provided'
            }), 400
        
        files = request.files.getlist('files')
        
        if not files or len(files) == 0:
            return jsonify({
                'success': False,
                'error': 'No files selected'
            }), 400
        
        # Check file count limit
        if len(files) > config.MAX_FILES_PER_UPLOAD:
            return jsonify({
                'success': False,
                'error': f'Maximum {config.MAX_FILES_PER_UPLOAD} files allowed per upload'
            }), 400
        
        uploaded = 0
        failed = 0
        results = []
        file_paths = []
        
        # Save files to user-specific folder
        for file in files:
            if file.filename == '':
                continue
            
            if not allowed_file(file.filename):
                results.append({
                    'filename': file.filename,
                    'success': False,
                    'error': 'File type not allowed'
                })
                failed += 1
                continue
            
            try:
                # Secure the filename
                filename = secure_filename(file.filename)
                
                # Check if file already exists in user's folder
                file_path = os.path.join(folders['uploads'], filename)
                if os.path.exists(file_path):
                    # Add timestamp to filename if exists
                    import time
                    name, ext = os.path.splitext(filename)
                    filename = f"{name}_{int(time.time())}{ext}"
                    file_path = os.path.join(folders['uploads'], filename)
                
                # Save file
                file.save(file_path)
                file_paths.append(file_path)
                
                results.append({
                    'filename': filename,
                    'success': True,
                    'status': 'saved'
                })
                uploaded += 1
                
            except Exception as e:
                results.append({
                    'filename': file.filename,
                    'success': False,
                    'error': str(e)
                })
                failed += 1
        
        # Index all uploaded files
        if file_paths:
            index_result = search_engine.add_documents_batch(file_paths)
            
            # Update results with indexing status
            for i, result in enumerate(results):
                if result.get('success'):
                    result['indexed'] = index_result['results'][i].get('success', False)
        
        return jsonify({
            'success': True,
            'uploaded': uploaded,
            'failed': failed,
            'results': results
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/documents', methods=['GET'])
def get_documents():
    """Get list of all uploaded documents"""
    try:
        # Get user from token
        user_id, error = get_user_from_token()
        if error:
            return jsonify({'success': False, 'error': error}), 401
        
        # Get user-specific search engine
        search_engine = get_user_search_engine(user_id)
        documents = search_engine.get_all_documents()
        
        return jsonify({
            'success': True,
            'documents': documents,
            'count': len(documents)
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/documents/<filename>', methods=['DELETE'])
def delete_document(filename):
    """Delete a document"""
    try:
        # Get user from token
        user_id, error = get_user_from_token()
        if error:
            return jsonify({'success': False, 'error': error}), 401
        
        # Get user-specific search engine and folders
        search_engine = get_user_search_engine(user_id)
        folders = get_user_data_folder(user_id)
        
        # Remove from index
        result = search_engine.remove_document(filename)
        
        if not result['success']:
            return jsonify(result), 404
        
        # Delete file from user's disk folder
        file_path = os.path.join(folders['uploads'], filename)
        if os.path.exists(file_path):
            os.remove(file_path)
        
        return jsonify({
            'success': True,
            'message': f'Document {filename} deleted successfully'
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/documents/<filename>/download', methods=['GET'])
def download_document(filename):
    """Download a document"""
    try:
        # Get user from token
        user_id, error = get_user_from_token()
        if error:
            return jsonify({'success': False, 'error': error}), 401
        
        folders = get_user_data_folder(user_id)
        file_path = os.path.join(folders['uploads'], filename)
        
        if not os.path.exists(file_path):
            return jsonify({
                'success': False,
                'error': 'File not found'
            }), 404
        
        return send_file(file_path, as_attachment=True, download_name=filename)
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/documents/<filename>/view', methods=['GET'])
def view_document(filename):
    """View a document (inline, not download)"""
    try:
        # Get user from token
        user_id, error = get_user_from_token()
        if error:
            return jsonify({'success': False, 'error': error}), 401
        
        folders = get_user_data_folder(user_id)
        file_path = os.path.join(folders['uploads'], filename)
        
        if not os.path.exists(file_path):
            return jsonify({
                'success': False,
                'error': 'File not found'
            }), 404
        
        # Get file extension
        file_ext = os.path.splitext(filename)[1].lower()
        
        # For DOC/DOCX files that browsers can't display directly,
        # use Office Online Viewer (Microsoft's free viewer)
        if file_ext in ['.doc', '.docx']:
            # Construct the full URL to the document
            # Note: The file must be publicly accessible for Office Online Viewer to work
            # For local development, we'll serve it inline with a note
            
            # For production with public URLs, use:
            # file_url = request.url_root + 'api/documents/' + filename + '/download'
            # viewer_url = f"https://view.officeapps.live.com/op/embed.aspx?src={file_url}"
            
            # For local/private files, just send the file and let the browser handle it
            # The client will show a download option
            return send_file(file_path, 
                           mimetype='application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                           as_attachment=False)
        
        # For PDF, TXT, HTML, etc. - serve inline
        return send_file(file_path, as_attachment=False)
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/transcribe', methods=['POST'])
def transcribe():
    """
    Translate audio to English text using OpenAI Whisper Translation API
    Automatically detects Tamil/other languages and translates to English
    """
    try:
        # Check if audio file is present
        if 'audio' not in request.files:
            return jsonify({
                'success': False,
                'error': 'No audio file provided',
                'user_message': 'No audio recorded. Please try again.'
            }), 400

        audio_file = request.files['audio']

        if audio_file.filename == '':
            return jsonify({
                'success': False,
                'error': 'No audio file selected',
                'user_message': 'No audio recorded. Please try again.'
            }), 400

        # Read the file content
        audio_content = audio_file.read()

        # Check if audio is too short (less than 100 bytes is likely invalid)
        if len(audio_content) < 100:
            return jsonify({
                'success': False,
                'error': 'Audio file too short',
                'user_message': 'Recording too short. Please hold the button longer and speak clearly.'
            }), 400

        # Create a file-like object with proper filename
        from io import BytesIO
        audio_buffer = BytesIO(audio_content)
        audio_buffer.name = 'recording.webm'

        # Use Whisper Translation API to translate Tamil speech to English
        # This will automatically detect Tamil/other languages and translate to English
        translation = openai_client.audio.translations.create(
            model="whisper-1",
            file=audio_buffer,
            response_format="verbose_json"  # Get language detection info
        )

        return jsonify({
            'success': True,
            'text': translation.text,
            'language': translation.language,
            'duration': translation.duration
        })

    except Exception as e:
        error_message = str(e)
        user_message = 'Voice recognition failed. Please try again.'

        # Provide user-friendly messages for common errors
        if 'Invalid file format' in error_message:
            user_message = 'Recording format not supported. Please try again.'
        elif 'too short' in error_message.lower():
            user_message = 'Recording too short. Please hold the button longer and speak clearly.'
        elif 'no speech' in error_message.lower():
            user_message = 'No speech detected. Please speak louder and try again.'

        return jsonify({
            'success': False,
            'error': error_message,
            'user_message': user_message
        }), 500


@app.route('/api/translate', methods=['POST'])
def translate_text():
    """Translate text using OpenAI"""
    try:
        data = request.json
        text = data.get('text', '')
        source_lang = data.get('source_lang', 'auto')
        target_lang = data.get('target_lang', 'en')
        
        if not text:
            return jsonify({
                'success': False,
                'error': 'No text provided'
            }), 400
        
        # Use OpenAI to translate
        response = openai_client.chat.completions.create(
            model=config.CHAT_MODEL,
            messages=[
                {"role": "system", "content": f"You are a translator. Translate the following text to {target_lang}. Only return the translation, nothing else."},
                {"role": "user", "content": text}
            ],
            temperature=0.3,
            max_tokens=500
        )
        
        translated_text = response.choices[0].message.content
        
        return jsonify({
            'success': True,
            'translated_text': translated_text,
            'original_text': text
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/search', methods=['POST'])
def search():
    """Search for documents"""
    try:
        # Get user from token
        user_id, error = get_user_from_token()
        if error:
            return jsonify({'success': False, 'error': error}), 401
        
        # Get user-specific search engine
        search_engine = get_user_search_engine(user_id)
        
        data = request.json
        query = data.get('query', '')
        top_k = data.get('top_k', config.DEFAULT_TOP_K)
        threshold = data.get('threshold', config.SIMILARITY_THRESHOLD)
        
        if not query:
            return jsonify({
                'success': False,
                'error': 'Query is required'
            }), 400
        
        # Execute search
        results = search_engine.search(
            query, 
            top_k=top_k,
            threshold=threshold
        )
        
        return jsonify({
            'success': True,
            'results': results,
            'count': len(results),
            'query': query
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/summary', methods=['POST'])
def summary():
    """Generate AI summary of search results"""
    try:
        data = request.json
        query = data.get('query', '')
        results = data.get('results', [])
        
        if not results:
            return jsonify({
                'success': False,
                'error': 'No results to summarize'
            }), 400
        
        # Generate summary using OpenAI
        summary_text = generate_document_summary(query, results)
        
        return jsonify({
            'success': True,
            'summary': summary_text
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/stats', methods=['GET'])
def stats():
    """Get statistics"""
    try:
        # Get user from token
        user_id, error = get_user_from_token()
        if error:
            return jsonify({'success': False, 'error': error}), 401
        
        # Get user-specific search engine
        search_engine = get_user_search_engine(user_id)
        document_count = search_engine.get_document_count()
        
        return jsonify({
            'success': True,
            'stats': {
                'total_documents': document_count
            }
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/refresh', methods=['POST'])
def refresh():
    """Refresh the search index"""
    try:
        # Get user from token
        user_id, error = get_user_from_token()
        if error:
            return jsonify({'success': False, 'error': error}), 401
        
        # Get user-specific search engine
        search_engine = get_user_search_engine(user_id)
        result = search_engine.rebuild_index()
        
        if result['success']:
            return jsonify({
                'success': True,
                'message': f"Index refreshed: {result['count']} documents indexed"
            })
        else:
            return jsonify(result), 500
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


def generate_document_summary(query: str, results: list) -> str:
    """Generate AI summary of document search results"""
    try:
        # Build prompt
        system_prompt = """You are a helpful assistant that explains document search results clearly.
CRITICAL RULES:
1. For each matching document, explain WHAT MATCHES the query and WHAT DOESN'T
2. Never mention similarity scores or percentages to users
3. Use exact information from the document excerpts
4. Keep summaries factual and concise"""
        
        # Build document summaries
        doc_summaries = []
        for i, doc in enumerate(results[:5], 1):  # Top 5 results
            filename = doc.get('filename', 'Unknown')
            excerpt = doc.get('text_excerpt', '')[:300]  # First 300 chars
            
            doc_summaries.append(f"Document {i}: {filename}\nExcerpt: {excerpt}...\n")
        
        user_prompt = f"""User's search query: "{query}"

Here are the {len(doc_summaries)} most relevant documents:

{''.join(doc_summaries)}

Provide a clear summary:
1. For the TOP 2-3 documents, explain:
   - What content MATCHES the query
   - What aspects of the query are NOT covered
2. List the filenames of relevant documents
3. Keep it under 200 words

Format: Start with "Here are your best matches:" then use natural paragraphs."""
        
        # Call OpenAI
        response = openai_client.chat.completions.create(
            model=config.CHAT_MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.3,
            max_tokens=400
        )
        
        return response.choices[0].message.content
        
    except Exception as e:
        print(f"Error generating summary: {e}")
        return "Unable to generate summary at this time."


if __name__ == '__main__':
    app.run(
        host=config.API_HOST,
        port=config.API_PORT,
        debug=config.API_DEBUG
    )
