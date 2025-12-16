# Render Environment Variables Required

Add these to your Render service environment variables (NOT in a .env file):

## Critical - Must Have
```
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/netkathir_ai_tool
JWT_SECRET=netkathir-super-secret-jwt-key-2024-production
OPENAI_API_KEY=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
```

## Important - Application Config
```
NODE_ENV=production
CLIENT_URL=https://netkathir-ai-tools.onrender.com
JWT_EXPIRES_IN=7d
OTP_EXPIRY_MINUTES=10
```

## Email/OTP (Demo mode for now)
```
SENDGRID_API_KEY=SG.your-key-here (optional, using demo OTP 1234)
EMAIL_FROM=Netkathir AI <noreply@yourdomain.com> (optional)
```

## File Upload
```
MAX_FILE_SIZE=10485760
ALLOWED_FILE_TYPES=.pdf,.docx,.doc,.txt,.md,.html
```

## API Configuration
```
API_HOST=0.0.0.0
API_PORT=5002
API_DEBUG=False
```

## Port Configuration
```
PORT=10000
DOC_SEARCH_PORT=5001
DB_SEARCH_PORT=5002
```

---

## How to Add to Render:

1. Go to https://dashboard.render.com
2. Click on your service "netkathir-ai-tools"
3. Click "Environment" tab
4. Click "Add Environment Variable"
5. Copy each key-value pair above and add them one by one
6. Click "Save Changes"
7. Service will auto-redeploy

---

## Verification:

After deploying, check Render logs should show:
```
[1/3] Starting Flask DB Search Service (port 5002)...
      ✓ Flask DB Search appears to be running
[2/3] Starting Flask Document Search Service (port 5001)...
      ✓ Flask Document Search appears to be running
[3/3] Starting Node.js API Server (port 10000)...
✓ Server running on port 10000
```

If Flask is crashing, logs will show the error.
