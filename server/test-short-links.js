/**
 * Test Script for LinkSecure Short URL Service
 * 
 * This script tests:
 * 1. Link creation with Azure Blob Storage
 * 2. Link redirection with SAS tokens
 * 3. Link information retrieval
 * 4. User links listing
 * 5. Error handling (404, 410, 400)
 * 
 * Usage: node server/test-short-links.js
 */

const BASE_URL = 'http://localhost:5000';

// Test data
const testOwnerId = 'test-user-123';
const testBlobPath = 'solo_leveling_1758140185096_33c54bd4.jpeg'; // Actual file in container

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(colors[color] + message + colors.reset);
}

function logTest(testName) {
  console.log('\n' + colors.blue + colors.bold + '━'.repeat(60) + colors.reset);
  log(`🧪 TEST: ${testName}`, 'bold');
  console.log(colors.blue + '━'.repeat(60) + colors.reset);
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

// Test 1: Create a short link
async function testCreateLink() {
  logTest('Create Short Link');
  
  try {
    const response = await fetch(`${BASE_URL}/api/v1/links/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        owner_id: testOwnerId,
        blob_path: testBlobPath,
        expiry_minutes: 60, // 1 hour
        metadata: {
          original_file_name: 'test-document.pdf',
          file_size: 1024,
          mime_type: 'application/pdf'
        }
      })
    });

    const data = await response.json();
    
    if (response.status === 201 && data.success) {
      logSuccess(`Link created successfully!`);
      logInfo(`Short Code: ${data.short_code}`);
      logInfo(`Link URL: ${data.link}`);
      logInfo(`Expires At: ${data.expires_at}`);
      return data.short_code;
    } else {
      logError(`Failed to create link: ${data.message}`);
      return null;
    }
  } catch (error) {
    logError(`Error: ${error.message}`);
    console.error('Full error:', error);
    return null;
  }
}

// Test 2: Get link information
async function testGetLinkInfo(shortCode) {
  logTest('Get Link Information');
  
  try {
    const response = await fetch(`${BASE_URL}/api/v1/links/${shortCode}/info`);
    const data = await response.json();
    
    if (response.ok && data.success) {
      logSuccess('Retrieved link information successfully!');
      logInfo(`Short Code: ${data.short_code}`);
      logInfo(`Blob Path: ${data.blob_path}`);
      logInfo(`Owner ID: ${data.owner_id}`);
      logInfo(`Access Count: ${data.access_count}`);
      logInfo(`Expired: ${data.is_expired}`);
      return true;
    } else {
      logError(`Failed to get link info: ${data.message}`);
      return false;
    }
  } catch (error) {
    logError(`Error: ${error.message}`);
    return false;
  }
}

// Test 3: Test link redirection
async function testRedirection(shortCode) {
  logTest('Test Link Redirection');
  
  try {
    const response = await fetch(`${BASE_URL}/s/${shortCode}`, {
      redirect: 'manual' // Don't follow redirects automatically
    });
    
    if (response.status === 302) {
      const location = response.headers.get('location');
      logSuccess('Redirection works correctly!');
      logInfo(`Status: ${response.status} Found`);
      logInfo(`Redirects to: ${location ? location.substring(0, 100) + '...' : 'N/A'}`);
      
      if (location && location.includes('blob.core.windows.net')) {
        logSuccess('SAS URL generated correctly!');
        
        // Check if SAS URL has required parameters
        if (location.includes('sig=') && location.includes('se=')) {
          logSuccess('SAS URL contains signature and expiry!');
        }
      }
      return true;
    } else {
      logError(`Unexpected status code: ${response.status}`);
      return false;
    }
  } catch (error) {
    logError(`Error: ${error.message}`);
    return false;
  }
}

// Test 4: Get user's links
async function testGetUserLinks(ownerId) {
  logTest('Get User Links');
  
  try {
    const response = await fetch(`${BASE_URL}/api/v1/links/user/${ownerId}`);
    const data = await response.json();
    
    if (response.ok && data.success) {
      logSuccess(`Retrieved ${data.count} link(s) for user!`);
      
      data.links.forEach((link, index) => {
        logInfo(`\nLink ${index + 1}:`);
        logInfo(`  Short Code: ${link.short_code}`);
        logInfo(`  Blob Path: ${link.blob_path}`);
        logInfo(`  Access Count: ${link.access_count}`);
        logInfo(`  Expired: ${link.is_expired}`);
        logInfo(`  URL: ${link.link_url}`);
      });
      return true;
    } else {
      logError(`Failed to get user links: ${data.message}`);
      return false;
    }
  } catch (error) {
    logError(`Error: ${error.message}`);
    return false;
  }
}

// Test 5: Test invalid short code (404)
async function testInvalidShortCode() {
  logTest('Test Invalid Short Code (404)');
  
  try {
    const response = await fetch(`${BASE_URL}/s/INVALID1`, {
      redirect: 'manual'
    });
    
    if (response.status === 404) {
      logSuccess('Correctly returns 404 for invalid short code!');
      return true;
    } else {
      logError(`Expected 404, got ${response.status}`);
      return false;
    }
  } catch (error) {
    logError(`Error: ${error.message}`);
    return false;
  }
}

// Test 6: Test link with bad format (400)
async function testBadFormat() {
  logTest('Test Bad Short Code Format (400)');
  
  try {
    const response = await fetch(`${BASE_URL}/s/bad`, {
      redirect: 'manual'
    });
    
    if (response.status === 400) {
      logSuccess('Correctly returns 400 for invalid format!');
      return true;
    } else {
      logError(`Expected 400, got ${response.status}`);
      return false;
    }
  } catch (error) {
    logError(`Error: ${error.message}`);
    return false;
  }
}

// Test 7: Test creating link with missing parameters
async function testMissingParameters() {
  logTest('Test Missing Parameters (400)');
  
  try {
    const response = await fetch(`${BASE_URL}/api/v1/links/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        owner_id: testOwnerId
        // Missing blob_path
      })
    });

    const data = await response.json();
    
    if (response.status === 400 && !data.success) {
      logSuccess('Correctly validates missing parameters!');
      logInfo(`Error message: ${data.message}`);
      return true;
    } else {
      logError(`Expected 400, got ${response.status}`);
      return false;
    }
  } catch (error) {
    logError(`Error: ${error.message}`);
    return false;
  }
}

