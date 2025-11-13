# LinkSecure Short URL Service - API Documentation

## Overview
This service creates short, custom LinkSecure URLs that map to Azure Blob Storage files and serves them via time-limited Shared Access Signatures (SAS).

## Technology Stack
- **Backend**: Node.js with Express
- **Database**: MongoDB
- **Storage**: Azure Blob Storage
- **Authentication**: JWT (existing LinkSecure auth)

---

## Database Schema

### Collection: `linkmappings`

| Field | Type | Description |
|-------|------|-------------|
| `_id` | ObjectId | MongoDB primary key (auto-generated) |
| `short_code` | String | Unique 8-character alphanumeric code (e.g., "xyz123ab") |
| `blob_path` | String | Full path to file in Azure Blob Storage (e.g., "userId/file.pdf") |
| `owner_id` | String | User ID of the link creator |
| `created_at` | Date | Timestamp when link was created |
| `expires_at` | Date | Timestamp when link expires |
| `access_count` | Number | Number of times link has been accessed (default: 0) |
| `last_accessed_at` | Date | Last time the link was accessed |
| `is_active` | Boolean | Whether link is active (default: true) |
| `metadata` | Object | Optional: `{original_file_name, file_size, mime_type}` |

**Indexes:**
- `short_code` (unique)
- `owner_id` + `created_at`
- `expires_at` + `is_active`

---

## API Endpoints

### 1. Create Short Link

**Endpoint:** `POST /api/v1/links/create`

**Description:** Creates a new short link that maps to an Azure Blob Storage file.

**Request Headers:**
```
Content-Type: application/json
Authorization: Bearer <jwt_token>  (optional, for authenticated users)
```

**Request Body:**
```json
{
  "owner_id": "user123",
  "blob_path": "user123/documents/report.pdf",
  "expiry_minutes": 1440,
  "metadata": {
    "original_file_name": "Annual Report 2024.pdf",
    "file_size": 2048576,
    "mime_type": "application/pdf"
  }
}
```

**Request Parameters:**
- `owner_id` (required): User ID who creates the link
- `blob_path` (required): Full path to file in Azure Blob Storage
- `expiry_minutes` (optional): Minutes until link expires (default: 1440 = 24 hours)
  - Min: 60 minutes (1 hour)
  - Max: 10080 minutes (7 days)
- `metadata` (optional): Additional file information

**Success Response (201 Created):**
```json
{
  "success": true,
  "link": "https://your-domain.com/s/abc123XY",
  "short_code": "abc123XY",
  "expires_at": "2024-01-15T10:30:00.000Z",
  "blob_path": "user123/documents/report.pdf",
  "owner_id": "user123",
  "created_at": "2024-01-14T10:30:00.000Z"
}
```

**Error Responses:**

**400 Bad Request:**
```json
{
  "success": false,
  "error": "Bad Request",
  "message": "owner_id is required"
}
```

**404 Not Found:**
```json
{
  "success": false,
  "error": "Not Found",
  "message": "The specified file does not exist in Azure Storage"
}
```

**500 Internal Server Error:**
```json
{
  "success": false,
  "error": "Internal Server Error",
  "message": "Failed to create link"
}
```

---

### 2. Access Short Link (Redirection)

**Endpoint:** `GET /s/:short_code`

**Description:** Redirects to Azure Blob Storage file using a time-limited SAS URL.

**URL Parameters:**
- `short_code`: 8-character alphanumeric identifier (e.g., "abc123XY")

**Success Response (302 Temporary Redirect):**
```
HTTP/1.1 302 Found
Location: https://linksecurestorage.blob.core.windows.net/linksecure-files/user123/file.pdf?sv=2021-08-06&se=2024-01-14T10%3A31%3A00Z&sr=b&sp=r&sig=...
```

The SAS token is valid for **60 seconds** from generation.

**Error Responses:**

**400 Bad Request:**
Returns HTML page:
```html
Invalid Link
The link format is invalid. Please check the URL and try again.
```

**404 Not Found:**
Returns HTML page:
```html
Link Not Found
This link does not exist or has been deleted.
```

**410 Gone:**
Returns HTML page:
```html
Link Expired
This link has expired and is no longer accessible.
Expired on: [date] at [time]
```

**500 Internal Server Error:**
Returns HTML page:
```html
Server Error
An error occurred while processing your request.
```

---

### 3. Get Link Information

**Endpoint:** `GET /api/v1/links/:short_code/info`

**Description:** Get information about a link without accessing the file.

**Success Response (200 OK):**
```json
{
  "success": true,
  "short_code": "abc123XY",
  "blob_path": "user123/documents/report.pdf",
  "owner_id": "user123",
  "created_at": "2024-01-14T10:30:00.000Z",
  "expires_at": "2024-01-15T10:30:00.000Z",
  "is_expired": false,
  "access_count": 15,
  "last_accessed_at": "2024-01-14T15:45:00.000Z",
  "metadata": {
    "original_file_name": "Annual Report 2024.pdf",
    "file_size": 2048576,
    "mime_type": "application/pdf"
  }
}
```

---

### 4. Get User's Links

**Endpoint:** `GET /api/v1/links/user/:owner_id`

**Description:** Get all links created by a specific user.

**Query Parameters:**
- `include_expired` (optional): Set to "true" to include expired links (default: false)

