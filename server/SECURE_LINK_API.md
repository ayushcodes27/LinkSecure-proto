# Secure Link API Documentation

## Overview

The Secure Link API provides functionality for generating time-limited, secure links to files. These links allow users to share files without requiring authentication, while maintaining security through expiration times and access limits.

## Base URL

```
http://localhost:5000/api
```

## Authentication

Most endpoints require authentication via Bearer token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

**Note**: The `/api/secure/*` endpoints do NOT require authentication as they are designed for public access.

## API Endpoints

### 1. Generate Secure Link

Generate a new secure link for a file.

**Endpoint**: `POST /api/files/:fileId/generate-link`

**Authentication**: Required

**Request Body**:
```json
{
  "expiresInHours": 24,        // Optional: Hours until expiry (1-168, default: 24)
  "maxAccessCount": 100        // Optional: Maximum number of accesses (default: unlimited)
}
```

**Response** (201 Created):
```json
{
  "success": true,
  "message": "Secure link generated successfully",
  "data": {
    "linkId": "uuid",
    "secureToken": "uuid",
    "secureUrl": "http://localhost:3000/secure/uuid",
    "expiresAt": "2024-01-15T10:30:00.000Z",
    "maxAccessCount": 100,
    "fileName": "document.pdf",
    "originalName": "My Document.pdf"
  }
}
```

**Error Responses**:
- `400 Bad Request`: Invalid parameters
- `401 Unauthorized`: Authentication required
- `403 Forbidden`: File not found or no permission
- `409 Conflict`: Cannot create link for public files

### 2. Get User's Secure Links

Retrieve all secure links created by the authenticated user.

**Endpoint**: `GET /api/files/secure-links`

**Authentication**: Required

**Query Parameters**:
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "links": [
      {
        "linkId": "uuid",
        "fileId": "uuid",
        "fileName": "document.pdf",
        "originalName": "My Document.pdf",
        "secureToken": "uuid",
        "createdBy": "user_id",
        "expiresAt": "2024-01-15T10:30:00.000Z",
        "isActive": true,
        "accessCount": 5,
        "maxAccessCount": 100,
        "lastAccessedAt": "2024-01-14T15:20:00.000Z",
        "accessHistory": [...],
        "createdAt": "2024-01-14T10:30:00.000Z",
        "updatedAt": "2024-01-14T15:20:00.000Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 5,
      "totalLinks": 50,
      "hasNextPage": true,
      "hasPrevPage": false
    }
  }
}
```

### 3. Get Secure Link Details

Get detailed information about a specific secure link.

**Endpoint**: `GET /api/files/secure-links/:linkId`

**Authentication**: Required

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "linkId": "uuid",
    "fileId": "uuid",
    "fileName": "document.pdf",
    "originalName": "My Document.pdf",
    "secureToken": "uuid",
    "createdBy": "user_id",
    "expiresAt": "2024-01-15T10:30:00.000Z",
    "isActive": true,
    "accessCount": 5,
    "maxAccessCount": 100,
    "lastAccessedAt": "2024-01-14T15:20:00.000Z",
    "accessHistory": [
      {
        "accessedAt": "2024-01-14T15:20:00.000Z",
        "ipAddress": "192.168.1.1",
        "userAgent": "Mozilla/5.0...",
        "accessType": "view"
      }
    ],
    "createdAt": "2024-01-14T10:30:00.000Z",
    "updatedAt": "2024-01-14T15:20:00.000Z"
  }
}
```

### 4. Revoke Secure Link

Deactivate a secure link, making it inaccessible.

**Endpoint**: `DELETE /api/files/secure-links/:linkId`

**Authentication**: Required

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Secure link revoked successfully"
}
```

### 5. Get Secure Link Statistics

Get statistics about the user's secure links.

**Endpoint**: `GET /api/files/secure-links/stats/overview`

**Authentication**: Required

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "overview": {
      "totalLinks": 25,
      "activeLinks": 15,
      "totalAccesses": 150,
      "expiredLinks": 10
    },
    "recentLinks": [
      {
        "linkId": "uuid",
        "originalName": "document.pdf",
        "expiresAt": "2024-01-15T10:30:00.000Z",
        "accessCount": 5,
        "isActive": true,
        "createdAt": "2024-01-14T10:30:00.000Z"
      }
    ]
  }
}
```

## Public Access Endpoints (No Authentication Required)

### 6. Access File via Secure Link

View or download a file using a secure link.

**Endpoint**: `GET /api/secure/:token`

**Authentication**: None required

**Response** (200 OK):
- Returns the file content with appropriate headers
- Content-Type: Based on file MIME type
- Content-Disposition: `inline; filename="original_name"`

**Error Responses**:
- `403 Forbidden`: Link expired, inactive, or access limit reached
- `404 Not Found`: Invalid token or file not found

### 7. Download File via Secure Link

Download a file using a secure link.

**Endpoint**: `GET /api/secure/:token/download`

**Authentication**: None required

**Response** (200 OK):
- Returns the file content with download headers
- Content-Type: Based on file MIME type
- Content-Disposition: `attachment; filename="original_name"`

**Error Responses**:
- `403 Forbidden`: Link expired, inactive, or access limit reached
- `404 Not Found`: Invalid token or file not found

### 8. Get File Information via Secure Link

Get file information without downloading the file.

**Endpoint**: `GET /api/secure/:token/info`

**Authentication**: None required

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "fileName": "My Document.pdf",
    "fileSize": 1024000,
    "mimeType": "application/pdf",
    "expiresAt": "2024-01-15T10:30:00.000Z",
    "accessCount": 5,
    "maxAccessCount": 100,
    "isActive": true
  }
}
```

**Error Responses**:
- `403 Forbidden`: Link expired, inactive, or access limit reached
- `404 Not Found`: Invalid token or file not found

## Error Handling

All endpoints return consistent error responses:

```json
{
  "success": false,
  "error": "Error Type",
  "message": "Detailed error message"
}
```

Common HTTP status codes:
- `200 OK`: Successful request
- `201 Created`: Resource created successfully
- `400 Bad Request`: Invalid request parameters
- `401 Unauthorized`: Authentication required
- `403 Forbidden`: Access denied
- `404 Not Found`: Resource not found
- `409 Conflict`: Resource conflict
- `500 Internal Server Error`: Server error

## Security Features

1. **Time-based Expiration**: Links automatically expire after the specified duration
2. **Access Count Limits**: Optional limit on number of times a link can be accessed
3. **Manual Revocation**: Links can be manually deactivated by the owner
4. **Access Tracking**: All access attempts are logged with IP address and user agent
5. **Unique Tokens**: Each link uses a cryptographically secure random token
6. **Owner Verification**: Only file owners can generate links for their files
7. **Public File Protection**: Cannot create secure links for already public files

## Rate Limiting

Consider implementing rate limiting for:
- Link generation (per user)
- File access via secure links (per IP)
- API requests in general

## Cleanup

Expired and inactive links are automatically cleaned up. You can also run the cleanup script manually:

```bash
node scripts/cleanupExpiredLinks.js
```

## Frontend Integration

The secure links are designed to work with the frontend at:
- Link generation: Dashboard with SecureLinkModal component
- Link access: `/secure/:token` route with SecureAccess component

## Example Usage

### Generate a secure link:
```javascript
const response = await fetch('/api/files/file-id/generate-link', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer your-token',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    expiresInHours: 48,
    maxAccessCount: 50
  })
});
```

### Access a file via secure link:
```javascript
// View file
window.open(`/secure/${token}`);

// Download file
const response = await fetch(`/api/secure/${token}/download`);
const blob = await response.blob();
// Handle download...
```