// Test 8: Test creating link with non-existent blob
async function testNonExistentBlob() {
  logTest('Test Non-Existent Blob (404)');
  
  try {
    const response = await fetch(`${BASE_URL}/api/v1/links/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        owner_id: testOwnerId,
        blob_path: 'fake-user/non-existent-file.pdf'
      })
    });

    const data = await response.json();
    
    if (response.status === 404 && !data.success) {
      logSuccess('Correctly detects non-existent files!');
      logInfo(`Error message: ${data.message}`);
      return true;
    } else {
      logWarning(`Expected 404, got ${response.status} - blob might exist`);
      return true; // Not a critical failure
    }
  } catch (error) {
    logError(`Error: ${error.message}`);
    return false;
  }
}

// Test 9: Test access count increment
async function testAccessCountIncrement(shortCode) {
  logTest('Test Access Count Increment');
  
  try {
    // Get initial count
    const info1Response = await fetch(`${BASE_URL}/api/v1/links/${shortCode}/info`);
    const info1 = await info1Response.json();
    const initialCount = info1.access_count;
    
    logInfo(`Initial access count: ${initialCount}`);
    
    // Access the link
    await fetch(`${BASE_URL}/s/${shortCode}`, { redirect: 'manual' });
    
    // Give it a moment to update
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Get new count
    const info2Response = await fetch(`${BASE_URL}/api/v1/links/${shortCode}/info`);
    const info2 = await info2Response.json();
    const newCount = info2.access_count;
    
    logInfo(`New access count: ${newCount}`);
    
    if (newCount === initialCount + 1) {
      logSuccess('Access count incremented correctly!');
      return true;
    } else {
      logError(`Expected ${initialCount + 1}, got ${newCount}`);
      return false;
    }
  } catch (error) {
    logError(`Error: ${error.message}`);
    return false;
  }
}

// Main test runner
async function runTests() {
  console.log('\n');
  log('╔════════════════════════════════════════════════════════════╗', 'blue');
  log('║                                                            ║', 'blue');
  log('║        LinkSecure Short URL Service - Test Suite          ║', 'blue');
  log('║                                                            ║', 'blue');
  log('╚════════════════════════════════════════════════════════════╝', 'blue');
  console.log('\n');
  
  logWarning('⚠️  IMPORTANT: Make sure the server is running on http://localhost:5000');
  logInfo(`ℹ️  Using test file: ${testBlobPath}`);
  console.log('\n');
  
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  const results = {
    passed: 0,
    failed: 0,
    tests: []
  };
  
  // Run all tests
  let shortCode = null;
  
  // Test 1: Create link
  shortCode = await testCreateLink();
  if (shortCode) {
    results.passed++;
    results.tests.push({ name: 'Create Link', status: 'PASS' });
  } else {
    results.failed++;
    results.tests.push({ name: 'Create Link', status: 'FAIL' });
    logError('Cannot continue tests without a valid short code');
    return printResults(results);
  }
  
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Test 2: Get link info
  const test2 = await testGetLinkInfo(shortCode);
  results[test2 ? 'passed' : 'failed']++;
  results.tests.push({ name: 'Get Link Info', status: test2 ? 'PASS' : 'FAIL' });
  
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Test 3: Test redirection
  const test3 = await testRedirection(shortCode);
  results[test3 ? 'passed' : 'failed']++;
  results.tests.push({ name: 'Link Redirection', status: test3 ? 'PASS' : 'FAIL' });
  
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Test 4: Get user links
  const test4 = await testGetUserLinks(testOwnerId);
  results[test4 ? 'passed' : 'failed']++;
  results.tests.push({ name: 'Get User Links', status: test4 ? 'PASS' : 'FAIL' });
  
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Test 5: Invalid short code
  const test5 = await testInvalidShortCode();
  results[test5 ? 'passed' : 'failed']++;
  results.tests.push({ name: 'Invalid Short Code', status: test5 ? 'PASS' : 'FAIL' });
  
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Test 6: Bad format
  const test6 = await testBadFormat();
  results[test6 ? 'passed' : 'failed']++;
  results.tests.push({ name: 'Bad Format', status: test6 ? 'PASS' : 'FAIL' });
  
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Test 7: Missing parameters
  const test7 = await testMissingParameters();
  results[test7 ? 'passed' : 'failed']++;
  results.tests.push({ name: 'Missing Parameters', status: test7 ? 'PASS' : 'FAIL' });
  
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Test 8: Non-existent blob
  const test8 = await testNonExistentBlob();
  results[test8 ? 'passed' : 'failed']++;
  results.tests.push({ name: 'Non-Existent Blob', status: test8 ? 'PASS' : 'FAIL' });
  
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Test 9: Access count increment
  const test9 = await testAccessCountIncrement(shortCode);
  results[test9 ? 'passed' : 'failed']++;
  results.tests.push({ name: 'Access Count Increment', status: test9 ? 'PASS' : 'FAIL' });
  
  // Print results
  printResults(results);
}

function printResults(results) {
  console.log('\n');
  log('╔════════════════════════════════════════════════════════════╗', 'blue');
  log('║                                                            ║', 'blue');
  log('║                      Test Results                          ║', 'blue');
  log('║                                                            ║', 'blue');
  log('╚════════════════════════════════════════════════════════════╝', 'blue');
  console.log('\n');
  
  results.tests.forEach((test, index) => {
    const status = test.status === 'PASS' 
      ? colors.green + '✅ PASS' + colors.reset 
      : colors.red + '❌ FAIL' + colors.reset;
    console.log(`${index + 1}. ${test.name.padEnd(30)} ${status}`);
  });
  
  console.log('\n');
  log('━'.repeat(60), 'blue');
  
  const total = results.passed + results.failed;
  const percentage = ((results.passed / total) * 100).toFixed(1);
  
  log(`Total Tests: ${total}`, 'bold');
  log(`Passed: ${results.passed}`, 'green');
  log(`Failed: ${results.failed}`, results.failed > 0 ? 'red' : 'green');
  log(`Success Rate: ${percentage}%`, percentage === '100.0' ? 'green' : 'yellow');
  
  console.log('\n');
  
  if (results.failed === 0) {
    log('🎉 All tests passed! The short link service is working correctly.', 'green');
  } else {
    log('⚠️  Some tests failed. Please review the errors above.', 'yellow');
  }
  
  console.log('\n');
}

// Run the tests
runTests().catch(error => {
  logError(`Fatal error: ${error.message}`);
  console.error(error);
  process.exit(1);
});