**Success Response (200 OK):**
```json
{
  "success": true,
  "count": 3,
  "links": [
    {
      "short_code": "abc123XY",
      "blob_path": "user123/file1.pdf",
      "created_at": "2024-01-14T10:30:00.000Z",
      "expires_at": "2024-01-15T10:30:00.000Z",
      "is_expired": false,
      "access_count": 15,
      "last_accessed_at": "2024-01-14T15:45:00.000Z",
      "metadata": {...},
      "link_url": "https://your-domain.com/s/abc123XY"
    },
    ...
  ]
}
```

---

## Architecture Flow

### Link Creation Flow:
```
1. Client sends POST /api/v1/links/create
   ↓
2. Validate owner_id and blob_path
   ↓
3. Check if file exists in Azure Blob Storage
   ↓
4. Generate unique 8-character short_code
   ↓
5. Calculate expires_at timestamp
   ↓
6. Save to MongoDB (linkmappings collection)
   ↓
7. Return complete link URL
```

### Redirection Flow:
```
1. User clicks short link: /s/abc123XY
   ↓
2. Validate short_code format
   ↓
3. Database lookup by short_code
   ↓
4. Check if link exists (404 if not)
   ↓
5. Check if link expired (410 if expired)
   ↓
6. Generate Azure SAS URL (60-second expiry)
   ↓
7. Increment access_count
   ↓
8. HTTP 302 redirect to SAS URL
   ↓
9. User downloads file from Azure directly
```

---

## Security Features

### Short Code Generation:
- **8 characters** alphanumeric (a-z, A-Z, 0-9)
- **62^8 = 218 trillion** possible combinations
- **Cryptographically secure** random generation using `crypto.randomBytes()`
- **Collision detection**: Checks database before assignment

### SAS Token Security:
- **Read-only permissions** (`r` permission only)
- **HTTPS-only** protocol
- **60-second expiry** for redirection (immediate use)
- **Time-limited** access (not permanent)

### Link Expiry:
- **Configurable expiry** (1 hour to 7 days)
- **Automatic validation** on every access
- **410 Gone** status for expired links

### Access Tracking:
- **Access count** incremented on each use
- **Last accessed timestamp** recorded
- **Full audit trail** capability

---

## Environment Configuration

Add to your `.env` file:

```env
# Azure Storage (already configured)
AZURE_STORAGE_ACCOUNT_NAME=linksecurestorage
AZURE_STORAGE_ACCOUNT_KEY=your-key-here
AZURE_STORAGE_CONTAINER_NAME=linksecure-files

# Base URL for link generation
BASE_URL=http://localhost:5000

# SAS Configuration
SAS_DEFAULT_EXPIRY_HOURS=24
SAS_MAX_EXPIRY_HOURS=168
SAS_MIN_EXPIRY_HOURS=1
SAS_PERMISSIONS=r
```

---

## Code Examples

### Example 1: Create a Short Link

```bash
curl -X POST http://localhost:5000/api/v1/links/create \
  -H "Content-Type: application/json" \
  -d '{
    "owner_id": "user123",
    "blob_path": "user123/documents/report.pdf",
    "expiry_minutes": 1440
  }'
```

### Example 2: Access a Short Link

```bash
curl -L http://localhost:5000/s/abc123XY
```
The `-L` flag follows the 302 redirect.

### Example 3: Get Link Info

```bash
curl http://localhost:5000/api/v1/links/abc123XY/info
```

### Example 4: Get User's Links

```bash
curl http://localhost:5000/api/v1/links/user/user123?include_expired=false
```

---

## Testing

See `test-short-links.js` for comprehensive test suite.

```bash
node server/test-short-links.js
```

---

## Error Handling

All endpoints follow consistent error response format:

```json
{
  "success": false,
  "error": "Error Type",
  "message": "Detailed error message"
}
```

Common error types:
- `Bad Request` (400): Invalid input
- `Not Found` (404): Resource doesn't exist
- `Gone` (410): Link expired
- `Internal Server Error` (500): Server error

---

## Performance Considerations

1. **Database Indexes**: Optimized queries on `short_code`, `owner_id`, and `expires_at`
2. **SAS Generation**: Cached credentials, fast token generation
3. **Redirection**: Direct 302 redirect (no file proxying)
4. **Azure Direct Download**: Files served directly from Azure (not through server)

---

## Monitoring & Maintenance

### Cleanup Expired Links:
Run periodic cleanup job to remove expired links:

```javascript
// Add to scripts/cleanupExpiredLinks.js
const result = await LinkMapping.deleteMany({
  expires_at: { $lt: new Date() },
  is_active: false
});
```

### Analytics Queries:
```javascript
// Most accessed links
await LinkMapping.find().sort({ access_count: -1 }).limit(10);

// Links expiring soon
await LinkMapping.find({
  expires_at: { 
    $gte: new Date(), 
    $lte: new Date(Date.now() + 24*60*60*1000) 
  }
});
```

---

## Integration with Existing LinkSecure Features

This service integrates seamlessly with existing LinkSecure features:
- Uses existing MongoDB connection
- Compatible with existing Azure Blob Storage setup
- Can be protected by existing JWT authentication
- Tracks usage with existing analytics infrastructure

---

## Next Steps / P3 Features (Future)

1. **Authentication**: Protect link creation with JWT
2. **Custom expiry per link**: UI to set custom expiry times
3. **Link analytics dashboard**: View access statistics
4. **Link management**: Deactivate/reactivate links
5. **Password protection**: Optional password for links
6. **Download limits**: Max number of downloads per link
7. **IP restrictions**: Whitelist/blacklist IP addresses
8. **Custom domains**: Support for custom short domains
9. **QR code generation**: Generate QR codes for links
10. **Webhooks**: Notify on link access

---

## Support

For issues or questions, contact the LinkSecure team.
