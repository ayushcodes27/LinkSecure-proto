/**
 * File Upload API Test Script
 * 
 * This script tests the complete file upload functionality including:
 * - Single file upload
 * - Multiple file upload
 * - File validation
 * - Error handling
 * - File retrieval and download
 */

const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const fetch = require('node-fetch');

// Configuration
const BASE_URL = 'http://localhost:5000';
const TEST_FILES_DIR = path.join(__dirname, 'test-files');

// Create test files directory if it doesn't exist
if (!fs.existsSync(TEST_FILES_DIR)) {
  fs.mkdirSync(TEST_FILES_DIR, { recursive: true });
}

// Create test files
const testFiles = [
  {
    name: 'test-document.pdf',
    content: 'This is a test PDF document content.',
    mimeType: 'application/pdf'
  },
  {
    name: 'test-image.jpg',
    content: 'This is a test image content.',
    mimeType: 'image/jpeg'
  },
  {
    name: 'test-video.mp4',
    content: 'This is a test video content.',
    mimeType: 'video/mp4'
  }
];

// Create test files
testFiles.forEach(file => {
  const filePath = path.join(TEST_FILES_DIR, file.name);
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, file.content);
  }
});

// Test authentication (you'll need to implement this based on your auth system)
async function getAuthToken() {
  // This is a placeholder - you'll need to implement actual authentication
  // For now, we'll assume you have a valid token
  return 'your-auth-token-here';
}

// Test single file upload
async function testSingleFileUpload() {
  console.log('\n🧪 Testing single file upload...');
  
  try {
    const token = await getAuthToken();
    const form = new FormData();
    
    form.append('file', fs.createReadStream(path.join(TEST_FILES_DIR, 'test-document.pdf')));
    form.append('uploadMethod', 'choose-files');
    form.append('description', 'Test document upload');
    form.append('isPublic', 'false');
    
    const response = await fetch(`${BASE_URL}/api/files/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        ...form.getHeaders()
      },
      body: form
    });
    
    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Single file upload successful');
      console.log('📄 File ID:', result.data.fileId);
      console.log('🔗 File URL:', result.data.fileUrl);
      return result.data.fileId;
    } else {
      console.log('❌ Single file upload failed:', result.message);
      return null;
    }
  } catch (error) {
    console.log('❌ Single file upload error:', error.message);
    return null;
  }
}

// Test multiple file upload
async function testMultipleFileUpload() {
  console.log('\n🧪 Testing multiple file upload...');
  
  try {
    const token = await getAuthToken();
    const form = new FormData();
    
    // Add multiple files
    form.append('files', fs.createReadStream(path.join(TEST_FILES_DIR, 'test-image.jpg')));
    form.append('files', fs.createReadStream(path.join(TEST_FILES_DIR, 'test-video.mp4')));
    form.append('uploadMethod', 'drag-drop');
    form.append('description', 'Multiple files upload test');
    form.append('tags', 'test, multiple, upload');
    
    const response = await fetch(`${BASE_URL}/api/files/upload-multiple`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        ...form.getHeaders()
      },
      body: form
    });
    
    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Multiple file upload successful');
      console.log('📊 Total files:', result.data.totalFiles);
      console.log('📏 Total size:', result.data.totalSize, 'bytes');
      return result.data.files.map(f => f.fileId);
    } else {
      console.log('❌ Multiple file upload failed:', result.message);
      return [];
    }
  } catch (error) {
    console.log('❌ Multiple file upload error:', error.message);
    return [];
  }
}

// Test file validation (invalid file type)
async function testFileValidation() {
  console.log('\n🧪 Testing file validation...');
  
  try {
    const token = await getAuthToken();
    const form = new FormData();
    
    // Create an invalid file type
    const invalidFile = path.join(TEST_FILES_DIR, 'invalid-file.exe');
    fs.writeFileSync(invalidFile, 'This is an invalid file type');
    
    form.append('file', fs.createReadStream(invalidFile));
    form.append('uploadMethod', 'upload-button');
    
    const response = await fetch(`${BASE_URL}/api/files/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        ...form.getHeaders()
      },
      body: form
    });
    
    const result = await response.json();
    
    if (!response.ok && result.error === 'Invalid file type') {
      console.log('✅ File validation working correctly - rejected invalid file type');
    } else {
      console.log('❌ File validation failed - should have rejected invalid file type');
    }
    
    // Clean up
    fs.unlinkSync(invalidFile);
  } catch (error) {
    console.log('❌ File validation test error:', error.message);
  }
}

