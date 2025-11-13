# Azure Blob Storage Setup Guide

This guide will help you configure your LinkSecure application to use Microsoft Azure Blob Storage for file uploads.

## Prerequisites

1. An Azure account with an active subscription
2. Node.js and npm installed on your system

## Step 1: Create Azure Storage Account

1. Log in to the [Azure Portal](https://portal.azure.com)
2. Click "Create a resource" → "Storage" → "Storage account"
3. Fill in the required details:
   - **Subscription**: Select your subscription
   - **Resource group**: Create new or select existing
   - **Storage account name**: Choose a unique name (e.g., `linksecurestorage`)
   - **Region**: Choose a region close to your users
   - **Performance**: Standard (unless you need premium)
   - **Redundancy**: LRS (Locally-redundant storage) for cost efficiency
4. Click "Review + create" → "Create"

## Step 2: Get Storage Account Credentials

1. Go to your storage account in the Azure Portal
2. In the left menu, click "Access keys"
3. Copy the following values:
   - **Storage account name** (from the top of the page)
   - **Key** (use key1 or key2)

## Step 3: Create a Container

1. In your storage account, click "Containers" in the left menu
2. Click "+ Container"
3. Enter a name (e.g., `linksecure-files`)
4. Set the public access level to "Blob (anonymous read access for blobs only)"
5. Click "Create"

## Step 4: Configure Environment Variables

Create a `.env` file in your server directory with the following configuration:

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

# File Storage Configuration - Set to Azure
STORAGE_TYPE=azure
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=104857600

# CORS Configuration
CORS_ORIGIN=http://localhost:3000

# Azure Blob Storage Configuration
AZURE_STORAGE_ACCOUNT_NAME=your-storage-account-name
AZURE_STORAGE_ACCOUNT_KEY=your-storage-account-key
AZURE_STORAGE_CONTAINER_NAME=linksecure-files
```

Replace the following values with your actual Azure credentials:
- `your-storage-account-name`: The name of your Azure storage account
- `your-storage-account-key`: The access key from step 2
- `linksecure-files`: The container name you created in step 3

## Step 5: Install Dependencies

Navigate to your server directory and install the Azure Blob Storage package:

```bash
cd server
npm install @azure/storage-blob
```

## Step 6: Test the Configuration

1. Start your server:
   ```bash
   npm run dev
   ```

2. Start your client:
   ```bash
   cd ../client
   npm run dev
   ```

3. Try uploading a file through the web interface
4. Check your Azure storage account container to verify the file was uploaded

## Troubleshooting

### Common Issues

1. **Authentication Error**: Double-check your storage account name and access key
2. **Container Not Found**: Ensure the container name matches exactly
3. **Permission Denied**: Verify the container has the correct access level
4. **Network Issues**: Check your internet connection and Azure service status

### Verification Steps

1. Check the server logs for any error messages
2. Verify the environment variables are loaded correctly
3. Test the Azure connection using the Azure Portal
4. Ensure the container exists and is accessible

## Security Best Practices

1. **Never commit your `.env` file** to version control
2. **Use managed identities** in production instead of access keys
3. **Enable HTTPS** for all communications
4. **Set up proper CORS** policies
5. **Use Azure Key Vault** for storing sensitive configuration

## Production Considerations

1. **Use Azure Active Directory** for authentication
2. **Enable soft delete** for blob storage
3. **Set up monitoring and alerts**
4. **Configure backup and disaster recovery**
5. **Use Azure CDN** for better performance

## Cost Optimization

1. **Choose the right redundancy level** (LRS vs GRS vs ZRS)
2. **Set up lifecycle management** to move old files to cheaper tiers
3. **Monitor usage** and set up billing alerts
4. **Use appropriate access tiers** (Hot, Cool, Archive)

For more information, refer to the [Azure Blob Storage documentation](https://docs.microsoft.com/en-us/azure/storage/blobs/).

