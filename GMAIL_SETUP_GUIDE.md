# Gmail SMTP Configuration Guide

## ⚠️ IMPORTANT: Your current Gmail app password is invalid or expired!

Follow these steps to set up Gmail SMTP correctly:

## Step 1: Enable 2-Step Verification

1. Go to your Google Account: https://myaccount.google.com/
2. Click on **Security** in the left sidebar
3. Under "Signing in to Google," find **2-Step Verification**
4. Click on it and follow the steps to enable it
5. You'll need to verify your phone number

## Step 2: Generate App Password

1. After enabling 2-Step Verification, go to: https://myaccount.google.com/apppasswords
   
   OR
   
   - Go to https://myaccount.google.com/
   - Click **Security**
   - Scroll down to "Signing in to Google"
   - Click **App passwords** (you'll only see this if 2-Step Verification is enabled)

2. You may need to sign in again

3. At the bottom, click **Select app** and choose:
   - App: **Mail**
   - Device: **Other (Custom name)**
   - Enter: **LinkSecure** or **LinkSecure App**

4. Click **Generate**

5. Google will display a 16-character password like: `abcd efgh ijkl mnop`

6. **IMPORTANT**: Copy this password (remove any spaces)

## Step 3: Update Your .env File

Open the file: `/home/ganesh/Desktop/google_auth/server/.env`

Update these lines:

```env
# GMAIL SMTP CONFIGURATION
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=ganesh.dandekar23@spit.ac.in
SMTP_PASS=abcdefghijklmnop    # Replace with your 16-char app password (NO SPACES!)
EMAIL_FROM=LinkSecure <ganesh.dandekar23@spit.ac.in>
```

**Example with actual app password:**
```env
SMTP_PASS=zlmkqwrtyuiopasdf    # This is just an example, use YOUR password
```

## Step 4: Test the Email Service

After updating the `.env` file, run:

```bash
cd /home/ganesh/Desktop/google_auth/server
npm run test:email
```

You should see:
```
✅ SMTP connection verified successfully!
✅ Test email sent successfully!
📬 Check your inbox at ganesh.dandekar23@spit.ac.in for the test email.
```

## Step 5: Start the Server

Once the email test passes, start your server:

```bash
npm run dev
```

## Testing the Complete Flow

### 1. Test User Registration with Email Verification

```bash
# Register a new user
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Test",
    "lastName": "User",
    "email": "your-test-email@gmail.com",
    "password": "TestPass123"
  }'
```

**Expected**: 
- API returns success message
- You receive an email with verification link

### 2. Verify Email

- Check your email inbox
- Click the verification link
- Should redirect to login page with success message

### 3. Test Login

```bash
# Try to login (should fail before email verification)
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "your-test-email@gmail.com",
    "password": "TestPass123"
  }'
```

**Before verification**: Should get error about email verification
**After verification**: Should get JWT token

### 4. Test 2FA (Optional)

Enable 2FA:
```bash
curl -X POST http://localhost:5000/api/auth/enable-2fa \
  -H "Content-Type: application/json" \
  -d '{
    "email": "your-test-email@gmail.com",
    "password": "TestPass123"
  }'
```

Try login again - you'll receive a 6-digit code via email.

## Troubleshooting

### Error: "Username and Password not accepted"

**Solutions:**
1. Generate a NEW app password (old one might be expired)
2. Make sure there are NO SPACES in the app password in .env
3. Verify 2-Step Verification is enabled
4. Try using a different Gmail account

### Error: "Connection timeout"

**Solutions:**
1. Check your firewall settings
2. Verify you can access smtp.gmail.com:587
3. Try using port 465 instead (update SMTP_PORT=465 in .env)

### Email Not Received

**Check:**
1. Spam/Junk folder
2. Gmail "All Mail" folder
3. Gmail filters (Settings > Filters and Blocked Addresses)
4. Check server logs for errors: `npm run dev` and watch the console

### "Less secure app access"

**Note:** Google removed this option. You MUST use App Passwords with 2-Step Verification enabled. There's no other way.

## Alternative: Use Different Email Provider

If Gmail doesn't work, you can use these alternatives:

### Option 1: Outlook/Office365

```env
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_USER=your-email@outlook.com
SMTP_PASS=your-password
```

### Option 2: SendGrid (Recommended for Production)

1. Sign up at https://sendgrid.com/
2. Create an API key
3. Update .env:

```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=your-sendgrid-api-key
```

### Option 3: AWS SES

1. Set up AWS SES
2. Get SMTP credentials
3. Update .env:

```env
SMTP_HOST=email-smtp.us-east-1.amazonaws.com
SMTP_PORT=587
SMTP_USER=your-aws-access-key
SMTP_PASS=your-aws-secret-key
```

## Security Reminders

1. ✅ NEVER commit your .env file to Git
2. ✅ NEVER share your app password
3. ✅ Rotate credentials regularly
4. ✅ Use different app passwords for different applications
5. ✅ Revoke app passwords you no longer use

## Next Steps After Setup

1. ✅ Test email service (`npm run test:email`)
2. ✅ Start the server (`npm run dev`)
3. ✅ Test user registration from frontend
4. ✅ Verify you receive the email
5. ✅ Complete email verification
6. ✅ Test login
7. ✅ Test 2FA (optional)
8. ✅ Test file sharing notifications

## Quick Reference

### Generate New App Password
https://myaccount.google.com/apppasswords

### Gmail Security Settings
https://myaccount.google.com/security

### Server Email Test
```bash
npm run test:email
```

### Check Email Logs
```bash
npm run dev
# Watch for email-related errors in console
```

---

## Need Help?

If you're still having issues:

1. Check the detailed error message in the console
2. Verify Gmail 2-Step Verification is enabled
3. Try generating a completely new app password
4. Test with a different Gmail account
5. Consider using SendGrid for more reliability

The email system is fully implemented and ready to use once you update the Gmail credentials!
