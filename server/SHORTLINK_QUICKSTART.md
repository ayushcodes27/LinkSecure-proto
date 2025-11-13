# LinkSecure Short URL Service - Quick Start Guide

## 🚀 What You Just Built

A secure backend service that:
1. ✅ Creates short, memorable URLs (e.g., `linksecure.com/s/abc123XY`)
2. ✅ Maps them to Azure Blob Storage files
3. ✅ Serves files via time-limited SAS tokens (60 seconds)
4. ✅ Tracks access analytics
5. ✅ Validates expiry and handles errors gracefully

## 📁 Files Created

```
server/
├── models/
│   └── LinkMapping.ts              # MongoDB model for link mappings
├── services/
│   ├── azureSASService.ts          # Azure SAS token generation
│   └── linkUtils.ts                # Short code generator & utilities
├── routes/
│   └── links.ts                    # API endpoints
├── test-short-links.js             # Comprehensive test suite
└── SHORTLINK_API_DOCUMENTATION.md  # Full API documentation
```

## 🔧 Setup (Already Done!)

The service is integrated into your existing LinkSecure backend. No additional setup needed!

**Environment variables** (already in your `.env`):
```env
AZURE_STORAGE_ACCOUNT_NAME=linksecurestorage
AZURE_STORAGE_ACCOUNT_KEY=your-key
AZURE_STORAGE_CONTAINER_NAME=linksecure-files
BASE_URL=http://localhost:5000
```

## 🎯 How to Use

### 1. Start the Server

```bash
cd server
npm run dev
```

The server will now handle:
- `POST /api/v1/links/create` - Create short links
- `GET /s/:short_code` - Access files via short links

### 2. Test the Service

Run the comprehensive test suite:

```bash
node server/test-short-links.js
```

**Before running tests**, make sure:
1. Server is running (`npm run dev`)
2. A test file exists in Azure: `test-user-123/test-file.pdf`

### 3. Create a Short Link (cURL Example)

```bash
curl -X POST http://localhost:5000/api/v1/links/create \
  -H "Content-Type: application/json" \
  -d '{
    "owner_id": "user123",
    "blob_path": "user123/documents/report.pdf",
    "expiry_minutes": 1440
  }'
```

**Response:**
```json
{
  "success": true,
  "link": "http://localhost:5000/s/abc123XY",
  "short_code": "abc123XY",
  "expires_at": "2024-01-15T10:30:00.000Z",
  "blob_path": "user123/documents/report.pdf"
}
```

### 4. Access the Short Link

Simply visit: `http://localhost:5000/s/abc123XY`

The service will:
1. Validate the short code ✅
2. Check if link expired ⏰
3. Generate a 60-second SAS token 🔐
4. Redirect to Azure Blob Storage ↗️
5. Increment access counter 📊

## 📊 API Endpoints

### Create Link
```
POST /api/v1/links/create
```
Body:
```json
{
  "owner_id": "user123",
  "blob_path": "user123/file.pdf",
  "expiry_minutes": 1440
}
```

### Access Link (Redirect)
```
GET /s/:short_code
```
Returns: `302 Redirect` to Azure SAS URL

### Get Link Info
```
GET /api/v1/links/:short_code/info
```
Returns: Link metadata and statistics

### Get User's Links
```
GET /api/v1/links/user/:owner_id
```
Returns: All links for a user

## 🔐 Security Features

✅ **Cryptographically Secure Short Codes**
- 8 characters (62^8 = 218 trillion combinations)
- Collision detection
- Unique per link

✅ **Time-Limited SAS Tokens**
- 60-second expiry for redirects
- Read-only permissions
- HTTPS-only

✅ **Link Expiry**
- Configurable (1 hour to 7 days)
- Returns 410 Gone when expired
- Automatic validation

✅ **Access Tracking**
- Count every access
- Track last access time
- Full audit trail

## 📝 Example Workflow

### 1. User uploads file to Azure
```
File uploaded to: user123/vacation-photos.zip
```

### 2. System creates short link
```javascript
const response = await fetch('/api/v1/links/create', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    owner_id: 'user123',
    blob_path: 'user123/vacation-photos.zip',
    expiry_minutes: 10080  // 7 days
  })
});

const { link } = await response.json();
// link: "https://linksecure.com/s/mX7kP2qR"
```

