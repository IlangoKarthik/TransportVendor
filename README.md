# Netkathir AI Tool - Complete Integration Guide

## 🎯 Architecture Overview

This project uses a **microservices architecture** where specialized services handle different features:

```
┌─────────────────────────────────────────────────────────────┐
│                    User Browser                              │
│                 http://localhost:3000                        │
└──────────────────┬──────────────────────────────────────────┘
                   │
         ┌─────────┴─────────────────────────┐
         │                                    │
         │   React Frontend (Port 3000)      │
         │   - Authentication Pages          │
         │   - Home Dashboard                │
         │   - Iframe embeds for:            │
         │     • Document Search (5001)      │
         │     • Document Upload (5001)      │
         │     • Vendor Search (5002)        │
         │   - Vendor Management (native)    │
         │                                    │
         └─────────┬──────────────────────────┘
                   │
    ┌──────────────┼──────────────┬──────────────────┐
    │              │              │                  │
┌───▼──────┐ ┌────▼──────┐ ┌─────▼──────┐ ┌────────▼────────┐
│ Node.js  │ │  Flask    │ │  Flask     │ │   MongoDB       │
│ Server   │ │ Document  │ │  Vendor    │ │   Database      │
│ (5003)   │ │  Search   │ │  Search    │ │   (27017)       │
│          │ │  (5001)   │ │  (5002)    │ │                 │
│ - Auth   │ │           │ │            │ │ - Users         │
│ - CRUD   │ │ - Voice   │ │ - Voice    │ │ - Vendors       │
│ - Vendor │ │ - Upload  │ │ - Filters  │ │ - Documents     │
│   Mgmt   │ │ - Search  │ │ - AI       │ │ - OTPs          │
└──────────┘ └───────────┘ └────────────┘ └─────────────────┘
```

## 🚀 Quick Start

### Prerequisites

1. **MongoDB** - Install and run:
   ```bash
   brew tap mongodb/brew
   brew install mongodb-community@7.0
   brew services start mongodb-community@7.0
   ```

2. **Node.js & npm** (v18+)

3. **Python 3** (v3.8+)

### Installation

```bash
# 1. Install all Node.js dependencies
npm run install-all

# 2. Install Python dependencies for Flask services
pip3 install -r document_search/requirements.txt
pip3 install -r db_search/requirements.txt

# 3. Configure environment variables
# Edit .env file with your API keys and settings
```

### Running the Application

**ONE COMMAND TO START EVERYTHING:**

```bash
npm start
```

This starts:
- ✅ Flask Document Search Service (Port 5001)
- ✅ Flask Vendor Search Service (Port 5002)
- ✅ Node.js Backend API (Port 5003)
- ✅ React Frontend (Port 3000)

Then open: **http://localhost:3000**

### Individual Service Management

```bash
# Start Flask services only
./start-flask-services.sh

# Stop Flask services
./stop-flask-services.sh

# Start Node.js server only
cd server && npm start

# Start React frontend only
cd client && npm start
```

## 📁 Project Structure

```
file_search_ai_tool/
├── client/                      # React Frontend (Port 3000)
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Login.js        # Auth pages
│   │   │   ├── Signup.js
│   │   │   ├── Home.js         # Dashboard with 4 cards
│   │   │   ├── DocumentSearch.js   # Iframe → Flask (5001)
│   │   │   ├── DocumentUpload.js   # Iframe → Flask (5001/upload)
│   │   │   ├── VendorSearch.js     # Iframe → Flask (5002)
│   │   │   └── VendorManagement.js # Native React CRUD
│   │   ├── services/
│   │   │   ├── api.js          # Axios setup
│   │   │   ├── documentService.js  # Not used (iframes instead)
│   │   │   └── vendorService.js    # For management only
│   │   └── App.js              # React Router
│   └── package.json
│
├── server/                      # Node.js Express Backend (Port 5003)
│   ├── routes/
│   │   ├── auth.js             # /api/auth/* - Login, signup, OTP
│   │   ├── vendors.js          # /api/vendors/* - CRUD + Excel import/export
│   │   └── documents.js        # /api/documents/* - Not used (Flask handles it)
│   ├── models/
│   │   ├── User.js
│   │   ├── Vendor.js
│   │   ├── Document.js
│   │   └── OTP.js
│   ├── middleware/
│   │   └── auth.js             # JWT verification
│   └── index.js                # Main server file
│
├── document_search/             # Flask Document Service (Port 5001)
│   ├── api.py                  # Flask app with ALL features
│   ├── config.py               # Configuration
│   ├── core/
│   │   ├── document_search.py  # Search engine
│   │   ├── embeddings.py       # OpenAI embeddings
│   │   └── file_vector_store.py
│   ├── templates/
│   │   ├── index.html          # Search UI with voice
│   │   └── upload.html         # Upload UI with drag-drop
│   ├── static/
│   │   ├── styles.css          # Beautiful styling
│   │   └── icons/              # UI icons
│   └── utils/
│       └── file_parsers.py     # PDF, DOCX parsers
│
├── db_search/                   # Flask Vendor Search (Port 5002)
│   ├── api.py                  # Flask app with ALL features
│   ├── config.py               # Vendor field configuration
│   ├── core/
│   │   ├── query_engine.py     # Semantic search
│   │   ├── embeddings.py
│   │   ├── response_generator.py
│   │   └── vector_store.py
│   ├── templates/
│   │   └── index.html          # Search UI with voice + filters
│   ├── static/
│   │   ├── styles.css
│   │   └── icons/
│   └── utils/
│       ├── data_loader.py      # MongoDB data loading
│       └── text_processor.py
│
├── package.json                # Root - runs all services
├── start-flask-services.sh     # Start both Flask apps
├── stop-flask-services.sh      # Stop Flask apps
├── .env                        # Environment variables
└── README.md
```

