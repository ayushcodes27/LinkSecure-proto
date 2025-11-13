# Testing Guide - LinkSecure Dashboard Frontend Fixes

## Prerequisites
- Server running on `http://localhost:5000`
- Client running on `http://localhost:3000` (or configured port)
- Valid user account with authentication token
- At least one file uploaded to the system

---

## Test 1: Secure Links Immediate Update

### Objective
Verify that newly generated secure links appear immediately without page refresh

### Steps
1. **Login** to the dashboard
2. Navigate to **"Files"** section
3. Locate any file and click the **Share** button (Share2 icon)
4. The **Secure Link Modal** should open with two tabs

### Test 1A: Generate Link from Files Section
1. In the modal, ensure you're on the **"Generate Link"** tab
2. Keep default settings (24 hours expiration)
3. Click **"Generate Secure Link"** button
4. Wait for success toast: "Secure link generated successfully"
5. **Verify**: Generated link appears in green success box with copy button
6. Click on **"Manage Links"** tab
7. **✅ PASS if**: The newly generated link appears in the list immediately
8. Close the modal
9. Navigate to **"Secure Links"** section in the sidebar
10. **✅ PASS if**: The newly generated link appears in the main secure links list

### Test 1B: Generate Multiple Links
1. Return to **"Files"** section
2. Click Share on the **same file**
3. Generate another link with different settings (e.g., 48 hours)
4. **✅ PASS if**: 
   - New link appears in "Manage Links" tab
   - Counter shows 2 links for this file
5. Close modal and check **"Secure Links"** section
6. **✅ PASS if**: Both links are visible without refreshing the page

### Test 1C: Generate Links for Different Files
1. Return to **"Files"** section
2. Share a **different file**
3. Generate a secure link
4. **✅ PASS if**: Link appears in both modal and Secure Links section
5. Open Secure Links section
6. **✅ PASS if**: Links from both files are displayed correctly

### Test 1D: Revoke Link
1. In **"Secure Links"** section, click Settings icon on any link
2. In modal, go to **"Manage Links"** tab
3. Click the **Trash** button to revoke a link
4. Confirm revocation
5. **✅ PASS if**: 
   - Link disappears from modal list
   - Link disappears/updates in main Secure Links section
   - No page refresh required

**Expected Results:**
- ✅ Links appear immediately after generation
- ✅ Links appear in both modal and main section
- ✅ No manual page refresh needed
- ✅ Revoked links update immediately
- ✅ Multiple links for same file work correctly

---

## Test 2: Storage Usage Calculation

### Objective
Verify storage shows real values based on actual file sizes

### Steps

### Test 2A: Initial Storage Display
1. Login to dashboard
2. Locate the **"Storage Used"** metric card (4th card in stats row)
3. Note the displayed value (e.g., "0.05 GB")
4. Note the percentage (e.g., "1.0% of 5 GB")
5. **Verify manually**:
   - Open browser DevTools → Network tab
   - Look for request to `/api/user/settings`
   - Check response: `storage.used` value in bytes
   - Calculate: `used bytes / (1024^3)` = GB value shown
   - Calculate: `(used / limit) * 100` = percentage shown
6. **✅ PASS if**: Displayed values match API response calculations

### Test 2B: Upload New File and Verify Storage Update
1. Note current storage: e.g., "0.05 GB" (1.0%)
2. Prepare a test file with known size (e.g., 5MB image)
3. In **"Files"** section, use **"Upload Zone"** to upload the file
4. Wait for success toast
5. Check **"Storage Used"** card
6. **Expected calculation**:
   - Previous: 0.05 GB = ~52.4 MB
   - New file: 5 MB
   - Expected new storage: ~57.4 MB = ~0.056 GB
   - Expected new percentage: (57.4 / 5120) * 100 = ~1.12%
7. **✅ PASS if**: Storage increased by approximately the file size

### Test 2C: Delete File and Verify Storage Decrease
1. Note current storage value
2. Locate the file you just uploaded
3. Click **More** menu (three dots) → **Delete**
4. Confirm deletion (file moves to trash)
5. Check **"Storage Used"** card
6. **✅ PASS if**: Storage decreased by approximately the deleted file size

### Test 2D: Storage Recalculation on Restore
1. Current storage should be lower after deletion
2. Navigate to **"Trash"** section
3. Find the deleted file
4. Click **"Restore"** button
5. File moves back to Files section
6. Check **"Storage Used"** card
7. **✅ PASS if**: Storage increased back to previous value

### Test 2E: Permanent Delete
1. Note current storage
2. Navigate to **"Trash"** section
3. Click **"Delete"** button on a trashed file (permanent delete)
4. Confirm permanent deletion
5. Check **"Storage Used"** card
6. **✅ PASS if**: Storage decreased and stays decreased

### Test 2F: Multiple File Operations
1. Upload 3 files of different sizes (e.g., 2MB, 5MB, 10MB)
2. After each upload, verify storage increases correctly
3. Delete 1 file, verify decrease
4. Upload another file, verify increase
5. **✅ PASS if**: Storage accurately reflects all operations

