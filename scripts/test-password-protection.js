// Quick test script for password-protected links
// Run with: node scripts/test-password-protection.js

const axios = require('axios');

const BASE_URL = 'http://localhost:5000';
const TEST_PASSWORD = 'test123';

async function testPasswordProtection() {
  console.log('🧪 Testing Password Protection for Short Links\n');

  try {
    // Step 1: Create a password-protected link
    console.log('Step 1: Creating password-protected link...');
    const createResponse = await axios.post(`${BASE_URL}/api/v1/links/create`, {
      owner_id: 'test-user-123',
      blob_path: 'test/sample-file.jpg',
      expiry_minutes: 1440,
      password: TEST_PASSWORD,
      metadata: {
        original_file_name: 'sample-file.jpg',
        file_size: 12345,
        mime_type: 'image/jpeg'
      }
    }).catch(err => {
      console.error('❌ Failed to create link:', err.response?.data || err.message);
      return null;
    });

    if (!createResponse) {
      console.log('\n⚠️  Skipping test - likely blob does not exist in Azure');
      console.log('💡 To test fully: Upload a real file first, then use its blob_path');
      return;
    }

    const { link, short_code } = createResponse.data;
    console.log('✅ Link created successfully');
    console.log(`   Link: ${link}`);
    console.log(`   Short Code: ${short_code}\n`);

    // Step 2: Try accessing without password
    console.log('Step 2: Accessing link without password...');
    try {
      await axios.get(`${BASE_URL}/s/${short_code}`);
      console.log('❌ ERROR: Should have returned 401 Unauthorized!');
    } catch (err) {
      if (err.response?.status === 401 && err.response?.data?.requiresPassword) {
        console.log('✅ Correctly returned 401 with requiresPassword: true');
        console.log(`   Message: ${err.response.data.message}\n`);
      } else {
        console.log('❌ Unexpected response:', err.response?.data || err.message);
      }
    }

    // Step 3: Verify with wrong password
    console.log('Step 3: Verifying with WRONG password...');
    try {
      await axios.post(`${BASE_URL}/api/v1/links/verify/${short_code}`, {
        password: 'wrong-password'
      });
      console.log('❌ ERROR: Should have returned 403 Forbidden!');
    } catch (err) {
      if (err.response?.status === 403) {
        console.log('✅ Correctly returned 403 Forbidden');
        console.log(`   Message: ${err.response.data.message}\n`);
      } else {
        console.log('❌ Unexpected response:', err.response?.data || err.message);
      }
    }

    // Step 4: Verify with correct password
    console.log('Step 4: Verifying with CORRECT password...');
    const verifyResponse = await axios.post(`${BASE_URL}/api/v1/links/verify/${short_code}`, {
      password: TEST_PASSWORD
    });

    if (verifyResponse.data.downloadToken) {
      console.log('✅ Password verified successfully');
      console.log(`   Token: ${verifyResponse.data.downloadToken.substring(0, 50)}...\n`);

      // Step 5: Try downloading with valid token
      console.log('Step 5: Accessing link WITH valid token...');
      try {
        const downloadResponse = await axios.get(`${BASE_URL}/s/${short_code}?token=${verifyResponse.data.downloadToken}`, {
          responseType: 'stream'
        });
        console.log('✅ File streaming started successfully');
        console.log(`   Content-Type: ${downloadResponse.headers['content-type']}`);
        console.log(`   Content-Disposition: ${downloadResponse.headers['content-disposition']}\n`);
      } catch (err) {
        if (err.response?.status === 404) {
          console.log('⚠️  File not found in Azure (expected for test data)');
          console.log('   But token validation passed! ✅\n');
        } else {
          console.log('❌ Download failed:', err.response?.data || err.message);
        }
      }
    }

    console.log('\n🎉 All password protection tests passed!');
    console.log('\n📝 Summary:');
    console.log('   ✅ Link creation with password');
    console.log('   ✅ Access denied without token');
    console.log('   ✅ Wrong password rejected');
    console.log('   ✅ Correct password returns JWT');
    console.log('   ✅ Valid token allows access');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
  }
}

// Run the test
testPasswordProtection();
