# Vendor Search Architecture

## Overview
The vendor search system uses a **separation of concerns** architecture where MongoDB stores vendor information and Flask db_search handles AI embeddings and semantic search.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER WORKFLOW                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  1. Vendor Management (React) → CRUD Operations                  │
│     └─> Node.js API (5003) → MongoDB (vendors collection)        │
│                                                                   │
│  2. Create/Update/Delete Vendor                                  │
│     └─> Triggers Flask /api/refresh                              │
│                                                                   │
│  3. Flask db_search (5002)                                       │
│     ├─> Loads vendors from MongoDB (info only)                   │
│     ├─> Generates embeddings using OpenAI                        │
│     └─> Caches embeddings locally per-user                       │
│                                                                   │
│  4. Vendor DB Search (React iframe)                              │
│     └─> Flask db_search semantic search                          │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow

### 1. Vendor Information Storage (MongoDB)
**Location:** MongoDB database `netkathir_ai_tool` → `vendors` collection

**Stored Fields:**
- `userId` - Owner of the vendor (ObjectId)
- `transportName` - Transport company name
- `name` - Contact person name
- `city`, `state` - Location
- `vehicleType` - Type of vehicle
- `whatsappNumber`, `alternateNumber` - Contact info
- `notes` - Array of timestamped comments
- ... (all other vendor fields)

**What MongoDB DOES NOT store:**
- ❌ `embedding` field (removed)
- ❌ `embeddingModel` field (removed)
- Flask generates its own embeddings

### 2. Embedding Storage (Flask Local Cache)
**Location:** `db_search/data/users/{userId}/embeddings/vendor_embeddings.pkl`

**What's Stored:**
- OpenAI embeddings for all vendor fields (3072-dimensional vectors)
- Metadata for quick retrieval
- Vendor IDs for matching with MongoDB

**Generation:**
- Flask loads vendors from MongoDB
- Combines all searchable fields into text
- Generates embeddings using `text-embedding-3-large` model
- Caches locally per user

### 3. Search Flow
```
User Query → Flask db_search
    ↓
Generate query embedding
    ↓
Load cached vendor embeddings (from pickle file)
    ↓
Calculate cosine similarity
    ↓
Apply keyword boosting
    ↓
Filter by threshold
    ↓
Return top results
```

## Component Responsibilities

### Node.js API Server (port 5003)
**File:** `server/routes/vendors.js`

**Responsibilities:**
- ✅ Vendor CRUD operations (Create, Read, Update, Delete)
- ✅ Store vendor info in MongoDB
- ✅ Import/Export Excel files
- ✅ User authentication

**What it DOES NOT do:**
- ❌ Generate embeddings
- ❌ Store embeddings in MongoDB
- ❌ Perform semantic search

### Flask db_search Service (port 5002)
**Files:**
- `db_search/api.py` - Flask routes
- `db_search/utils/data_loader.py` - MongoDB connection
- `db_search/core/query_engine.py` - Search logic
- `db_search/core/embeddings.py` - OpenAI embedding generation

**Responsibilities:**
- ✅ Load vendor info from MongoDB (filtered by userId)
- ✅ Generate embeddings using OpenAI API
- ✅ Cache embeddings locally per user
- ✅ Semantic search with cosine similarity
- ✅ Auto-refresh when vendors are updated

**Storage Location:**
- `db_search/data/users/{userId}/embeddings/vendor_embeddings.pkl`

### React Client (port 3000)
**Files:**
- `client/src/pages/VendorManagement.js` - Vendor CRUD UI
- `client/src/services/vendorService.js` - API calls

**Responsibilities:**
- ✅ Vendor management UI
- ✅ Trigger Flask refresh after vendor changes
- ✅ Embed Flask search iframe

**What it DOES NOT do:**
- ❌ Generate embeddings (removed button)
- ❌ Call `/api/vendors/generate-embeddings` (endpoint removed)

## Cache Refresh Strategy

