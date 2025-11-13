# File Upload API Configuration Guide

## Environment Variables

Create a `.env` file in the server directory with the following variables:

```env
# Server Configuration
PORT=5000
NODE_ENV=development
BASE_URL=http://localhost:5000

# Database Configuration
MONGO_URI=mongodb://localhost:27017/linksecure

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-here
JWT_EXPIRES_IN=7d

# File Storage Configuration
STORAGE_TYPE=local
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=104857600

# CORS Configuration
CORS_ORIGIN=http://localhost:3000

# Azure Blob Storage Configuration (if using Azure storage)
# STORAGE_TYPE=azure
# AZURE_STORAGE_ACCOUNT_NAME=your-storage-account-name
# AZURE_STORAGE_ACCOUNT_KEY=your-storage-account-key
# AZURE_STORAGE_CONTAINER_NAME=linksecure-files
```

## Setup Instructions

### 1. Install Dependencies

```bash
cd server
npm install
```

### 2. Database Setup

Make sure MongoDB is running and accessible at the URI specified in `MONGO_URI`.

### 3. Create Upload Directory

The uploads directory will be created automatically, but you can create it manually:

```bash
mkdir uploads
```

### 4. Start the Server

```bash
# Development mode
npm run dev

# Production mode
npm run build
npm start
```

## File Storage Options

### Local Storage (Default)

Files are stored in the local filesystem in the `uploads/` directory. This is suitable for development and small-scale deployments.

### Azure Blob Storage

For production deployments, you can configure Azure Blob Storage by:

1. Creating an Azure Storage Account
2. Getting your storage account name and access key
3. Creating a container for your files
4. Setting the environment variables:
   - `STORAGE_TYPE=azure`
   - `AZURE_STORAGE_ACCOUNT_NAME=your-storage-account-name`
   - `AZURE_STORAGE_ACCOUNT_KEY=your-storage-account-key`
   - `AZURE_STORAGE_CONTAINER_NAME=your-container-name`

## Security Considerations

1. **JWT Secret**: Use a strong, random JWT secret in production
2. **File Validation**: The system validates file types and sizes
3. **Access Control**: Users can only access their own files
4. **Input Sanitization**: All inputs are validated and sanitized

## Testing

Use the provided test script to verify the API functionality:

```bash
# Install test dependencies
npm install form-data node-fetch

# Run tests
node test-file-upload.js
```

## Production Deployment

1. Set `NODE_ENV=production`
2. Use a strong JWT secret
3. Configure proper CORS origins
4. Set up proper file storage (Azure Blob Storage recommended)
5. Use HTTPS in production
6. Set up proper logging and monitoring
