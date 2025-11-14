# Local Testing Guide for LinkSecure

## Why Test Locally?

Testing locally is **much faster** than deploying to Render:
- ⚡ Instant code changes (no build/deploy wait)
- 🔍 Real-time debugging with console logs
- 🐛 Better error messages in terminal
- 💰 No deployment costs during development
- 🔄 Quick iteration cycle

## Setup Instructions

### 1. Backend Setup (Terminal 1)

```powershell
# Navigate to server directory
cd server

# Ensure dependencies are installed
npm install

# Start the backend development server
npm run dev
```

**Expected output:**
```
Server running on port 5000
MongoDB connected
Azure Storage connected
```

**Backend will be available at:** `http://localhost:5000`

### 2. Frontend Setup (Terminal 2)

```powershell
# Navigate to client directory
cd client

# Update .env to use local backend (already done)
# .env should contain: VITE_API_URL=http://localhost:5000

# Ensure dependencies are installed
npm install

# Start the frontend development server
npm run dev
```

**Expected output:**
```
  VITE v5.x.x  ready in 500 ms

  ➜  Local:   http://localhost:8080/
  ➜  Network: http://192.168.x.x:8080/
```

**Frontend will be available at:** `http://localhost:8080`

### 3. Environment Variables Check

**Backend (`server/.env`)** - Create if it doesn't exist:
```env
# MongoDB (use your connection string)
MONGODB_URI=your_mongodb_connection_string

# Azure Storage
AZURE_STORAGE_ACCOUNT_NAME=linksecurestorage
AZURE_STORAGE_ACCOUNT_KEY=your_azure_key
AZURE_STORAGE_CONTAINER_NAME=linksecure-files

# Server URLs
BASE_URL=http://localhost:5000
CLIENT_URL=http://localhost:8080
CORS_ORIGIN=http://localhost:8080

# JWT Secret (for password-protected links)
JWT_SECRET=your-local-dev-secret-key

# Email (optional for local testing)
EMAIL_USER=your_email
EMAIL_APP_PASSWORD=your_app_password
```

**Frontend (`client/.env`):**
```env
VITE_API_URL=http://localhost:5000
```

## Testing Password-Protected Links

### Flow Overview:
```
1. Create link with password
2. Access link → Get 401 with requiresPassword: true
3. Send password → Get JWT token
4. Access link with token → Download file
```

### Test Steps:

#### Step 1: Create Password-Protected Link

**Option A: Via UI (ShareModal)**
1. Upload a file in the dashboard
2. Click "Share" on the file
3. Enable "Use Short LinkSecure URL" toggle (should be ON by default)
4. Enable "Password Protected" toggle
5. Enter a password (e.g., `test123`)
6. Click "Generate Link"
7. Copy the short link: `http://localhost:5000/s/abc12345`

**Option B: Via API (Postman/Thunder Client)**
```http
POST http://localhost:5000/api/v1/links/create
Content-Type: application/json
Authorization: Bearer YOUR_JWT_TOKEN

{
  "owner_id": "your_user_id",
  "blob_path": "user_abc/filename.jpg",
  "expiry_minutes": 1440,
  "password": "test123",
  "metadata": {
    "original_file_name": "photo.jpg",
    "file_size": 181285,
    "mime_type": "image/jpeg"
  }
}
```

**Expected Response:**
```json
{
  "success": true,
  "link": "http://localhost:5000/s/x7mK4pQz",
  "short_code": "x7mK4pQz",
  "expires_at": "2025-11-15T10:30:00.000Z"
}
```

#### Step 2: Try Accessing Without Password

Open in browser:
```
http://localhost:5000/s/x7mK4pQz
```

**Expected Response (401 JSON):**
```json
{
  "success": false,
  "error": "Unauthorized",
  "message": "This link is password-protected",
  "requiresPassword": true
}
```

**Frontend behavior:** Should detect `requiresPassword: true` and show password modal

#### Step 3: Verify Password and Get Token

```http
POST http://localhost:5000/api/v1/links/verify/x7mK4pQz
Content-Type: application/json

{
  "password": "test123"
}
```

**Expected Response (200 OK):**
```json
{
  "success": true,
  "downloadToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Wrong password response (403 Forbidden):**
```json
{
  "success": false,
  "error": "Forbidden",
  "message": "Invalid password"
}
```

#### Step 4: Download File With Token

```
http://localhost:5000/s/x7mK4pQz?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Expected:** File streams successfully with original filename

**Token expired (>5 minutes):**
```json
{
  "success": false,
  "error": "Unauthorized",
  "message": "Download token is invalid or expired",
  "requiresPassword": true
}
```

### Backend Console Logs to Watch For:

**Creating link with password:**
```
🔒 Password protection enabled for link
✅ Created new short link:
  🔗 Short Code: x7mK4pQz
  📄 Blob Path: user_abc/photo.jpg
```

**Accessing without password:**
```
⚠️  Password-protected link accessed without token: x7mK4pQz
```

**Wrong password:**
```
⚠️  Invalid password attempt for link: x7mK4pQz
```

**Correct password:**
```
✅ Password verified for link: x7mK4pQz
```

