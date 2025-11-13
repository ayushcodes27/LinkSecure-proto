# File Upload API Documentation

## Overview

This API provides comprehensive file upload functionality with support for multiple upload methods, robust validation, and secure file storage. The system supports three distinct upload methods: drag-and-drop, clicking a 'Choose Files' button, and clicking an '+ Upload File' button.

## Base URL

```
http://localhost:5000/api/files
```

## Authentication

All endpoints require authentication via Bearer token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

## Supported File Types

### Documents
- PDF (`.pdf`)
- Word documents (`.doc`, `.docx`)
- Excel spreadsheets (`.xls`, `.xlsx`)
- PowerPoint presentations (`.ppt`, `.pptx`)
- Text files (`.txt`)
- CSV files (`.csv`)

### Images
- JPEG (`.jpg`, `.jpeg`)
- PNG (`.png`)
- GIF (`.gif`)
- WebP (`.webp`)
- SVG (`.svg`)

### Videos
- MP4 (`.mp4`)
- AVI (`.avi`)
- MOV (`.mov`)
- WMV (`.wmv`)
- FLV (`.flv`)
- WebM (`.webm`)

### Audio
- MP3 (`.mp3`)
- WAV (`.wav`)
- OGG (`.ogg`)
- AAC (`.aac`)

### Archives
- ZIP (`.zip`)
- RAR (`.rar`)
- 7Z (`.7z`)
- GZIP (`.gz`)

### Other
- JSON (`.json`)
- XML (`.xml`)

## File Size Limits

- **Maximum file size**: 100MB
- **Maximum files per request**: 10 files

## API Endpoints

### 1. Upload Single File

Upload a single file using multipart/form-data.

**Endpoint**: `POST /api/files/upload`

**Request**:
- **Content-Type**: `multipart/form-data`
- **Body**:
  - `file` (required): The file to upload
  - `uploadMethod` (optional): Upload method (`drag-drop`, `choose-files`, `upload-button`)
  - `description` (optional): File description
  - `tags` (optional): Comma-separated tags
  - `category` (optional): File category
  - `isPublic` (optional): Whether file is public (boolean)

**Response** (201 Created):
```json
{
  "success": true,
  "message": "File uploaded successfully",
  "data": {
    "fileId": "uuid-string",
    "originalName": "document.pdf",
    "fileName": "document_1234567890_abc12345.pdf",
    "fileUrl": "http://localhost:5000/uploads/document_1234567890_abc12345.pdf",
    "mimeType": "application/pdf",
    "fileSize": 1024000,
    "uploadMethod": "choose-files",
    "metadata": {
      "description": "Important document",
      "tags": ["work", "important"],
      "category": "documents"
    },
    "isPublic": false,
    "uploadedAt": "2024-01-15T10:30:00.000Z",
    "downloadCount": 0
  }
}
```

### 2. Upload Multiple Files

Upload multiple files in a single request.

**Endpoint**: `POST /api/files/upload-multiple`

**Request**:
- **Content-Type**: `multipart/form-data`
- **Body**:
  - `files` (required): Array of files to upload
  - `uploadMethod` (optional): Upload method
  - `description` (optional): Description for all files
  - `tags` (optional): Comma-separated tags
  - `category` (optional): File category
  - `isPublic` (optional): Whether files are public

**Response** (201 Created):
```json
{
  "success": true,
  "message": "3 files uploaded successfully",
  "data": {
    "files": [
      {
        "fileId": "uuid-string-1",
        "originalName": "image1.jpg",
        "fileName": "image1_1234567890_abc12345.jpg",
        "fileUrl": "http://localhost:5000/uploads/image1_1234567890_abc12345.jpg",
        "mimeType": "image/jpeg",
        "fileSize": 512000,
        "uploadMethod": "drag-drop",
        "metadata": {
          "description": "Multiple files upload",
          "tags": ["images"],
          "category": "media"
        },
        "isPublic": false,
        "uploadedAt": "2024-01-15T10:30:00.000Z",
        "downloadCount": 0
      }
    ],
    "totalFiles": 3,
    "totalSize": 2048000
  }
}
```

### 3. Get User's Files

Retrieve a paginated list of user's uploaded files.

**Endpoint**: `GET /api/files/my-files`

**Query Parameters**:
- `page` (optional): Page number (default: 1)
- `limit` (optional): Files per page (default: 10)

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "files": [
      {
        "fileId": "uuid-string",
        "originalName": "document.pdf",
        "fileName": "document_1234567890_abc12345.pdf",
        "fileUrl": "http://localhost:5000/uploads/document_1234567890_abc12345.pdf",
        "mimeType": "application/pdf",
        "fileSize": 1024000,
        "uploadMethod": "choose-files",
        "metadata": {
          "description": "Important document",
          "tags": ["work", "important"],
          "category": "documents"
        },
        "isPublic": false,
        "uploadedAt": "2024-01-15T10:30:00.000Z",
        "downloadCount": 5
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 3,
      "totalFiles": 25,
      "hasNextPage": true,
      "hasPrevPage": false
    }
  }
}
```

### 4. Get File by ID

Retrieve a specific file's metadata.

**Endpoint**: `GET /api/files/:fileId`

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "fileId": "uuid-string",
    "originalName": "document.pdf",
    "fileName": "document_1234567890_abc12345.pdf",
    "fileUrl": "http://localhost:5000/uploads/document_1234567890_abc12345.pdf",
    "mimeType": "application/pdf",
    "fileSize": 1024000,
    "uploadMethod": "choose-files",
    "metadata": {
      "description": "Important document",
      "tags": ["work", "important"],
      "category": "documents"
    },
    "isPublic": false,
    "uploadedAt": "2024-01-15T10:30:00.000Z",
    "downloadCount": 5,
    "lastAccessedAt": "2024-01-15T15:45:00.000Z"
  }
}
```