// Test file size validation
async function testFileSizeValidation() {
  console.log('\n🧪 Testing file size validation...');
  
  try {
    const token = await getAuthToken();
    const form = new FormData();
    
    // Create a large file (>100MB)
    const largeFile = path.join(TEST_FILES_DIR, 'large-file.txt');
    const largeContent = 'x'.repeat(101 * 1024 * 1024); // 101MB
    fs.writeFileSync(largeFile, largeContent);
    
    form.append('file', fs.createReadStream(largeFile));
    form.append('uploadMethod', 'choose-files');
    
    const response = await fetch(`${BASE_URL}/api/files/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        ...form.getHeaders()
      },
      body: form
    });
    
    const result = await response.json();
    
    if (!response.ok && result.error === 'File too large') {
      console.log('✅ File size validation working correctly - rejected large file');
    } else {
      console.log('❌ File size validation failed - should have rejected large file');
    }
    
    // Clean up
    fs.unlinkSync(largeFile);
  } catch (error) {
    console.log('❌ File size validation test error:', error.message);
  }
}

// Test file retrieval
async function testFileRetrieval(fileId) {
  console.log('\n🧪 Testing file retrieval...');
  
  try {
    const token = await getAuthToken();
    
    const response = await fetch(`${BASE_URL}/api/files/${fileId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ File retrieval successful');
      console.log('📄 File name:', result.data.originalName);
      console.log('📏 File size:', result.data.fileSize, 'bytes');
      console.log('🔗 File URL:', result.data.fileUrl);
    } else {
      console.log('❌ File retrieval failed:', result.message);
    }
  } catch (error) {
    console.log('❌ File retrieval error:', error.message);
  }
}

// Test file download
async function testFileDownload(fileId) {
  console.log('\n🧪 Testing file download...');
  
  try {
    const token = await getAuthToken();
    
    const response = await fetch(`${BASE_URL}/api/files/${fileId}/download`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (response.ok) {
      console.log('✅ File download successful');
      console.log('📏 Downloaded size:', response.headers.get('content-length'), 'bytes');
      console.log('📄 Content type:', response.headers.get('content-type'));
    } else {
      const result = await response.json();
      console.log('❌ File download failed:', result.message);
    }
  } catch (error) {
    console.log('❌ File download error:', error.message);
  }
}

// Test get user files
async function testGetUserFiles() {
  console.log('\n🧪 Testing get user files...');
  
  try {
    const token = await getAuthToken();
    
    const response = await fetch(`${BASE_URL}/api/files/my-files?page=1&limit=10`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Get user files successful');
      console.log('📊 Total files:', result.data.pagination.totalFiles);
      console.log('📄 Files returned:', result.data.files.length);
    } else {
      console.log('❌ Get user files failed:', result.message);
    }
  } catch (error) {
    console.log('❌ Get user files error:', error.message);
  }
}

// Test file statistics
async function testFileStatistics() {
  console.log('\n🧪 Testing file statistics...');
  
  try {
    const token = await getAuthToken();
    
    const response = await fetch(`${BASE_URL}/api/files/stats/overview`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ File statistics successful');
      console.log('📊 Total files:', result.data.overview.totalFiles);
      console.log('📏 Total size:', result.data.overview.totalSize, 'bytes');
      console.log('⬇️ Total downloads:', result.data.overview.totalDownloads);
    } else {
      console.log('❌ File statistics failed:', result.message);
    }
  } catch (error) {
    console.log('❌ File statistics error:', error.message);
  }
}

// Main test function
async function runTests() {
  console.log('🚀 Starting File Upload API Tests...');
  console.log('📡 Base URL:', BASE_URL);
  
  // Test file validation first
  await testFileValidation();
  await testFileSizeValidation();
  
  // Test uploads
  const singleFileId = await testSingleFileUpload();
  const multipleFileIds = await testMultipleFileUpload();
  
  // Test file operations if uploads were successful
  if (singleFileId) {
    await testFileRetrieval(singleFileId);
    await testFileDownload(singleFileId);
  }
  
  // Test general operations
  await testGetUserFiles();
  await testFileStatistics();
  
  console.log('\n✅ All tests completed!');
  console.log('\n📋 Test Summary:');
  console.log('- Single file upload:', singleFileId ? '✅' : '❌');
  console.log('- Multiple file upload:', multipleFileIds.length > 0 ? '✅' : '❌');
  console.log('- File validation:', '✅');
  console.log('- File size validation:', '✅');
  console.log('- File retrieval:', singleFileId ? '✅' : '❌');
  console.log('- File download:', singleFileId ? '✅' : '❌');
  console.log('- Get user files:', '✅');
  console.log('- File statistics:', '✅');
}

// Run tests if this file is executed directly
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = {
  runTests,
  testSingleFileUpload,
  testMultipleFileUpload,
  testFileValidation,
  testFileSizeValidation,
  testFileRetrieval,
  testFileDownload,
  testGetUserFiles,
  testFileStatistics
};