**Downloading with valid token:**
```
🔓 Valid download token verified for: x7mK4pQz
✅ Proxying file stream:
  🔗 Short Code: x7mK4pQz
  📄 Blob Path: user_abc/photo.jpg
  🔐 Password protection: ENABLED
```

## Testing Regular (Non-Password) Links

1. Create link **without** password
2. Access `http://localhost:5000/s/xyz789`
3. Should download immediately (no password check)

**Console logs:**
```
✅ Proxying file stream:
  🔗 Short Code: xyz789
  📄 Blob Path: user_abc/photo.jpg
  🔒 Azure URL hidden from client
```

## Debugging Tips

### Check if Backend is Running:
```powershell
# Test health endpoint
Invoke-WebRequest -Uri "http://localhost:5000/api/health" -UseBasicParsing
```

### Check MongoDB Connection:
Look for this in backend logs:
```
MongoDB connected to: your_database
```

### Check Azure Storage Connection:
Upload a file through the UI - if successful, Azure is connected

### View All Environment Variables:
```powershell
# In server directory
Get-Content .env
```

### Clear Browser Cache:
- Press `Ctrl + Shift + R` to hard refresh
- Or use incognito mode for testing

### Monitor Network Requests:
1. Open DevTools (F12)
2. Go to Network tab
3. Filter by "Fetch/XHR"
4. Watch requests to `/api/v1/links/verify` and `/s/:short_code`

## Common Issues & Solutions

### Issue: Frontend can't connect to backend
**Solution:** 
- Check backend is running on port 5000
- Check `client/.env` has `VITE_API_URL=http://localhost:5000`
- Restart frontend dev server after changing `.env`

### Issue: CORS errors
**Solution:**
```env
# In server/.env
CORS_ORIGIN=http://localhost:8080
CLIENT_URL=http://localhost:8080
```
Restart backend server

### Issue: JWT errors
**Solution:**
- Ensure `JWT_SECRET` is set in `server/.env`
- Token expires after 5 minutes (expected behavior)
- Request new token via `/api/v1/links/verify`

### Issue: Azure blob not found
**Solution:**
- File must actually exist in Azure Storage
- Check `blob_path` matches Azure container structure
- Use Azure Storage Explorer to verify file exists

### Issue: Password always fails
**Solution:**
- Check backend logs for bcrypt errors
- Ensure password is actually being hashed (look for "🔒 Password protection enabled")
- Password is case-sensitive

## Testing Checklist

Before deploying to production, test locally:

- [ ] Create regular link (no password) → Download works
- [ ] Create password-protected link
- [ ] Access protected link without token → Gets 401
- [ ] Verify with wrong password → Gets 403
- [ ] Verify with correct password → Gets JWT token
- [ ] Download with valid token → File streams
- [ ] Download with expired token (wait 6 minutes) → Gets 401
- [ ] Download with wrong token → Gets 403
- [ ] Create link via UI (ShareModal)
- [ ] Create link via API endpoint
- [ ] Check access count increments
- [ ] Check link expiration works
- [ ] Test with different file types (image, PDF, video)

## Performance Testing

Test with large files locally:

```powershell
# Upload a 50MB+ file
# Access via short link
# Monitor:
# - Memory usage (should stay low ~64KB per user)
# - Streaming speed
# - No timeout errors
```

## Hot Reloading

Both frontend and backend support hot reloading:

**Backend changes:** 
- Save file → `ts-node-dev` automatically restarts
- No need to restart manually

**Frontend changes:**
- Save file → Vite hot-reloads instantly
- See changes in browser immediately

## Committing Changes

Only commit changes when local tests pass:

```powershell
# After successful local testing
git add .
git commit -m "Implement password protection for links"
git push
```

Render will auto-deploy, but you've already tested everything locally!

## Production Deployment

After local testing succeeds:

1. **Update production `.env` files** in Render dashboard:
   - `BASE_URL=https://linksecure.onrender.com`
   - `JWT_SECRET=secure-production-secret-key`
   
2. **Update client `.env.production`:**
   ```env
   VITE_API_URL=https://linksecure.onrender.com
   ```

3. **Push to GitHub** → Render auto-deploys

4. **Test on production** (should work identically to local)

## Quick Reference Commands

```powershell
# Start backend
cd server; npm run dev

# Start frontend  
cd client; npm run dev

# Test health endpoint
curl http://localhost:5000/api/health

# Test protected link
curl http://localhost:5000/s/abc12345

# Verify password
curl -X POST http://localhost:5000/api/v1/links/verify/abc12345 `
  -H "Content-Type: application/json" `
  -d '{"password":"test123"}'
```

## VS Code Extensions (Optional but Helpful)

- **REST Client** - Test API endpoints directly in VS Code
- **Thunder Client** - Postman alternative built into VS Code
- **MongoDB for VS Code** - View database directly
- **Azure Storage** - Browse Azure blobs directly

## Summary

✅ Local testing is **10x faster** than deploying to Render  
✅ You get **full debugging** with console logs and breakpoints  
✅ Changes are **instant** with hot reloading  
✅ Only deploy to production when **everything works locally**  

Happy testing! 🚀
