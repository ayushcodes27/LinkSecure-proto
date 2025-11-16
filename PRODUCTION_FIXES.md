# Production Issues & Fixes

## 🔴 Critical Issues Identified

### 1. ✅ FIXED: 404 Error on `/api/files/shared-with-me`

**Problem:** Express route matching order issue. The `/shared-with-me` route was defined AFTER the `/:fileId` route, causing Express to treat "shared-with-me" as a fileId parameter.

**Fix Applied:** Moved `/shared-with-me` route to BEFORE `/:fileId` route in `server/routes/files.ts`.

**Status:** ✅ Fixed in this commit - will work after deployment.

---

### 2. ⚠️ IDENTIFIED: 500 Error - File Not Found

**Problem:** Your production database is empty. The application was developed with a local database full of test files, but production uses a new database with no files.

**Root Cause:**
- Users see old file references in local development
- Production MongoDB has no file records
- When trying to download/preview, Azure Blob Storage lookup fails

**Solution:** Upload new files through the production application to populate the database.

**Steps to Fix:**
1. Log into your production app: https://linksecure-2cdc.onrender.com
2. Upload test files using the upload feature
3. These will be stored in Azure Blob Storage and recorded in MongoDB
4. Files will then be downloadable

**Database Check (if needed):**
```bash
# Connect to your MongoDB and run:
db.files.find({}).count()  # Should return > 0 after uploading files
```

---

### 3. ⚠️ REQUIRES ENV UPDATE: Email Connection Timeout

**Problem:** Render blocks outbound SMTP connections on ports 25, 465, and 587 to prevent spam. Your nodemailer direct SMTP connection is timing out.

**Current Error:**
```
Failed to send email... ETIMEDOUT - Connection timeout
```

**Critical:** The file sharing worked (database updated), but the email notification failed.

## 🔧 Email Service Fix Options

### Option A: Use Resend (Recommended - Easiest)

**Why Resend:**
- ✅ Generous free tier (100 emails/day, 3,000/month)
- ✅ Simple API (one HTTP POST request)
- ✅ Excellent documentation
- ✅ Works perfectly on Render

**Setup Steps:**

1. **Sign up:** https://resend.com/signup
2. **Get API Key:** Create API key in dashboard
3. **Update Environment Variables on Render:**
   ```
   EMAIL_SERVICE=resend
   RESEND_API_KEY=re_xxxxxxxxxxxx
   ```

4. **Install package:**
   ```bash
   cd server
   npm install resend
   ```

5. **Update emailService.ts (I'll provide the code)**

### Option B: Use SendGrid

1. Sign up: https://sendgrid.com/free
2. Create API key (Settings → API Keys)
3. Install: `npm install @sendgrid/mail`
4. Add env vars:
   ```
   EMAIL_SERVICE=sendgrid
   SENDGRID_API_KEY=SG.xxxxxxxxxxxx
   ```

### Option C: Use Mailgun

1. Sign up: https://signup.mailgun.com
2. Get API key from dashboard
3. Install: `npm install mailgun.js form-data`
4. Add env vars:
   ```
   EMAIL_SERVICE=mailgun
   MAILGUN_API_KEY=xxxxxxxxxxxx
   MAILGUN_DOMAIN=mg.yourdomain.com
   ```

---

## 📝 Implementation Plan

### Step 1: Deploy Current Route Fix

```bash
git add server/routes/files.ts
git commit -m "fix: Move /shared-with-me route before /:fileId to fix 404 errors"
git push origin main
```

This fixes the 404 error immediately.

### Step 2: Switch to Resend (Recommended)

I'll update the email service to support multiple providers with fallback to direct SMTP.

**New Environment Variables Structure:**
```env
# Choose one: resend, sendgrid, mailgun, smtp
EMAIL_SERVICE=resend

# Resend (recommended)
RESEND_API_KEY=re_xxxxxxxxxxxx

# OR SendGrid
SENDGRID_API_KEY=SG.xxxxxxxxxxxx

# OR Mailgun
MAILGUN_API_KEY=xxxxxxxxxxxx
MAILGUN_DOMAIN=mg.yourdomain.com

# OR SMTP (will fail on Render)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Common
EMAIL_FROM=LinkSecure <noreply@linksecure.com>
```

### Step 3: Test in Production

1. Upload a file
2. Share it with another user
3. Check recipient's email
4. Verify "Shared with Me" tab works

---

## 🚀 Quick Action Items

**Immediate (Do Now):**
1. ✅ Deploy the route fix (already done)
2. Sign up for Resend
3. Add `RESEND_API_KEY` to Render environment variables
4. Wait for my email service update code

**After Code Update:**
1. Test file upload in production
2. Test file sharing with email notification
3. Verify "Shared with Me" tab loads

**Optional (Later):**
1. Add test data to production
2. Configure custom domain for emails
3. Set up email monitoring

---

## 🔍 Verification Commands

### Check Production Logs
```bash
# On Render dashboard, check logs for:
✅ "File uploaded successfully"
✅ "File shared successfully"
❌ "Failed to send email" (should disappear after fix)
```

### Check Database
```javascript
// MongoDB query to verify files exist
db.files.find({}).limit(5)
db.fileaccesses.find({}).limit(5)
```

### Test Endpoints
```bash
# After deployment, these should work:
curl -H "Authorization: Bearer YOUR_TOKEN" https://linksecure-2cdc.onrender.com/api/files/shared-with-me

curl -H "Authorization: Bearer YOUR_TOKEN" https://linksecure-2cdc.onrender.com/api/files/my-files
```

---

## 📊 Summary

| Issue | Status | Action Required |
|-------|--------|-----------------|
| 404 on /shared-with-me | ✅ Fixed | Deploy current commit |
| 500 File not found | ⚠️ Identified | Upload files in production |
| Email timeout | ⚠️ Requires fix | Switch to Resend API |

**Next Steps:**
1. I'll update the email service code to support Resend
2. You sign up for Resend and get API key
3. Add API key to Render env vars
4. Deploy and test

**ETA:** 10 minutes for code update, 5 minutes for Resend setup.