## 🔑 Key Features by Service

### Flask Document Search (Port 5001)
- ✅ **Voice Recording** with visual feedback
- ✅ **Whisper Transcription** (supports Tamil → English)
- ✅ **File Upload** (PDF, DOCX, TXT) with drag-drop
- ✅ **Semantic Search** using OpenAI embeddings
- ✅ **Document Viewer** modal
- ✅ **AI Summary Generation**
- ✅ **Refresh Embeddings** button
- ✅ **Advanced Filters** (threshold, max results)
- ✅ **Statistics Dashboard**

### Flask Vendor Search (Port 5002)
- ✅ **Voice Recording** with visualization
- ✅ **Whisper Transcription**
- ✅ **Semantic Search** across vendor database
- ✅ **Advanced Filters** (city, state, vehicle type, etc.)
- ✅ **Multiple Response Formats** (AI summary, cards, table)
- ✅ **AI-Generated Insights**
- ✅ **Refresh Embeddings** from MongoDB
- ✅ **Statistics Dashboard**

### Node.js Backend (Port 5003)
- ✅ **JWT Authentication**
- ✅ **OTP Email Verification** (SMTP)
- ✅ **Vendor CRUD Operations**
- ✅ **Excel Import/Export** for vendors
- ✅ **Per-User Data Isolation**

### React Frontend (Port 3000)
- ✅ **Modern SPA** with React Router
- ✅ **Email/UserId Login**
- ✅ **OTP Verification**
- ✅ **Dashboard** with 4 feature cards
- ✅ **Iframe Embedding** of Flask UIs
- ✅ **Vendor Management** (native React with full CRUD)

## 🔌 API Endpoints

### Node.js Backend (http://localhost:5003)

**Authentication:**
- `POST /api/auth/signup` - Create account
- `POST /api/auth/verify-otp` - Verify OTP
- `POST /api/auth/login` - Login
- `POST /api/auth/forgot-password` - Password reset
- `POST /api/auth/reset-password` - Set new password

**Vendors:**
- `GET /api/vendors` - List all vendors
- `POST /api/vendors` - Create vendor
- `PUT /api/vendors/:id` - Update vendor
- `DELETE /api/vendors/:id` - Delete vendor
- `POST /api/vendors/import` - Import from Excel
- `GET /api/vendors/export` - Export to Excel

### Flask Document Search (http://localhost:5001)

- `GET /` - Search UI
- `GET /upload` - Upload UI
- `POST /api/upload` - Upload files
- `POST /api/search` - Search documents
- `POST /api/transcribe` - Transcribe audio (Whisper)
- `POST /api/refresh` - Rebuild embeddings
- `POST /api/ai-summary` - Generate AI summary
- `GET /api/stats` - Get statistics
- `GET /api/documents` - List documents
- `GET /api/documents/:id/view` - View document
- `DELETE /api/documents/:id` - Delete document

### Flask Vendor Search (http://localhost:5002)

- `GET /` - Search UI
- `POST /api/search` - Search vendors
- `POST /api/transcribe` - Transcribe audio (Whisper)
- `POST /api/refresh` - Rebuild embeddings from MongoDB
- `POST /api/ai-summary` - Generate AI insights
- `GET /api/stats` - Get statistics

## ⚙️ Configuration

### Environment Variables (.env)

