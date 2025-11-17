# Revoke All Links Feature - Implementation Guide

## 📋 Overview
This feature allows users to bulk revoke all secure links for a specific file with a single click, providing a quick way to disable all sharing for a file.

## ✅ What's Implemented

### Backend (server/routes/files.ts)
- **Endpoint**: `POST /api/files/:fileId/revoke-all`
- **Authentication**: Requires Bearer token (requireAuth middleware)
- **Authorization**: Verifies file ownership before revoking
- **Action**: Updates all links matching the fileId pattern
  - Sets `status: 'revoked'`
  - Sets `is_active: false`
- **Response**: Returns count of links affected

```typescript
// Example response
{
  "success": true,
  "data": {
    "linksAffected": 5
  }
}
```

### Frontend Components

#### 1. ShareModalTabbed.tsx (Public Link Tab)
- **Location**: "Public Link Settings" card header
- **Button**: "Revoke All Links" (destructive variant)
- **Features**:
  - Confirmation dialog with file name
  - Loading state: "Revoking..."
  - Success toast shows links affected count
  - Clears generated link and QR code after revocation

#### 2. SecureLinkModal.tsx (Manage Links Tab)
- **Location**: "Your Secure Links" card header (left of refresh button)
- **Button**: "Revoke All Links" (destructive variant)
- **Features**:
  - Confirmation dialog with file name
  - Loading state: "Revoking..."
  - Success toast shows links affected count
  - Refreshes links list after revocation

## 🧪 Testing Instructions

### Prerequisites
1. Start backend server: `cd server && npm run dev` (Port 5000)
2. Start frontend server: `cd client && npm run dev` (Port 5173)
3. Login with a user account
4. Upload a file or use an existing file

### Test Case 1: Revoke All from ShareModalTabbed
1. Navigate to Dashboard
2. Find a file with active links
3. Click "Share" button
4. Go to "Get Link" tab
5. Click **"Revoke All Links"** button (top-right, red border)
6. **Expected**: Confirmation dialog appears
   ```
   Are you sure you want to revoke ALL links for "[FileName]"?
   
   This will disable all existing share links for this file. This action cannot be undone.
   ```
7. Click "OK" to confirm
8. **Expected**: 
   - Button shows "Revoking..." briefly
   - Success toast: "All links revoked - Successfully revoked X link(s)"
   - Generated link and QR code cleared

### Test Case 2: Revoke All from SecureLinkModal
1. Navigate to Dashboard
2. Find a file with active links
3. Click on file name or options → "Secure Link"
4. Go to "Manage Links" tab
5. Click **"Revoke All Links"** button (left of refresh icon)
6. **Expected**: Same confirmation dialog
7. Click "OK" to confirm
8. **Expected**:
   - Button shows "Revoking..." briefly
   - Success toast: "All links revoked - Successfully revoked X link(s)"
   - Links list refreshes showing revoked status badges

### Test Case 3: Verify Revocation
1. After revoking all links, note a revoked link's short URL
2. Try to access the link: `http://localhost:5000/s/[short_code]`
3. **Expected**: 
   - HTTP 410 Gone response
   - Error page: "This link has been revoked"
   - Message explains link is no longer available

### Test Case 4: Edge Cases
1. **No links exist**: 
   - Expected: Success toast shows "Successfully revoked 0 link(s)"
2. **Cancel confirmation**: 
   - Click "Revoke All Links" → Cancel
   - Expected: No API call, no changes
3. **Multiple files**: 
   - Revoke all links for File A
   - Check File B's links still work
   - Expected: Only File A's links revoked
4. **Not file owner**:
   - Try to call API directly for another user's file
   - Expected: 404 Not Found (file ownership check)

### Test Case 5: UI States
1. **Loading state**: Button should show "Revoking..." and be disabled
2. **Disabled states**: Button disabled when already revoking or loading links
3. **Refresh after revoke**: Links list should auto-refresh showing revoked badges

## 📊 Expected Outcomes

### Success Scenarios
- ✅ All links for the file are marked as revoked in database
- ✅ Attempting to access revoked links returns 410 Gone
- ✅ User sees confirmation before action
- ✅ User receives feedback on number of links affected
- ✅ UI updates to reflect revoked status

### Error Scenarios
- ❌ File not found → 404 error toast
- ❌ Not file owner → 404 error toast
- ❌ Network error → "Failed to revoke all links" toast
- ❌ Unauthorized → Authentication redirect

## 🔍 Database Verification

You can verify revocations in MongoDB:

```javascript
// Check links for a specific file
db.linkmappings.find({ 
  blob_path: /your-file-id/,
  status: 'revoked'
})

// Count revoked links
db.linkmappings.countDocuments({ status: 'revoked' })

// Find all active links
db.linkmappings.find({ status: 'active' })
```

## 🔗 Related Features

This feature integrates with:
- **Individual Link Revocation**: Can still revoke single links
- **Link Status System**: Uses `status` field (active/revoked/expired)
- **File Ownership**: Only file owner can revoke links
- **Access Control**: Revoked links return 410 Gone on access attempts

## 📝 Git Commits

- **Initial Revoke System**: Commit `2df6eaa` - Added status field and individual revoke
- **Frontend Integration**: Commit `3ae47c7` - Integrated with SecureLinkModal
- **Bulk Revoke**: Commit `229f3ce` - Added revoke all functionality

## 🚀 Deployment Notes

### Backend
- Ensure `LinkMapping` model has `status` field with index
- Run migrations if needed for existing links (set default status: 'active')
- Update any cron jobs that clean up expired links to check `status` field

### Frontend
- Build with `npm run build` in client directory
- Deploy to static hosting (Vercel, Netlify, etc.)
- Ensure API base URL is configured correctly

### Environment Variables
No new environment variables required for this feature.

## 🐛 Troubleshooting

### Issue: Links not being revoked
- **Check**: File ownership in database
- **Check**: LinkMapping `blob_path` contains correct fileId
- **Check**: Browser console for API errors

### Issue: 410 responses not showing
- **Check**: Link status in database
- **Check**: Server logs for route handler execution
- **Check**: Frontend is using correct short_code

### Issue: UI not updating after revoke
- **Check**: Browser console for state update errors
- **Check**: `onLinkGenerated` callback being called
- **Check**: Component re-render after state change

## 📚 API Documentation

### POST /api/files/:fileId/revoke-all

**Headers**:
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Response 200**:
```json
{
  "success": true,
  "data": {
    "linksAffected": 5
  }
}
```

**Response 404**:
```json
{
  "success": false,
  "message": "File not found or you don't have permission"
}
```

**Response 401**:
```json
{
  "success": false,
  "message": "Unauthorized"
}
```

## ✨ Future Enhancements

Potential improvements:
- [ ] Bulk revoke with undo functionality
- [ ] Scheduled auto-revocation for all links
- [ ] Email notifications to link recipients
- [ ] Audit log of bulk revocations
- [ ] Confirm password for bulk operations
- [ ] Export list of revoked links before revocation
