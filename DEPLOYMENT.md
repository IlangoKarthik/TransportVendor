# Deployment Guide - Transport Vendor App

This guide provides step-by-step instructions to deploy your Transport Vendor Management application to the cloud using **Render** (free tier available).

## Prerequisites

1. **GitHub Account** - For version control
2. **Render Account** - Sign up at [render.com](https://render.com) (free tier available)
3. **Git** - Installed on your local machine

---

## Step 1: Prepare Your Code for Deployment

### 1.1 Update Environment Variables

The code is already configured to use environment variables. Make sure you have these files:

**Server `.env` file** (already created):
```
DB_HOST=your-database-host
DB_USER=your-database-user
DB_PASSWORD=your-database-password
DB_NAME=transport_vendor_db
PORT=5000
```

**Client** - Will be configured in Render dashboard (no file needed)

### 1.2 Commit Your Code to GitHub

If you haven't already, initialize git and push to GitHub:

```bash
# In your project root directory
git init
git add .
git commit -m "Initial commit - ready for deployment"
git branch -M main
git remote add origin https://github.com/your-username/transport-vendor-app.git
git push -u origin main
```

---

## Step 2: Deploy MySQL Database on Render

1. **Login to Render**: Go to [dashboard.render.com](https://dashboard.render.com)

2. **Create New PostgreSQL Database** (Render uses PostgreSQL, we'll adapt):
   - Click **"New +"** → **"PostgreSQL"**
   - Name: `transport-vendor-db`
   - Region: Choose closest to you
   - PostgreSQL Version: Latest
   - Plan: **Free** (for testing)
   - Click **"Create Database"**

3. **Get Database Credentials**:
   - After creation, you'll see the database URL
   - Copy the **Internal Database URL** (we'll need this)

**Alternative: Use PlanetScale (MySQL) for easier migration:**
- Go to [planetscale.com](https://planetscale.com) (free tier)
- Create a new database
- Use PlanetScale connection string instead

---

## Step 3: Deploy Backend Server

1. **In Render Dashboard**:
   - Click **"New +"** → **"Web Service"**

2. **Connect Repository**:
   - Connect your GitHub account
   - Select your repository: `transport-vendor-app`
   - Click **"Connect"**

3. **Configure Backend Service**:
   - **Name**: `transport-vendor-backend`
   - **Region**: Same as database
   - **Branch**: `main`
   - **Root Directory**: `server`
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `node index.js`
   - **Plan**: **Free**

4. **Environment Variables**:
   Add these in the Environment Variables section:
   ```
   NODE_ENV=production
   PORT=10000
   DB_HOST=<your-database-host>
   DB_USER=<your-database-user>
   DB_PASSWORD=<your-database-password>
   DB_NAME=<your-database-name>
   ALLOWED_ORIGINS=https://your-frontend-url.onrender.com
   ```

5. **Click "Create Web Service"**

6. **Wait for deployment** - This may take 5-10 minutes

7. **Copy Backend URL** - You'll get something like: `https://transport-vendor-backend.onrender.com`

---

## Step 4: Deploy Frontend (React App)

1. **In Render Dashboard**:
   - Click **"New +"** → **"Static Site"**

2. **Connect Repository**:
   - Connect your GitHub account (if not already)
   - Select your repository: `transport-vendor-app`

3. **Configure Frontend**:
   - **Name**: `transport-vendor-frontend`
   - **Branch**: `main`
   - **Root Directory**: `client`
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `build`
   - **Plan**: **Free**

4. **Environment Variables**:
   Add this variable:
   ```
   REACT_APP_API_URL=https://transport-vendor-backend.onrender.com
   ```
   (Use your actual backend URL from Step 3)

5. **Click "Create Static Site"**

6. **Wait for deployment** - This may take 5-10 minutes

7. **Your app will be live!** - You'll get a URL like: `https://transport-vendor-frontend.onrender.com`

---

## Step 5: Initialize Database Schema

Once backend is deployed:

1. **Option A: Using Render Console**:
   - Go to your database service
   - Click **"Connect"** → **"psql"** (or MySQL client)
   - Run the SQL from `server/database.sql`

2. **Option B: Using Local MySQL Client**:
   - Connect to your remote database
   - Run: `mysql -h <host> -u <user> -p < database.sql`

3. **Option C: Backend Auto-creates Tables**:
   - The backend automatically creates tables on first connection
   - Just access the backend API once and check logs

---

## Step 6: Test Your Deployment

1. **Visit your frontend URL**: `https://transport-vendor-frontend.onrender.com`
2. **Try adding a vendor** - Should work!
3. **Check backend logs** in Render dashboard if there are issues

---

## Alternative: Deploy to Vercel (Frontend) + Railway (Backend)

### Vercel (Frontend) - Even Easier!

1. **Go to [vercel.com](https://vercel.com)**
2. **Import your GitHub repository**
3. **Configure**:
   - Root Directory: `client`
   - Framework Preset: Create React App
   - Environment Variable: `REACT_APP_API_URL=<your-backend-url>`
4. **Deploy** - Automatic!

### Railway (Backend + Database)

1. **Go to [railway.app](https://railway.app)**
2. **Create New Project**
3. **Add PostgreSQL** (or MySQL) service
4. **Add Node.js** service for backend
5. **Configure environment variables**
6. **Deploy**

---

## Troubleshooting

### Common Issues:

1. **CORS Errors**:
   - Make sure `ALLOWED_ORIGINS` includes your frontend URL
   - Update backend CORS configuration

2. **Database Connection Issues**:
   - Verify database credentials
   - Check if database is accessible from backend (Internal URL vs External URL)
   - Wait 2-3 minutes after database creation

3. **Build Failures**:
   - Check build logs in Render dashboard
   - Ensure all dependencies are in `package.json`
   - Verify Node.js version compatibility

4. **API Not Found**:
   - Verify `REACT_APP_API_URL` environment variable is set
   - Check backend URL is correct (no trailing slash)

### Free Tier Limitations:

- **Render**: Services may spin down after 15 minutes of inactivity (free tier)
- First request after idle time may take 30-60 seconds (cold start)
- Consider upgrading for production use

---

## Production Recommendations

For production deployment:

1. **Use PostgreSQL** instead of MySQL (better for cloud)
2. **Upgrade to paid tier** for always-on services
3. **Add domain name** (Render supports custom domains)
4. **Enable SSL/HTTPS** (automatic on Render)
5. **Set up monitoring** and error tracking
6. **Add authentication** for security
7. **Set up automated backups** for database

---

## Quick Deploy Commands Summary

```bash
# 1. Initialize Git (if not done)
git init
git add .
git commit -m "Ready for deployment"

# 2. Push to GitHub
git remote add origin https://github.com/yourusername/repo.git
git push -u origin main

# 3. Deploy on Render:
#    - Database: New → PostgreSQL
#    - Backend: New → Web Service (root: server)
#    - Frontend: New → Static Site (root: client)
```

---

## Support

If you encounter issues:
1. Check Render logs in dashboard
2. Verify environment variables
3. Test API endpoints directly using Postman/curl
4. Check database connection from backend logs

**Your app should now be live in the cloud! 🚀**

