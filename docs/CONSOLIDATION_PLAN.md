# Single-Server Consolidation Plan
## Netkathir AI Tool - Docker-Ready Architecture

### Current Problem
- Multiple servers running on different ports (5003, 5001, 5002, 3000)
- CORS issues between frontend and backend
- Complex deployment with 4 separate processes
- Not Docker-friendly

### Target Architecture
**Single Node.js server on ONE port with:**
- Express.js backend handling all API routes
- Static React build served from same server
- Python AI services called as subprocess/modules
- Everything in one Docker container

---

## Implementation Plan

### Phase 1: Fix Immediate CORS Issue (Quick Fix)
1. Add CLIENT_URL to .env
2. Update CORS configuration
3. Allow localhost:3000 for development

### Phase 2: Create Single-Server Architecture
1. **Server Structure:**
   ```
   server/
   ├── index.js              # Main server
   ├── routes/
   │   ├── auth.js           # Authentication routes
   │   ├── vendors.js        # Vendor CRUD
   │   ├── documents.js      # Document upload/management
   │   ├── search.js         # NEW: Document AI search proxy
   │   └── vendorSearch.js   # NEW: Vendor AI search proxy
   ├── python/               # NEW: Python services
   │   ├── document_search.py
   │   └── vendor_search.py
   └── public/               # NEW: Built React app
   ```

2. **Port Consolidation:**
   - Development: Port 3000 (all services)
   - Production: Port 80/443 (single Docker container)

3. **Python Integration:**
   - Option A: Child process execution (simpler, recommended)
   - Option B: Python HTTP server as internal service
   - We'll use Option A for simplicity

### Phase 3: Build React as Static Files
1. Build React app: `npm run build`
2. Serve from Express: `app.use(express.static('client/build'))`
3. All API routes: `/api/*`
4. All other routes: Serve React app (SPA fallback)

### Phase 4: Docker Configuration
1. Single Dockerfile
2. Multi-stage build (Node + Python)
3. docker-compose for MongoDB + App

---

## File Changes Required

### 1. Server Changes
- **server/index.js**: Add static file serving, Python proxy routes
- **server/routes/search.js**: NEW - Proxy to Python document search
- **server/routes/vendorSearch.js**: NEW - Proxy to Python vendor search
- **server/python/**: NEW - Python scripts as callable modules

### 2. Frontend Changes
- **package.json**: Add proxy for development
- **API calls**: Update to use relative paths `/api/*`
- **Build**: Configure for production build

### 3. Python Changes
- **Convert Flask APIs to callable Python functions**
- **Create wrapper scripts that can be called from Node.js**
- **Return JSON responses via stdout**

### 4. Docker Files
- **Dockerfile**: Multi-stage build
- **docker-compose.yml**: App + MongoDB
- **.dockerignore**: Exclude unnecessary files

---

## Implementation Steps

### Step 1: Quick CORS Fix (Immediate)
✅ Add CLIENT_URL=http://localhost:3000 to .env
✅ Update server CORS config
✅ Test signup again

### Step 2: Create Python Wrapper Scripts
- Extract core Python logic from Flask apps
- Create standalone Python scripts
- Test Node.js -> Python execution

### Step 3: Add Search Routes to Node.js
- Create /api/documents/search route
- Create /api/vendors/search route
- Execute Python scripts and return results

### Step 4: Update Frontend
- Change API base URL to relative paths
- Add proxy in package.json for development
- Build and test production build

### Step 5: Static Serving
- Configure Express to serve React build
- Add SPA fallback for client-side routing
- Test all routes

### Step 6: Docker Configuration
- Create Dockerfile with Node + Python
- Create docker-compose.yml
- Test Docker build and run

### Step 7: Testing
- Test all authentication flows
- Test document upload and search
- Test vendor management and search
- Verify Docker deployment

---

## Benefits of Single-Server Architecture

1. **Simpler Deployment**: One container, one port
2. **No CORS Issues**: Same origin for frontend and backend
3. **Docker-Friendly**: Easy to containerize and scale
4. **Cost-Effective**: Single server instance needed
5. **Easier Maintenance**: One codebase, one deployment
6. **Better Performance**: No cross-origin requests

---

## Port Structure

### Development
- Port 3000: Node.js server with React dev proxy
- MongoDB: localhost:27017

### Production (Docker)
- Port 80/443: Node.js server with static React build
- MongoDB: mongodb:27017 (Docker network)

---

## Timeline
- Phase 1 (CORS Fix): 5 minutes ✅
- Phase 2 (Python Wrappers): 30 minutes
- Phase 3 (Node Routes): 20 minutes
- Phase 4 (Frontend Update): 15 minutes
- Phase 5 (Static Serving): 10 minutes
- Phase 6 (Docker): 20 minutes
- Phase 7 (Testing): 20 minutes

**Total: ~2 hours**

---

Let's begin implementation now.