```bash
# Node.js Server
PORT=5003
NODE_ENV=development
CLIENT_URL=http://localhost:3000

# MongoDB
MONGODB_URI=mongodb://localhost:27017/netkathir

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# OpenAI (for both Node.js and Flask)
OPENAI_API_KEY=sk-your-openai-api-key-here

# SMTP Email (for OTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-specific-password
SMTP_FROM=your-email@gmail.com

# File Upload
MAX_FILE_SIZE=10485760
ALLOWED_EXTENSIONS=.pdf,.docx,.doc,.txt,.md
```

### Flask Configuration Files

**document_search/config.py** - Document search settings
**db_search/config.py** - Vendor search field mappings

## 🐳 Docker Deployment

Coming soon - Docker Compose configuration for all services.

## 🛠️ Development Workflow

1. **Start all services**: `npm start`
2. **Access React app**: http://localhost:3000
3. **Check Flask services**:
   - Document Search: http://localhost:5001
   - Vendor Search: http://localhost:5002
4. **Check Node.js API**: http://localhost:5003/api/health
5. **View logs**: `logs/document_search.log`, `logs/vendor_search.log`

## 📝 User Flow

1. **User visits** → http://localhost:3000
2. **Signup/Login** → Node.js handles auth + JWT
3. **Home Page** → Shows 4 cards
4. **Click "Document Search"** → React page with iframe to Flask (5001)
   - Full Flask UI with voice search, upload, etc.
5. **Click "Document Upload"** → React page with iframe to Flask (5001/upload)
   - Drag-drop file upload interface
6. **Click "Vendor Search"** → React page with iframe to Flask (5002)
   - Voice-enabled vendor search with filters
7. **Click "Vendor Management"** → Native React page
   - Full CRUD, Excel import/export via Node.js API

## 🎨 Why This Architecture?

1. **Preserves ALL Features** - Flask apps have voice search, transcription, advanced UIs
2. **Best of Both Worlds** - React for navigation, Flask for feature-rich search UIs
3. **Separation of Concerns** - Each service handles what it does best
4. **Docker-Friendly** - Each service can be containerized independently
5. **Scalable** - Services can be deployed on different servers if needed
6. **Development Ease** - Work on Flask/React independently

## 🚨 Troubleshooting

**Flask services not starting:**
```bash
# Check if ports are free
lsof -i :5001
lsof -i :5002

# Check Python installation
python3 --version
pip3 list | grep -i flask

# Check logs
tail -f logs/document_search.log
tail -f logs/vendor_search.log
```

**React can't connect to Flask:**
- Ensure Flask services are running: `./start-flask-services.sh`
- Check browser console for CORS errors
- Verify Flask CORS is enabled in `api.py`

**MongoDB connection failed:**
```bash
# Check MongoDB is running
brew services list | grep mongodb

# Start MongoDB
brew services start mongodb-community@7.0

# Test connection
mongosh
```

## 📊 Performance

- **Document Search**: ~200-500ms per query (depends on doc count)
- **Vendor Search**: ~100-300ms per query
- **Voice Transcription**: ~2-5 seconds (Whisper API)
- **File Upload**: Depends on file size, processes in background

## 🔒 Security

- ✅ JWT tokens with 7-day expiration
- ✅ Password hashing with bcrypt
- ✅ OTP verification via email
- ✅ Per-user data isolation in MongoDB
- ✅ CORS protection on all services
- ✅ Helmet.js security headers on Node.js
- ✅ File upload validation and sanitization

## 📦 Dependencies

**Node.js:**
- express, cors, helmet, mongoose
- jsonwebtoken, bcrypt, nodemailer
- multer, pdf-parse, mammoth, openai

**Python:**
- flask, flask-cors
- openai, numpy, pymongo
- pypdf, python-docx

## 👨‍💻 Development Team Notes

- **Flask apps** (`document_search/`, `db_search/`) are COMPLETE - don't modify lightly
- **React pages** act as shell/navigation - use iframes for Flask UIs
- **Node.js** handles auth, vendor CRUD, and serves React in production
- **All three** services access same MongoDB database
- **Voice search** and **Whisper** only in Flask apps (complex audio handling)

## 🎯 Future Enhancements

- [ ] Add authentication to Flask apps (JWT tokens passed from React)
- [ ] Docker Compose configuration
- [ ] Kubernetes deployment configs
- [ ] Redis caching for embeddings
- [ ] WebSocket for real-time updates
- [ ] Mobile app (React Native)

---

**Version**: 2.0.0  
**Last Updated**: December 2025  
**License**: Proprietary
