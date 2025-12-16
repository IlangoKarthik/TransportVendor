# Docker Deployment Guide
## Netkathir AI Tool - Single Server Architecture

---

## 🎯 What Changed?

### Before (Multiple Servers)
```
❌ Auth Server:      Port 5003
❌ Document Search:  Port 5001
❌ Vendor DB Search: Port 5002
❌ React Frontend:   Port 3000
❌ CORS issues between services
❌ Complex deployment (4 processes)
❌ Not Docker-friendly
```

### After (Single Server)
```
✅ ONE Node.js server: Port 80 (production) / 5003 (development)
✅ React build served as static files
✅ Python AI services called via subprocess
✅ No CORS issues (same origin)
✅ Simple deployment (1 container)
✅ Docker-ready
```

---

## 🏗️ New Architecture

```
┌─────────────────────────────────────────┐
│   Docker Container (Port 80)            │
│                                          │
│  ┌────────────────────────────────────┐ │
│  │  Node.js Express Server             │ │
│  │  - Serves React App (/)             │ │
│  │  - Auth API (/api/auth/*)           │ │
│  │  - Vendor CRUD (/api/vendors/*)     │ │
│  │  - Document CRUD (/api/documents/*) │ │
│  │  - Search Proxy (/api/search/*)     │ │
│  └────────────────────────────────────┘ │
│           │                               │
│           ├─→ Python Document Search     │
│           └─→ Python Vendor Search       │
│                                          │
└─────────────────────────────────────────┘
         │
         ├─→ MongoDB Container (Port 27017)
         └─→ Volume: app_data
```

---

## 🚀 Quick Start

### Development (Current Setup)
```bash
# Start services
cd server && npm start &
cd ../client && npm start &

# Access app
open http://localhost:3000
```

### Production (Docker)
```bash
# 1. Copy environment file
cp .env.docker.example .env.docker

# 2. Edit .env.docker with your values
nano .env.docker

# 3. Build and start
docker-compose up -d

# 4. Access app
open http://localhost
```

---

## 📦 Docker Commands

### Build and Run
```bash
# Build the Docker image
docker-compose build

# Start all services
docker-compose up -d

# View logs
docker-compose logs -f app

# Stop all services
docker-compose down

# Stop and remove volumes (CAUTION: deletes data)
docker-compose down -v
```

### Checking Status
```bash
# Check running containers
docker-compose ps

# Check app health
curl http://localhost/api/health

# Enter container shell
docker-compose exec app /bin/bash

# View MongoDB logs
docker-compose logs mongodb
```

### Database Operations
```bash
# Connect to MongoDB
docker-compose exec mongodb mongosh

# Backup database
docker-compose exec mongodb mongodump --out /data/backup

# Restore database
docker-compose exec mongodb mongorestore /data/backup
```

---

## 🔧 Configuration

### Environment Variables (.env.docker)

**Required:**
- `JWT_SECRET` - Secret key for JWT tokens (MUST CHANGE!)
- `OPENAI_API_KEY` - OpenAI API key for AI features
- `SMTP_USER` - Email for sending OTPs
- `SMTP_PASS` - Email password/app password

**Optional:**
- `SMTP_HOST` - SMTP server (default: smtp.gmail.com)
- `SMTP_PORT` - SMTP port (default: 587)
- `EMAIL_FROM` - From email address

### Port Configuration

**Development:**
- Frontend: http://localhost:3000
- Backend: http://localhost:5003
- MongoDB: localhost:27017

**Production (Docker):**
- Application: http://localhost:80
- MongoDB: mongodb:27017 (internal)

---

## 📝 API Endpoints

All endpoints are now under ONE server:

### Authentication
- `POST /api/auth/signup` - Create account with OTP
- `POST /api/auth/verify-otp` - Verify email with OTP
- `POST /api/auth/login` - Login
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password with OTP

### Vendors
- `GET /api/vendors` - List vendors
- `POST /api/vendors` - Create vendor
- `PUT /api/vendors/:id` - Update vendor
- `DELETE /api/vendors/:id` - Delete vendor
- `POST /api/vendors/import` - Import from Excel
- `GET /api/vendors/export/excel` - Export to Excel

### Documents
- `POST /api/documents/upload` - Upload documents
- `GET /api/documents` - List documents
- `GET /api/documents/:id/view` - View document
- `GET /api/documents/:id/download` - Download document
- `DELETE /api/documents/:id` - Delete document

### AI Search (NEW)
- `POST /api/search/documents` - Search documents with AI
- `POST /api/search/vendors` - Search vendors with AI
- `GET /api/search/vendors/stats` - Get vendor statistics

---

## 🧪 Testing

### Test CORS Fix
```bash
# From browser console on http://localhost:3000
fetch('http://localhost:5003/api/health')
  .then(r => r.json())
  .then(console.log);
// Should work without CORS errors
```

### Test Python Integration
```bash
# Test document search script
echo '{"action":"search","userId":"test123","query":"machine learning"}' | \
  python3 server/python/document_search.py

# Test vendor search script
echo '{"action":"stats","userId":"test123"}' | \
  python3 server/python/vendor_search.py
```

### Test Docker Build
```bash
# Build without cache
docker-compose build --no-cache

# Test run
docker-compose up

# Check logs
docker-compose logs -f
```

---

## 🔍 Troubleshooting

### CORS Errors
**Problem:** "Origin http://localhost:3000 is not allowed"  
**Solution:** ✅ FIXED - CORS now allows localhost:3000 in development

### Docker Build Fails
**Problem:** Python packages fail to install  
**Solution:** Check internet connection, try `--no-cache` flag