### Test 2G: Large File Storage Test
1. Upload a file larger than 100MB (if storage limit allows)
2. **✅ PASS if**: 
   - Storage shows correct GB value (e.g., "0.15 GB")
   - Percentage updates accordingly
   - Card trend changes to orange/red if approaching limit

### Test 2H: Check Storage Limits
1. Check storage card: "X% of Y GB"
2. The Y value is the user's storage limit
3. Default should be 5 GB for new users
4. **✅ PASS if**: Limit shows correct value from database

**Expected Results:**
- ✅ Storage shows actual file sizes, not hardcoded values
- ✅ Storage updates after every file operation
- ✅ Calculations are accurate (within rounding error)
- ✅ Percentage matches: (used / limit) * 100
- ✅ GB conversion is correct: bytes / (1024^3)
- ✅ Trend indicator changes color based on usage

---

## Test 3: Modal Tabs Functionality

### Objective
Verify modal tabs switch correctly and display appropriate content

### Steps

### Test 3A: Tab Switching
1. Open any file's **Share** modal
2. Modal opens on **"Generate Link"** tab by default
3. **✅ PASS if**: Form is visible with:
   - Expires In (Hours) input
   - Max Access Count input
   - Password input
   - Toggle switches for options
   - Generate button
4. Click **"Manage Links"** tab
5. **✅ PASS if**: Tab switches smoothly and shows:
   - List of existing links (or "No secure links found")
   - Refresh button
   - Each link shows: name, status, expiry, access count
6. Click back to **"Generate Link"** tab
7. **✅ PASS if**: Form is still there with previous inputs preserved

### Test 3B: Generate Link Tab Content
1. On **"Generate Link"** tab
2. **✅ PASS if** all elements are visible:
   - Title: "Generate New Secure Link"
   - Description text
   - Expires In input (default 24)
   - Max Access Count input (optional)
   - Password input (optional)
   - "Require Email" toggle
   - "Watermark" toggle
   - "Allow Preview" toggle
   - "Use Tracking Page" toggle
   - Blue "Generate Secure Link" button

### Test 3C: Manage Links Tab Content
1. On **"Manage Links"** tab
2. **✅ PASS if** displays:
   - Title: "Your Secure Links"
   - Description text
   - Refresh button (top right)
   - List of links with:
     - File name
     - Status badge (Active/Inactive/Expired)
     - Created date
     - View count
     - Expiry countdown
     - Link URL (readonly input)
     - Copy button
     - Trash button

### Test 3D: Generate and Switch
1. On **"Generate Link"** tab
2. Generate a new link
3. Wait for success message
4. **✅ PASS if**: Green success box appears with link details
5. Click **"Manage Links"** tab
6. **✅ PASS if**: Newly generated link appears in list immediately
7. Click back to **"Generate Link"** tab
8. **✅ PASS if**: Form is reset (or shows previous success box)

### Test 3E: Refresh Button
1. On **"Manage Links"** tab
2. Note the number of links displayed
3. Click the **Refresh** button
4. **✅ PASS if**: 
   - Button shows loading spinner
   - Links list refreshes
   - Latest data is displayed

**Expected Results:**
- ✅ Both tabs are functional and visible
- ✅ Tab switching is smooth with no errors
- ✅ Content renders correctly in each tab
- ✅ Generate tab shows form
- ✅ Manage tab shows links list
- ✅ No loading or rendering issues

---

## Test 4: Metric Cards Real-Time Data

### Objective
Verify all 4 metric cards pull and display real-time data

### Test 4A: Total Files Card
1. Note current **"Total Files"** count (e.g., 5)
2. Upload a new file
3. **✅ PASS if**: Count increases to 6
4. Delete a file
5. **✅ PASS if**: Count decreases to 5

### Test 4B: Total Views Card
1. Note current **"Total Views"** count
2. Download a file (view count increases)
3. **✅ PASS if**: Total Views increases by 1
4. Generate a secure link and access it
5. After accessing, refresh dashboard
6. **✅ PASS if**: Total Views reflects the new access

### Test 4C: Active Shares Card
1. Note current **"Active Shares"** count
2. Generate a new secure link (24 hours)
3. **✅ PASS if**: Active Shares increases by 1
4. Generate a link with 1 hour expiry
5. **✅ PASS if**: Active Shares increases to +2
6. Wait 1 hour (or manually expire a link in DB for testing)
7. Refresh page
8. **✅ PASS if**: Active Shares decreased by 1 (expired link)
9. Revoke an active link
10. **✅ PASS if**: Active Shares decreases immediately

### Test 4D: Storage Used Card
Already tested in Test 2 - verify again:
1. **✅ PASS if**: Shows GB value (not hardcoded "6.8 GB")
2. **✅ PASS if**: Shows percentage (not hardcoded "68%")
3. **✅ PASS if**: Updates after file operations

### Test 4E: All Cards Update Together
1. Upload a large file (e.g., 20MB)
2. After upload completes:
3. **✅ PASS if**:
   - Total Files increases
   - Storage Used increases
   - Change percentages update
   - All cards reflect the new state

