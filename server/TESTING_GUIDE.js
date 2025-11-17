/**
 * Simple manual test for link revocation
 * Run this after starting the server with: npm run dev
 */

// Test URLs for manual verification in browser or Postman:
console.log('='.repeat(60));
console.log('🧪 Manual Testing Guide for Link Revocation Feature');
console.log('='.repeat(60));
console.log('\n✅ Backend changes implemented:\n');
console.log('1. Added status field to LinkMapping model (active/revoked/expired)');
console.log('2. Created GET /api/links/my-links endpoint');
console.log('3. Created PATCH /api/links/:short_code/revoke endpoint');
console.log('4. Updated GET /s/:short_code to check status before serving files');
console.log('5. Returns 410 Gone for revoked or expired links\n');

console.log('📋 API Endpoints to Test:\n');
console.log('=' .repeat(60));

console.log('\n1️⃣  GET /api/links/my-links');
console.log('   Purpose: List all links created by authenticated user');
console.log('   Method: GET');
console.log('   URL: http://localhost:5000/api/links/my-links');
console.log('   Headers: { "Authorization": "Bearer YOUR_TOKEN" }');
console.log('   Expected Response: { success: true, links: [...] }');

console.log('\n2️⃣  PATCH /api/links/:short_code/revoke');
console.log('   Purpose: Revoke a specific link');
console.log('   Method: PATCH');
console.log('   URL: http://localhost:5000/api/links/SHORTCODE/revoke');
console.log('   Headers: { "Authorization": "Bearer YOUR_TOKEN" }');
console.log('   Expected Response: { success: true, message: "Link successfully revoked" }');

console.log('\n3️⃣  GET /s/:short_code');
console.log('   Purpose: Access a link (should return 410 if revoked)');
console.log('   Method: GET');
console.log('   URL: http://localhost:5000/s/SHORTCODE');
console.log('   Expected Response (revoked): 410 Gone with HTML error page');
console.log('   Expected Response (active): File download or redirect');

console.log('\n' + '='.repeat(60));
console.log('📝 Testing Steps:\n');
console.log('1. First, login to get an auth token:');
console.log('   POST http://localhost:5000/api/auth/login');
console.log('   Body: { "email": "your@email.com", "password": "yourpassword" }');
console.log('   Save the token from response\n');

console.log('2. Create a test link (or use existing one):');
console.log('   POST http://localhost:5000/api/v1/links/create');
console.log('   Body: {');
console.log('     "owner_id": "YOUR_USER_ID",');
console.log('     "blob_path": "test/file.pdf",');
console.log('     "expiry_minutes": 1440');
console.log('   }');
console.log('   Save the short_code from response\n');

console.log('3. List your links:');
console.log('   GET http://localhost:5000/api/links/my-links');
console.log('   Header: Authorization: Bearer YOUR_TOKEN\n');

console.log('4. Revoke a link:');
console.log('   PATCH http://localhost:5000/api/links/SHORT_CODE/revoke');
console.log('   Header: Authorization: Bearer YOUR_TOKEN\n');

console.log('5. Try to access the revoked link:');
console.log('   GET http://localhost:5000/s/SHORT_CODE');
console.log('   Should return 410 Gone\n');

console.log('=' + '='.repeat(59));
console.log('✨ Code Changes Summary:\n');
console.log('📁 server/models/LinkMapping.ts');
console.log('   - Added status field (enum: active, revoked, expired)');
console.log('   - Default value: "active"\n');

console.log('📁 server/routes/links.ts');
console.log('   - Imported requireAuth middleware');
console.log('   - Added GET /my-links endpoint (lines ~16-40)');
console.log('   - Added PATCH /:short_code/revoke endpoint (lines ~42-125)');
console.log('   - Updated GET /:short_code to check status (lines ~440-475)\n');

console.log('📁 server/server.ts');
console.log('   - Added route registration for /api/links');
console.log('   - Now supports all three mount points:\n');
console.log('     * /api/links/* (new endpoints)');
console.log('     * /api/v1/links/* (existing create endpoint)');
console.log('     * /s/* (public access endpoint)\n');

console.log('=' .repeat(60));
console.log('🎯 Key Features:\n');
console.log('✅ Non-destructive revocation (status update, not deletion)');
console.log('✅ Ownership validation (only creator can revoke)');
console.log('✅ Auto-expire on access (expired links get status updated)');
console.log('✅ User-friendly 410 Gone error pages');
console.log('✅ Backward compatible (is_active still works)\n');

console.log('=' + '='.repeat(59));
console.log('🔧 Use Postman, Insomnia, or curl to test these endpoints.');
console.log('💡 Server must be running: npm run dev in server directory');
console.log('=' + '='.repeat(59) + '\n');