### Automatic Refresh
When vendors are created/updated/deleted, the client automatically calls:
```javascript
await fetch(`http://localhost:5002/api/refresh?token=${token}`, {
  method: 'POST'
});
```

This triggers Flask to:
1. Load latest vendors from MongoDB
2. Check if cache is stale
3. Regenerate embeddings if needed
4. Save updated cache

### Manual Refresh
Users can also refresh manually in the Flask search UI.

## Per-User Data Isolation

### MongoDB Query
```javascript
// Node.js
{ userId: ObjectId(req.userId) }
```

### Flask Query
```python
# Flask db_search
query = {'userId': ObjectId(user_id)}
vendors = list(vendors_collection.find(query, {'embedding': 0}))
```

### Cache Storage
```
db_search/data/users/
├── 693821ea08471d4b99efad7e/
│   └── embeddings/
│       └── vendor_embeddings.pkl
├── 507f1f77bcf86cd799439011/
│   └── embeddings/
│       └── vendor_embeddings.pkl
└── ...
```

## Configuration

### MongoDB Connection
**Environment Variable:** `MONGODB_URI`
**Format:** `mongodb://localhost:27017/netkathir_ai_tool`
**Database:** `netkathir_ai_tool`
**Collection:** `vendors`

### Flask Config
**File:** `db_search/config.py`

```python
DATA_TYPE = "mongodb"  # DO NOT CHANGE
EMBEDDING_MODEL = "text-embedding-3-large"
EMBEDDINGS_CACHE_PATH = "data/embeddings/cache_mongodb.pkl"  # Fallback
# Actual path: data/users/{userId}/embeddings/vendor_embeddings.pkl
```

### OpenAI API
**Environment Variable:** `OPENAI_API_KEY`
**Model:** `text-embedding-3-large` (3072 dimensions)

## Benefits of This Architecture

### ✅ Separation of Concerns
- MongoDB = Source of truth for vendor data
- Flask = AI embeddings and search engine
- Node.js = CRUD operations and business logic

### ✅ Per-User Privacy
- Each user's embeddings stored separately
- MongoDB queries filtered by userId
- No data leakage between users

### ✅ Cost Optimization
- Embeddings cached locally (pickle files)
- Only regenerate when vendors change
- No duplicate embeddings in MongoDB

### ✅ Flexibility
- Can switch embedding models easily
- Can clear/rebuild embeddings without affecting MongoDB
- Flask can use different embedding strategies per user

### ✅ Performance
- Fast semantic search with cached embeddings
- Efficient MongoDB queries (indexed by userId)
- No API calls for cached results

## Migration Notes

### What Changed
1. ❌ Removed `embedding` field from MongoDB Vendor schema
2. ❌ Removed `embeddingModel` field from MongoDB Vendor schema
3. ❌ Removed `/api/vendors/generate-embeddings` Node.js endpoint
4. ❌ Removed `/api/vendors/search/ai` Node.js endpoint
5. ❌ Removed "Generate AI Embeddings" button from UI
6. ✅ Flask now generates and manages all embeddings
7. ✅ Embeddings stored in per-user local cache files

### Existing Data
- Old vendors in MongoDB may have `embedding` fields (ignored by Flask)
- Flask will generate fresh embeddings on first search
- No data migration needed

## Troubleshooting

### "No vendors found" in search
**Cause:** Flask cache not initialized
**Solution:** 
1. Go to Vendor Management
2. Create/edit a vendor (triggers auto-refresh)
3. Or manually click refresh in Flask search UI

### "PostgreSQL connection error"
**Cause:** Old config still referencing PostgreSQL
**Solution:** Verify `db_search/config.py` has `DATA_TYPE = "mongodb"`

### "MongoDB connection error"
**Cause:** MONGODB_URI not set or MongoDB not running
**Solution:**
1. Check `.env` file has `MONGODB_URI=mongodb://localhost:27017/netkathir_ai_tool`
2. Start MongoDB: `brew services start mongodb-community`

### Embeddings not updating
**Cause:** Flask cache not refreshing
**Solution:**
1. Check browser console for refresh errors
2. Verify Flask service is running on port 5002
3. Check Flask logs for errors
4. Delete cache manually: `rm -rf db_search/data/users/{userId}/embeddings/`

## Testing Steps

1. **Create a vendor** in Vendor Management
2. **Check Flask logs** - should see "Loading vendors from MongoDB"
3. **Go to Vendor DB Search** page
4. **Search for the vendor** - should appear in results
5. **Update the vendor** in Vendor Management
6. **Search again** - changes should reflect immediately
7. **Delete the vendor** - should disappear from search

## Files Modified

### Backend
- `db_search/config.py` - Updated comments, clarified MongoDB-only
- `db_search/utils/data_loader.py` - Load without embeddings, convert ObjectId
- `server/models/Vendor.js` - Removed embedding fields
- `server/routes/vendors.js` - Removed embedding endpoints

### Frontend
- `client/src/services/vendorService.js` - Removed embedding functions
- `client/src/pages/VendorManagement.js` - Removed embedding button

### Documentation
- `docs/VENDOR_SEARCH_ARCHITECTURE.md` - This file