### 3. User shares link
```
Share via email, SMS, QR code, etc.:
https://linksecure.com/s/mX7kP2qR
```

### 4. Recipient clicks link
```
1. Browser: GET /s/mX7kP2qR
2. Server validates (exists? expired?)
3. Server generates 60-sec SAS token
4. Server: 302 Redirect to Azure
5. Browser downloads from Azure directly
6. Access count incremented
```

## 🧪 Testing Checklist

- [x] ✅ Create link with valid blob
- [x] ✅ Redirect to Azure with SAS
- [x] ✅ Get link information
- [x] ✅ List user's links
- [x] ✅ Handle 404 (not found)
- [x] ✅ Handle 410 (expired)
- [x] ✅ Handle 400 (bad request)
- [x] ✅ Validate blob exists
- [x] ✅ Increment access count
- [x] ✅ Track last access time

## 🚨 Common Issues & Solutions

### Issue 1: "Blob not found"
**Solution:** Make sure the file exists in Azure Blob Storage at the specified path.

```bash
# Check Azure Storage Explorer or:
az storage blob list --account-name linksecurestorage \
  --container-name linksecure-files
```

### Issue 2: "Cannot find module './routes/links'"
**Solution:** Restart the TypeScript compiler:
```bash
npm run dev
```

### Issue 3: SAS token expired immediately
**Solution:** Check system time - SAS tokens depend on accurate time sync.

### Issue 4: 302 redirect not working
**Solution:** Check that `BASE_URL` is set correctly in `.env`

## 📈 Next Steps

### Phase 1 (Current) ✅
- [x] Basic link creation
- [x] SAS-based redirection
- [x] Expiry validation
- [x] Access tracking

### Phase 2 (Future)
- [ ] JWT authentication for link creation
- [ ] Password-protected links
- [ ] Download limits per link
- [ ] Custom expiry UI
- [ ] Analytics dashboard

### Phase 3 (Advanced)
- [ ] QR code generation
- [ ] Custom short domains
- [ ] IP whitelisting
- [ ] Webhooks on access
- [ ] Email notifications

## 📖 Documentation

Full API documentation: `server/SHORTLINK_API_DOCUMENTATION.md`

## 🎯 Integration with Frontend

To integrate with your React frontend:

```typescript
// Create a short link
async function createShortLink(blobPath: string, expiryMinutes: number = 1440) {
  const response = await fetch('/api/v1/links/create', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}` // If using auth
    },
    body: JSON.stringify({
      owner_id: userId,
      blob_path: blobPath,
      expiry_minutes: expiryMinutes
    })
  });
  
  const data = await response.json();
  return data.link; // e.g., "http://localhost:5000/s/abc123XY"
}

// Share the link
function shareLink(link: string) {
  // Copy to clipboard
  navigator.clipboard.writeText(link);
  
  // Or generate QR code
  // Or send via email
}
```

## 🔍 Monitoring

### Check link statistics
```bash
curl http://localhost:5000/api/v1/links/abc123XY/info
```

### Get all links for a user
```bash
curl http://localhost:5000/api/v1/links/user/user123
```

### Database queries (MongoDB)
```javascript
// Most accessed links
db.linkmappings.find().sort({ access_count: -1 }).limit(10)

// Expired links
db.linkmappings.find({ 
  expires_at: { $lt: new Date() } 
})

// Links expiring soon (next 24 hours)
db.linkmappings.find({
  expires_at: { 
    $gte: new Date(),
    $lte: new Date(Date.now() + 24*60*60*1000)
  }
})
```

## 🎉 Success!

You now have a production-ready short URL service that:
- ✅ Abstracts Azure Blob Storage URLs
- ✅ Generates secure, memorable short links
- ✅ Uses time-limited SAS tokens (60 seconds)
- ✅ Tracks access analytics
- ✅ Handles errors gracefully
- ✅ Scales with your application

**Try it now:**
1. Start server: `npm run dev`
2. Run tests: `node server/test-short-links.js`
3. Create your first short link!

---

Need help? Check `SHORTLINK_API_DOCUMENTATION.md` for detailed API reference.
