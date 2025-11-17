# LinkSecure - Deployment Guide

This guide explains how to deploy the LinkSecure application with the new content stream API architecture.

## 🏗️ Architecture Overview

The new architecture separates concerns:
- **Frontend (Vercel)**: Hosts the file viewer page at `/#/s/:shortCode`
- **Backend (Render)**: Serves file content via `/api/links/:short_code/content` endpoint
- **Flow**: User visits frontend URL → Frontend loads file from backend API in iframe

## 📋 Environment Variables Setup

### Backend (Render.com)

Add these environment variables in your Render dashboard:

```bash
# Required - Production URLs
FRONTEND_URL=https://linksecure-proto.vercel.app
CLIENT_URL=https://linksecure-proto.vercel.app
BASE_URL=https://linksecure.onrender.com

# Database
MONGO_URI=your_mongodb_connection_string

# JWT
JWT_SECRET=your_secure_jwt_secret_key
JWT_EXPIRES_IN=7d

# Azure Storage
STORAGE_TYPE=azure
AZURE_STORAGE_ACCOUNT_NAME=your_storage_account
AZURE_STORAGE_ACCOUNT_KEY=your_storage_key
AZURE_STORAGE_CONNECTION_STRING=your_connection_string
AZURE_STORAGE_CONTAINER_NAME=linksecure-files

# Google OAuth (optional)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
OAUTH_REDIRECT_URI=https://linksecure.onrender.com/api/auth/google/callback

# Email (Gmail SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
EMAIL_FROM=LinkSecure <your_email@gmail.com>

# CORS
CORS_ORIGIN=https://linksecure-proto.vercel.app

# Other
NODE_ENV=production
PORT=5000
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=104857600
```

### Frontend (Vercel)

Add this environment variable in your Vercel project settings:

```bash
VITE_API_URL=https://linksecure.onrender.com
```

## 🚀 Deployment Steps

### 1. Deploy Backend to Render

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Select your LinkSecure service
3. Go to **Environment** tab
4. Update the environment variables (especially `FRONTEND_URL` and `CLIENT_URL`)
5. Click **Manual Deploy** → **Deploy latest commit**
6. Wait for deployment to complete

### 2. Deploy Frontend to Vercel

1. Push your code to GitHub (already done ✅)
2. Vercel will automatically deploy from GitHub
3. Or manually trigger: Go to [Vercel Dashboard](https://vercel.com/dashboard) → Select project → **Deployments** → **Redeploy**
4. Verify `VITE_API_URL` is set correctly in Environment Variables

### 3. Verify Deployment

Test the following:

1. **Generate Link**: Go to dashboard → Upload file → Generate secure link
   - Expected URL format: `https://linksecure-proto.vercel.app/#/s/abc12345`

2. **View File**: Visit the generated link
   - Should load the file viewer page
   - File should display in iframe
   - Download button should work

3. **Password Protection**: Generate link with password
   - Should show password modal
   - After entering password, file should display

4. **Revoked Links**: Revoke a link and try accessing
   - Should show "Link has been revoked" error (410)

## 🔧 Local Development

Your local setup is preserved! To test locally:

### Backend:
```bash
cd server
npm run dev
# Runs on http://localhost:5000
```

### Frontend:
```bash
cd client
npm run dev
# Runs on http://localhost:8080
```

The code automatically uses `localhost` URLs when `FRONTEND_URL` and `VITE_API_URL` environment variables are not set.

## 🎯 Key Features Implemented

### 1. Content Stream API (`/api/links/:short_code/content`)
- Serves files with `Content-Disposition: inline` for browser viewing
- Handles password protection via JWT tokens
- Validates link status (active, revoked, expired)
- Streams directly from Azure Blob Storage
- CORS enabled for frontend embedding

### 2. Frontend File Viewer (`ShortLinkAccess.tsx`)
- Full-screen iframe viewer for inline file display
- Professional header with file name, size, and download button
- Password protection modal integration
- Loading and error states
- Branded footer

### 3. Link Generation Updates
- All generated links now point to frontend viewer URLs
- Format: `https://frontend.com/#/s/shortCode`
- Hash routing for static hosting compatibility
- Legacy backend route redirects to frontend automatically

### 4. Security Features Preserved
- Password protection with JWT
- Link revocation (410 Gone status)
- Expiration checking
- Access count limits
- All existing security validations maintained

## 🐛 Troubleshooting

### Issue: Files not displaying in viewer
- Check CORS settings on backend
- Verify `FRONTEND_URL` is set correctly on Render
- Check browser console for errors

### Issue: Links still showing localhost
- Ensure `FRONTEND_URL` environment variable is set on Render
- Redeploy backend after setting env vars
- Clear browser cache

### Issue: Password protection not working
- Verify `JWT_SECRET` is set on backend
- Check that verify endpoint is working: `/api/v1/links/verify/:shortCode`

### Issue: 404 on short links
- Verify frontend is using HashRouter (not BrowserRouter)
- Check that route `/s/:shortCode` exists in App.tsx
- Ensure ShortLinkAccess component is imported correctly

## 📝 Notes

- **.env files are NOT committed** to git for security
- Use Render/Vercel dashboards to set environment variables
- Local `.env` file uses localhost for development
- `.env.production` is gitignored (never commit secrets!)
- All URL configurations are done via environment variables

## 🔗 Useful Links

- Frontend: https://linksecure-proto.vercel.app
- Backend: https://linksecure.onrender.com
- GitHub: https://github.com/ayushcodes27/LinkSecure-proto

## ✅ Deployment Checklist

- [ ] Backend environment variables updated on Render
- [ ] Frontend environment variable set on Vercel
- [ ] Backend redeployed with new code
- [ ] Frontend automatically deployed from GitHub
- [ ] Test link generation (should show frontend URL)
- [ ] Test file viewing in iframe
- [ ] Test password protection
- [ ] Test download functionality
- [ ] Test revoked link error handling
- [ ] Verify CORS headers in browser network tab