**Expected Results:**
- ✅ Total Files = actual count of uploaded files
- ✅ Total Views = sum of all download counts
- ✅ Active Shares = count of active, non-expired links
- ✅ Storage Used = real GB usage with correct percentage
- ✅ All cards update in real-time
- ✅ No hardcoded or fake values

---

## Test 5: Error Handling & Edge Cases

### Test 5A: Network Error During Link Generation
1. Open Network tab in DevTools
2. Go offline (or block `/api/files/*/generate-link`)
3. Try to generate a link
4. **✅ PASS if**: Error toast appears
5. **✅ PASS if**: Link doesn't appear in list
6. Go back online
7. Try again
8. **✅ PASS if**: Works correctly

### Test 5B: Empty States
1. New account with no files
2. **✅ PASS if**: 
   - Total Files shows "0"
   - Total Views shows "0"
   - Active Shares shows "0"
   - Storage shows "0.00 GB (0.0% of 5 GB)"
   - Secure Links section shows "No secure links found" message

### Test 5C: Storage at Limit
1. (Requires admin access to set low limit or upload many files)
2. Upload files until storage is near limit (e.g., 95%)
3. **✅ PASS if**: 
   - Storage card shows red trend indicator
   - Percentage shows >90%
   - Upload might be blocked by backend

### Test 5D: Expired Links Display
1. Generate links with short expiry (1 hour)
2. After expiry:
3. **✅ PASS if**: 
   - Link shows "Expired" badge in red
   - Link shows "Inactive" status
   - Not counted in "Active Shares" metric

---

## Test 6: Cross-Browser Testing

Test in multiple browsers:
- ✅ Chrome/Chromium
- ✅ Firefox
- ✅ Safari (Mac)
- ✅ Edge

Verify:
- All functionality works the same
- No console errors
- Modal renders correctly
- Storage calculations are accurate
- Real-time updates work

---

## Test 7: Performance Testing

### Test 7A: Multiple Rapid Operations
1. Upload 5 files quickly
2. **✅ PASS if**: All metrics update correctly without race conditions
3. Generate 3 secure links rapidly
4. **✅ PASS if**: All appear in list without duplicates

### Test 7B: Large Dataset
1. Account with 50+ files
2. **✅ PASS if**: Dashboard loads without lag
3. **✅ PASS if**: Metric calculations are fast
4. Generate secure links
5. **✅ PASS if**: Links appear immediately even with large dataset

---

## Common Issues & Troubleshooting

### Issue: Storage shows "0.00 GB" but files exist
**Debug:**
```bash
# Check API response
curl -H "Authorization: Bearer TOKEN" http://localhost:5000/api/user/settings

# Look for storage.used value
# If 0, check backend file size calculations
```

### Issue: Secure links don't update
**Debug:**
1. Open browser console
2. Look for errors after generating link
3. Check Network tab - verify `/api/files/secure-links` is called
4. Verify `onLinkGenerated` callback is being triggered

### Issue: Storage percentage is wrong
**Debug:**
```javascript
// In console, check state:
// Expected: (storageStats.used / storageStats.limit) * 100
// Should match storageStats.percentage
```

### Issue: Modal tabs don't switch
**Debug:**
1. Check console for React errors
2. Verify Tabs component is imported correctly
3. Check if `activeTab` state is updating

---

## Acceptance Criteria Summary

✅ **Must Pass All:**

1. Secure links appear immediately after generation (no refresh)
2. Storage shows real values from backend API
3. Storage percentage is correctly calculated
4. Modal tabs switch smoothly
5. All 4 metric cards show real-time data
6. File operations (upload/delete) trigger storage updates
7. No console errors
8. No hardcoded values in metrics
9. Proper loading states during async operations
10. Error handling for network failures

---

## Regression Testing

After these fixes, verify these still work:
- ✅ File upload (single and multiple)
- ✅ File download
- ✅ File preview
- ✅ File history modal
- ✅ User authentication
- ✅ Profile menu
- ✅ Theme toggle
- ✅ Notifications
- ✅ Analytics page
- ✅ Team members page
- ✅ Trash functionality (restore/permanent delete)

---

## Final Checklist

Before marking as complete:
- [ ] All Test 1 scenarios pass (secure links)
- [ ] All Test 2 scenarios pass (storage)
- [ ] All Test 3 scenarios pass (modal tabs)
- [ ] All Test 4 scenarios pass (metric cards)
- [ ] Error handling works (Test 5)
- [ ] No console errors in any browser
- [ ] Documentation is up to date
- [ ] Code has no hardcoded values
- [ ] Backend APIs are unchanged
- [ ] Design consistency maintained

---

**Test Results Log:**
```
Date: __________
Tester: __________

Test 1 (Secure Links): PASS / FAIL
Test 2 (Storage Stats): PASS / FAIL
Test 3 (Modal Tabs): PASS / FAIL
Test 4 (Metric Cards): PASS / FAIL
Test 5 (Error Handling): PASS / FAIL
Test 6 (Cross-Browser): PASS / FAIL
Test 7 (Performance): PASS / FAIL

Notes:
_________________________________
_________________________________
_________________________________
```