### MongoDB Connection Error
**Problem:** Can't connect to MongoDB  
**Solution:** 
```bash
# Check if MongoDB is running
docker-compose ps

# Restart MongoDB
docker-compose restart mongodb
```

### Python Script Errors
**Problem:** Python script execution fails  
**Solution:**
```bash
# Check Python is available in container
docker-compose exec app python3 --version

# Check script has execute permissions
chmod +x server/python/*.py
```

### Port Already in Use
**Problem:** "Port 80 is already in use"  
**Solution:**
```bash
# Find what's using the port
lsof -i :80

# Kill the process or use different port
# Edit docker-compose.yml to use different port:
ports:
  - "8080:80"  # Use port 8080 instead
```

---

## 📊 Performance

### Production Optimization

**Node.js:**
- Uses production build of React
- Gzip compression enabled
- Static file caching
- Process clustering available

**Python:**
- Embeddings cached per user
- Lazy loading of AI models
- Vector store persistence

**MongoDB:**
- Indexes on userId fields
- Connection pooling
- Persistent volumes

---

## 🔒 Security

### Production Checklist
- [ ] Change JWT_SECRET from default
- [ ] Use strong SMTP credentials
- [ ] Enable HTTPS (use reverse proxy like Nginx)
- [ ] Set NODE_ENV=production
- [ ] Restrict MongoDB access
- [ ] Regular security updates
- [ ] Enable Docker secrets for sensitive data

### Recommended Setup
```bash
# Use Docker secrets instead of environment variables
docker secret create jwt_secret /path/to/jwt_secret.txt
docker secret create openai_key /path/to/openai_key.txt
```

---

## 📈 Scaling

### Horizontal Scaling
```yaml
# docker-compose.yml
services:
  app:
    deploy:
      replicas: 3  # Run 3 instances
      
  # Add load balancer
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
    # ... load balancer config
```

### Vertical Scaling
```yaml
services:
  app:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 4G
        reservations:
          cpus: '1'
          memory: 2G
```

---

## 🎓 Development vs Production

### Development (Current)
- Separate processes for easier debugging
- Hot reload enabled
- CORS allows multiple origins
- Detailed error messages
- No need for Docker

### Production (Docker)
- Single consolidated server
- No hot reload (restart container)
- Same origin (no CORS issues)
- Generic error messages
- Docker required
- Scalable and portable

---

## 📚 File Structure Changes

### New Files
```
server/
├── python/                    # NEW
│   ├── document_search.py     # Python wrapper for document AI
│   └── vendor_search.py       # Python wrapper for vendor AI
└── routes/
    └── search.js              # NEW - AI search endpoints

Dockerfile                     # NEW - Single-stage build
docker-compose.yml             # NEW - Complete stack
.dockerignore                  # NEW - Build optimization
.env.docker.example            # NEW - Docker environment template
```

### Modified Files
```
server/index.js                # Added static file serving & CORS fix
client/package.json            # Updated proxy to port 5003
client/src/services/api.js     # Environment-aware base URL
client/src/services/documentService.js  # Uses /api/search/documents
client/src/services/vendorService.js    # Uses /api/search/vendors
.env                           # Added CLIENT_URL
```

---

## ✅ Testing Checklist

Before deploying to production:

- [ ] Sign up works without CORS errors
- [ ] Login works
- [ ] Document upload works
- [ ] Document AI search works
- [ ] Vendor CRUD works
- [ ] Vendor AI search works
- [ ] Excel import/export works
- [ ] Docker build succeeds
- [ ] Docker container runs
- [ ] Health check passes
- [ ] MongoDB persists data
- [ ] Logs are accessible

---

## 🚢 Deployment Steps

### 1. Prepare Production Environment
```bash
# On your server
git clone your-repo
cd file_search_ai_tool
cp .env.docker.example .env.docker
nano .env.docker  # Add your credentials
```

### 2. Build and Deploy
```bash
# Build the image
docker-compose build

# Start services
docker-compose up -d

# Check status
docker-compose ps
docker-compose logs -f app
```

### 3. Set Up Domain (Optional)
```bash
# Install Nginx
sudo apt install nginx

# Configure reverse proxy
sudo nano /etc/nginx/sites-available/netkathir

# Enable site
sudo ln -s /etc/nginx/sites-available/netkathir /etc/nginx/sites-enabled/
sudo systemctl restart nginx
```

### 4. Enable HTTPS (Recommended)
```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d yourdomain.com
```

---

## 📞 Support

### Common Issues
1. **CORS Errors** - ✅ Fixed in this update
2. **Port conflicts** - Change ports in docker-compose.yml
3. **Python errors** - Check logs: `docker-compose logs app`
4. **MongoDB errors** - Check logs: `docker-compose logs mongodb`

### Getting Help
- Check logs first: `docker-compose logs -f`
- Verify environment variables
- Test health endpoint: `curl http://localhost/api/health`
- Check container status: `docker-compose ps`

---

## 🎉 Benefits of New Architecture

1. **✅ No More CORS Issues** - Same origin = no CORS
2. **✅ Simpler Deployment** - One command, one container
3. **✅ Docker-Ready** - Easy to deploy anywhere
4. **✅ Cost-Effective** - Single server instance
5. **✅ Easy to Scale** - Horizontal/vertical scaling ready
6. **✅ Professional** - Industry-standard architecture
7. **✅ Maintainable** - Single codebase, clear structure

---

**Your app is now production-ready! 🚀**

Access it at: http://localhost:3000 (dev) or http://localhost (prod)
