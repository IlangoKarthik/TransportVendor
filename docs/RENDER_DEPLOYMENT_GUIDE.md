# Render Deployment Guide - Environment Variables Setup

## ⚠️ CRITICAL: You MUST set these environment variables in Render for the app to work!

The Flask services (DB Search & Document Search) will not start without proper environment variables. The .env file is NOT copied to Docker for security reasons.

## Step 1: Add Environment Variables to Render Dashboard

1. Go to your Render service dashboard: https://dashboard.render.com/
2. Select your service "netkathir-ai-tool"
3. Click on **"Environment"** tab on the left sidebar
4. Click **"Add Environment Variable"** button

## Step 2: Add These Required Variables

Copy and paste each key-value pair:

### Critical Variables (MUST HAVE - app will crash without these)

**OPENAI_API_KEY**
- Value: Your OpenAI API key from https://platform.openai.com/api-keys
- Purpose: Enables AI summarization in both DB Search and Document Search
- Without this: Flask services will start but in limited mode

**MONGODB_URI**
- Value: Your MongoDB Atlas connection string
- Format: `mongodb+srv://username:password@cluster-name.mongodb.net/netkathir?retryWrites=true&w=majority`
- Get from: MongoDB Atlas dashboard → Connect → Copy connection string
- Replace: `username`, `password`, and `password` in the string

**JWT_SECRET**
- Value: Any long random string (e.g., generate with: `python3 -c "import secrets; print(secrets.token_urlsafe(32))"`)
- Purpose: Signs authentication tokens
- Without this: Auth will fail randomly or use insecure default

### ⚠️ IMPORTANT: DO NOT SET PORT

**DO NOT add `PORT=5003` or any hardcoded PORT to environment variables!**

Render automatically assigns a dynamic PORT. Setting it manually causes:
- Bad Gateway errors
- Connection refused errors
- Service appears to work but frontend can't reach it

The server code correctly reads `process.env.PORT` and uses Render's dynamic assignment.

**DB_SEARCH_PORT** and **DOC_SEARCH_PORT** are INTERNAL ports and are fine to set.

### Optional But Recommended

**DEBUG**
- Value: `false`
- Purpose: Set to `true` for verbose logging during troubleshooting

**LOG_LEVEL**
- Value: `INFO` (or `DEBUG` for more verbosity)

**NODE_ENV**
- Value: `production`

**MONGODB_DB_NAME**
- Value: `netkathir`
- Purpose: Specifies the database name

## Step 3: Verify Variables Are Set

After adding all variables:
1. Click **"Save"** 
2. Your service should automatically redeploy (may take 2-5 minutes)
3. Check the **"Logs"** tab to see startup messages:
   - You should see: `DB Search API Starting Up` 
   - And: `Document Search API Starting Up`
   - Both should show which environment variables are set

## Step 4: Check Logs for Errors

After redeploy completes, check logs for these messages:

### ✓ Success Indicators:
```
============================================================
DB Search API Starting Up
============================================================
OPENAI_API_KEY set: True
MONGODB_URI set: True
Running in DEBUG mode: False
============================================================

✓ OpenAI client initialized successfully
✓ Response generator initialized successfully
[timestamp] * Running on http://0.0.0.0:5002
```

### ✗ Error Indicators & Solutions:

If you see:
```
WARNING: OPENAI_API_KEY not set. AI summarization will not work.
```
→ **Solution**: Add OPENAI_API_KEY to Environment variables in Render dashboard

If you see:
```
✗ Connection refused to MongoDB
```
→ **Solution**: Check MONGODB_URI is correct and MongoDB Atlas IP whitelist includes Render's IPs (allow 0.0.0.0/0 for testing)

If you see:
```
✗ Error initializing
```
→ **Solution**: Check all variable values are correct (no extra spaces, correct API keys)

## Step 5: Test the Application

1. Go to your Render app URL (e.g., https://netkathir-ai-tool.onrender.com)
2. Try these endpoints:
   - **Vendor Search**: Upload a CSV with vendor data
   - **Document Search**: Upload a PDF or text document
   - **Auth**: Try signup with demo OTP "1234"

## Quick Reference Table

| Variable | Required | Example Value | Notes |
|----------|----------|---|---|
| OPENAI_API_KEY | YES | sk-... | From platform.openai.com |
| MONGODB_URI | YES | mongodb+srv://user:pass@cluster.mongodb.net/netkathir | From MongoDB Atlas |
| JWT_SECRET | YES | (random 32+ char string) | Generate once, keep same |
| DB_SEARCH_PORT | NO | 5002 | Internal port, safe to set |
| DOC_SEARCH_PORT | NO | 5001 | Internal port, safe to set |
| NODE_ENV | NO | production | For Express.js |
| **PORT** | **NO** | **LEAVE BLANK** | **Render assigns dynamically** |
| DEBUG | NO | false | For logging |

## Troubleshooting

### Flask services keep crashing?
1. Check Render logs for the exact error message
2. Verify OPENAI_API_KEY and MONGODB_URI are set in Environment tab
3. Check that your OpenAI API key is valid (has credits)
4. Check that MongoDB Atlas connection string is correct

### "Cannot GET /" error?
→ Flask services aren't running, check logs above

### "Document Search service not available"?
→ Flask Document Search crashed, check OPENAI_API_KEY is set

### Port already in use?
→ Shouldn't happen on Render. Try restarting the service: Dashboard → "Manual Deploy" button

## Questions?
- Check Render logs in real-time as you add variables
- The logs will tell you exactly what's missing
- Environment variables take effect after redeploy (automatic when you save)

---

**Last Updated**: After robust Flask error handling implementation
**Status**: Ready for production with proper environment variable configuration
