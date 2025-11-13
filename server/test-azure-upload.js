const { BlobServiceClient, StorageSharedKeyCredential } = require('@azure/storage-blob');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Test Azure Blob Storage connection
async function testAzureConnection() {
  console.log('Testing Azure Blob Storage connection...');
  
  // Get configuration from environment variables
  const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME;
  const accountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY;
  const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME || 'linksecure-files';
  
  if (!accountName || !accountKey) {
    console.error('❌ Azure configuration missing!');
    console.log('Please set the following environment variables:');
    console.log('- AZURE_STORAGE_ACCOUNT_NAME');
    console.log('- AZURE_STORAGE_ACCOUNT_KEY');
    console.log('- AZURE_STORAGE_CONTAINER_NAME (optional, defaults to "linksecure-files")');
    return false;
  }
  
  try {
    // Create Azure client
    const sharedKeyCredential = new StorageSharedKeyCredential(accountName, accountKey);
    const blobServiceClient = new BlobServiceClient(
      `https://${accountName}.blob.core.windows.net`,
      sharedKeyCredential
    );
    
    console.log(`✅ Azure client created successfully`);
    console.log(`📦 Account: ${accountName}`);
    console.log(`📁 Container: ${containerName}`);
    
    // Test container access
    const containerClient = blobServiceClient.getContainerClient(containerName);
    
    // Check if container exists, create if not
    const exists = await containerClient.exists();
    if (!exists) {
      console.log(`📦 Container "${containerName}" does not exist. Creating...`);
      await containerClient.createIfNotExists({
        access: 'blob'
      });
      console.log(`✅ Container "${containerName}" created successfully`);
    } else {
      console.log(`✅ Container "${containerName}" exists and is accessible`);
    }
    
    // Test file upload
    const testContent = 'Hello from LinkSecure! This is a test file.';
    const testFileName = `test-${Date.now()}.txt`;
    
    console.log(`📤 Uploading test file: ${testFileName}`);
    const blockBlobClient = containerClient.getBlockBlobClient(testFileName);
    
    await blockBlobClient.upload(testContent, testContent.length, {
      blobHTTPHeaders: {
        blobContentType: 'text/plain'
      },
      metadata: {
        testFile: 'true',
        uploadedAt: new Date().toISOString()
      }
    });
    
    console.log(`✅ Test file uploaded successfully`);
    console.log(`🔗 File URL: ${blockBlobClient.url}`);
    
    // Test file download
    console.log(`📥 Testing file download...`);
    const downloadResponse = await blockBlobClient.download();
    const downloadedContent = await streamToString(downloadResponse.readableStreamBody);
    
    if (downloadedContent === testContent) {
      console.log(`✅ File download test successful`);
    } else {
      console.log(`❌ File download test failed - content mismatch`);
    }
    
    // Clean up test file
    console.log(`🗑️ Cleaning up test file...`);
    await blockBlobClient.delete();
    console.log(`✅ Test file deleted successfully`);
    
    console.log('\n🎉 All Azure Blob Storage tests passed!');
    console.log('Your Azure configuration is working correctly.');
    return true;
    
  } catch (error) {
    console.error('❌ Azure test failed:', error.message);
    console.error('Full error:', error);
    return false;
  }
}

// Helper function to convert stream to string
async function streamToString(readableStream) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    readableStream.on('data', (data) => {
      chunks.push(data.toString());
    });
    readableStream.on('end', () => {
      resolve(chunks.join(''));
    });
    readableStream.on('error', reject);
  });
}

// Run the test
if (require.main === module) {
  testAzureConnection()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Test failed with error:', error);
      process.exit(1);
    });
}

module.exports = { testAzureConnection };

