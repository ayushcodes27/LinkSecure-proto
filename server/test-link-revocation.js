/**
 * Test script for Link Revocation feature
 * Tests the new endpoints: GET /api/links/my-links and PATCH /api/links/:short_code/revoke
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:5000';

// Test user credentials (you'll need to update these with real credentials)
const TEST_USER = {
  email: 'test@example.com',
  password: 'testpassword123'
};

let authToken = null;
let testShortCode = null;

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

/**
 * Step 1: Login to get auth token
 */
async function login() {
  log('\n📝 Step 1: Logging in...', 'blue');
  try {
    const response = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: TEST_USER.email,
      password: TEST_USER.password
    });
    
    authToken = response.data.token;
    log(`✅ Login successful! Token: ${authToken.substring(0, 20)}...`, 'green');
    return true;
  } catch (error) {
    log(`❌ Login failed: ${error.response?.data?.message || error.message}`, 'red');
    log('💡 Please update TEST_USER credentials in the script or register a new user', 'yellow');
    return false;
  }
}

/**
 * Step 2: Create a test link
 */
async function createTestLink() {
  log('\n🔗 Step 2: Creating a test link...', 'blue');
  try {
    const response = await axios.post(
      `${BASE_URL}/api/v1/links/create`,
      {
        owner_id: 'test-user-id',
        blob_path: 'test-user/test-file.pdf',
        expiry_minutes: 1440,
        metadata: {
          original_file_name: 'test-file.pdf',
          file_size: 12345,
          mime_type: 'application/pdf'
        }
      }
    );
    
    testShortCode = response.data.short_code;
    log(`✅ Link created successfully!`, 'green');
    log(`   Short code: ${testShortCode}`, 'cyan');
    log(`   Link URL: ${response.data.link}`, 'cyan');
    log(`   Expires at: ${response.data.expires_at}`, 'cyan');
    return true;
  } catch (error) {
    log(`❌ Failed to create link: ${error.response?.data?.message || error.message}`, 'red');
    return false;
  }
}

/**
 * Step 3: Test GET /api/links/my-links endpoint
 */
async function testGetMyLinks() {
  log('\n📋 Step 3: Testing GET /api/links/my-links...', 'blue');
  try {
    const response = await axios.get(`${BASE_URL}/api/links/my-links`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    log(`✅ GET /api/links/my-links successful!`, 'green');
    log(`   Found ${response.data.links.length} links`, 'cyan');
    
    if (response.data.links.length > 0) {
      const link = response.data.links[0];
      log(`   First link:`, 'cyan');
      log(`     - Short code: ${link.short_code}`, 'cyan');
      log(`     - Status: ${link.status}`, 'cyan');
      log(`     - Access count: ${link.access_count}`, 'cyan');
      log(`     - Created: ${new Date(link.created_at).toLocaleString()}`, 'cyan');
      
      // Use this link for revocation test if we don't have a test link yet
      if (!testShortCode) {
        testShortCode = link.short_code;
        log(`   Using this link for revocation test`, 'yellow');
      }
    }
    
    return true;
  } catch (error) {
    log(`❌ Failed to get my links: ${error.response?.data?.message || error.message}`, 'red');
    if (error.response?.status === 401) {
      log('💡 Authentication failed. Token may be invalid or expired.', 'yellow');
    }
    return false;
  }
}

/**
 * Step 4: Test PATCH /api/links/:short_code/revoke endpoint
 */
async function testRevokeLink() {
  log('\n🚫 Step 4: Testing PATCH /api/links/:short_code/revoke...', 'blue');
  
  if (!testShortCode) {
    log('⚠️  No short code available for revocation test. Skipping...', 'yellow');
    return false;
  }
  
  try {
    const response = await axios.patch(
      `${BASE_URL}/api/links/${testShortCode}/revoke`,
      {},
      {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      }
    );
    
    log(`✅ PATCH /api/links/${testShortCode}/revoke successful!`, 'green');
    log(`   Message: ${response.data.message}`, 'cyan');
    log(`   Updated status: ${response.data.link.status}`, 'cyan');
    log(`   Updated is_active: ${response.data.link.is_active}`, 'cyan');
    return true;
  } catch (error) {
    log(`❌ Failed to revoke link: ${error.response?.data?.message || error.message}`, 'red');
    if (error.response?.status === 403) {
      log('💡 Ownership validation working! You do not own this link.', 'yellow');
    } else if (error.response?.status === 404) {
      log('💡 Link not found. It may have been deleted.', 'yellow');
    }
    return false;
  }
}

/**
 * Step 5: Verify revoked link returns 410 Gone
 */
async function testAccessRevokedLink() {
  log('\n🔍 Step 5: Testing access to revoked link...', 'blue');
  
  if (!testShortCode) {
    log('⚠️  No short code available for access test. Skipping...', 'yellow');
    return false;
  }
  
  try {
    await axios.get(`${BASE_URL}/s/${testShortCode}`);
    log(`❌ Link is still accessible! Revocation may not be working.`, 'red');
    return false;
  } catch (error) {
    if (error.response?.status === 410) {
      log(`✅ Revoked link correctly returns 410 Gone!`, 'green');
      log(`   Response includes revocation message`, 'cyan');
      return true;
    } else {
      log(`⚠️  Unexpected status code: ${error.response?.status}`, 'yellow');
      log(`   Expected 410 Gone for revoked link`, 'yellow');
      return false;
    }
  }
}

/**
 * Run all tests
 */
async function runTests() {
  log('\n' + '='.repeat(60), 'cyan');
  log('  🧪 Link Revocation Feature Test Suite', 'cyan');
  log('='.repeat(60), 'cyan');
  
  // Check if server is running
  log('\n🔌 Checking server connection...', 'blue');
  try {
    await axios.get(`${BASE_URL}/health`);
    log('✅ Server is running!', 'green');
  } catch (error) {
    log('❌ Cannot connect to server. Make sure it is running on port 5000.', 'red');
    process.exit(1);
  }
  
  const results = {
    login: false,
    createLink: false,
    getMyLinks: false,
    revokeLink: false,
    accessRevoked: false
  };
  
  // Run tests sequentially
  results.login = await login();
  if (!results.login) {
    log('\n⚠️  Skipping remaining tests due to login failure', 'yellow');
    log('💡 To test without login, manually create a link and update testShortCode in the script', 'yellow');
    return;
  }
  
  results.createLink = await createTestLink();
  results.getMyLinks = await testGetMyLinks();
  results.revokeLink = await testRevokeLink();
  results.accessRevoked = await testAccessRevokedLink();
  
  // Summary
  log('\n' + '='.repeat(60), 'cyan');
  log('  📊 Test Results Summary', 'cyan');
  log('='.repeat(60), 'cyan');
  
  const passed = Object.values(results).filter(r => r === true).length;
  const total = Object.keys(results).length;
  
  Object.entries(results).forEach(([test, passed]) => {
    const icon = passed ? '✅' : '❌';
    const color = passed ? 'green' : 'red';
    log(`${icon} ${test.padEnd(20)}: ${passed ? 'PASSED' : 'FAILED'}`, color);
  });
  
  log('\n' + '-'.repeat(60), 'cyan');
  log(`Total: ${passed}/${total} tests passed`, passed === total ? 'green' : 'yellow');
  log('='.repeat(60) + '\n', 'cyan');
  
  if (passed === total) {
    log('🎉 All tests passed! Link revocation feature is working correctly.', 'green');
  } else {
    log('⚠️  Some tests failed. Please review the output above.', 'yellow');
  }
}

// Run the tests
runTests().catch(error => {
  log(`\n❌ Fatal error: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});