### 5. Download File

Download a file by its ID.

**Endpoint**: `GET /api/files/:fileId/download`

**Response** (200 OK):
- **Content-Type**: File's MIME type
- **Content-Disposition**: `attachment; filename="original-name"`
- **Content-Length**: File size in bytes
- **Body**: File binary data

### 6. Update File Metadata

Update a file's metadata (description, tags, category, public status).

**Endpoint**: `PUT /api/files/:fileId`

**Request**:
```json
{
  "description": "Updated description",
  "tags": ["updated", "tags"],
  "category": "updated-category",
  "isPublic": true
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "message": "File metadata updated successfully",
  "data": {
    "fileId": "uuid-string",
    "originalName": "document.pdf",
    "fileName": "document_1234567890_abc12345.pdf",
    "fileUrl": "http://localhost:5000/uploads/document_1234567890_abc12345.pdf",
    "mimeType": "application/pdf",
    "fileSize": 1024000,
    "uploadMethod": "choose-files",
    "metadata": {
      "description": "Updated description",
      "tags": ["updated", "tags"],
      "category": "updated-category"
    },
    "isPublic": true,
    "uploadedAt": "2024-01-15T10:30:00.000Z",
    "downloadCount": 5
  }
}
```

### 7. Delete File

Delete a file and its metadata.

**Endpoint**: `DELETE /api/files/:fileId`

**Response** (200 OK):
```json
{
  "success": true,
  "message": "File deleted successfully",
  "data": {
    "fileId": "uuid-string",
    "originalName": "document.pdf",
    "deletedAt": "2024-01-15T16:00:00.000Z"
  }
}
```

### 8. Get File Statistics

Get overview statistics for user's files.

**Endpoint**: `GET /api/files/stats/overview`

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "overview": {
      "totalFiles": 25,
      "totalSize": 104857600,
      "totalDownloads": 150,
      "avgFileSize": 4194304
    },
    "fileTypes": [
      {
        "_id": "application/pdf",
        "count": 10,
        "totalSize": 52428800
      },
      {
        "_id": "image/jpeg",
        "count": 15,
        "totalSize": 52428800
      }
    ],
    "uploadMethods": [
      {
        "_id": "choose-files",
        "count": 15
      },
      {
        "_id": "drag-drop",
        "count": 8
      },
      {
        "_id": "upload-button",
        "count": 2
      }
    ]
  }
}
```

## Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "error": "File too large",
  "message": "File size exceeds the maximum limit of 100MB"
}
```

### 401 Unauthorized
```json
{
  "success": false,
  "error": "Invalid Token",
  "message": "Invalid authentication token"
}
```

### 404 Not Found
```json
{
  "success": false,
  "error": "File not found",
  "message": "The requested file does not exist or you do not have permission to access it"
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "error": "Internal Server Error",
  "message": "An unexpected error occurred"
}
```

## Upload Methods

The API supports three distinct upload methods that can be specified in the request:

1. **`drag-drop`**: File was uploaded via drag and drop interface
2. **`choose-files`**: File was uploaded by clicking a "Choose Files" button
3. **`upload-button`**: File was uploaded by clicking an "+ Upload File" button

## File Storage

Files are stored locally in the `uploads/` directory by default. The system generates unique filenames to prevent conflicts and provides direct access via HTTP URLs.

## Security Features

- **Authentication**: All endpoints require valid JWT tokens
- **File validation**: Strict MIME type and extension checking
- **Size limits**: 100MB maximum file size
- **Unique filenames**: Prevents filename conflicts and directory traversal
- **User isolation**: Users can only access their own files (unless public)
- **Input sanitization**: All user inputs are validated and sanitized

## Usage Examples

### JavaScript/Node.js
```javascript
const FormData = require('form-data');
const fs = require('fs');
const fetch = require('node-fetch');

const form = new FormData();
form.append('file', fs.createReadStream('document.pdf'));
form.append('uploadMethod', 'choose-files');
form.append('description', 'Important document');

const response = await fetch('http://localhost:5000/api/files/upload', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer your-jwt-token',
    ...form.getHeaders()
  },
  body: form
});

const result = await response.json();
console.log(result);
```

### cURL
```bash
curl -X POST http://localhost:5000/api/files/upload \
  -H "Authorization: Bearer your-jwt-token" \
  -F "file=@document.pdf" \
  -F "uploadMethod=choose-files" \
  -F "description=Important document"
```

### Python
```python
import requests

url = 'http://localhost:5000/api/files/upload'
headers = {'Authorization': 'Bearer your-jwt-token'}
files = {'file': open('document.pdf', 'rb')}
data = {
    'uploadMethod': 'choose-files',
    'description': 'Important document'
}

response = requests.post(url, headers=headers, files=files, data=data)
print(response.json())
```
