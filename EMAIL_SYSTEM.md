# Email Notification System with 2FA

## Overview

This document describes the Gmail-based email notification system integrated into LinkSecure, including email verification and two-factor authentication (2FA).

## Features Implemented

### 1. Email Verification (Required for All Users)
- **Registration Flow**: Users must verify their email before they can log in
- **Verification Link**: Valid for 24 hours
- **Resend Verification**: Users can request a new verification email if needed

### 2. Two-Factor Authentication (Optional)
- **6-digit Code**: Sent via email when enabled
- **10-minute Expiry**: Codes expire after 10 minutes
- **Enable/Disable**: Users can enable/disable 2FA from their account settings

### 3. Email Notifications
The following email notifications are sent:

#### Welcome Email
- **Trigger**: After successful email verification
- **Content**: Welcome message with getting started tips

#### Email Verification
- **Trigger**: On user registration
- **Content**: Verification link with 24-hour expiry
- **Action**: Click link to verify email

#### 2FA Code
- **Trigger**: On login when 2FA is enabled
- **Content**: 6-digit verification code
- **Security**: Warning never to share the code

#### File Shared Notification
- **Trigger**: When a file is shared with a user
- **Content**: File name, owner, access level, link to open file
- **Location**: `server/routes/team.ts` (line ~139)

#### Access Granted Notification
- **Trigger**: When access is granted to a file
- **Content**: File name, granted by, access level
- **Location**: `server/routes/team.ts` (line ~101, ~490, ~809)

#### Download Notification (Optional)
- **Trigger**: When someone downloads a file
- **Content**: File name, downloader name, timestamp

#### Password Reset Email
- **Trigger**: When user requests password reset
- **Content**: Reset link with expiry time

## Configuration

### Gmail Setup

1. **Enable 2-Step Verification** in your Gmail account:
   - Go to https://myaccount.google.com/security
   - Enable "2-Step Verification"

2. **Generate App Password**:
   - Go to https://myaccount.google.com/apppasswords
   - Select "Mail" and your device
   - Copy the generated 16-character password

3. **Update `.env` File**:
```env
# GMAIL SMTP CONFIGURATION
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-16-character-app-password
EMAIL_FROM=LinkSecure <your-email@gmail.com>

# BASE URLs for email links
CLIENT_BASE_URL=http://localhost:5173
BASE_URL=http://localhost:5000
```

## API Endpoints

### Authentication Endpoints

#### POST `/api/auth/register`
Register a new user and send verification email
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "password": "SecurePass123"
}
```

**Response**:
```json
{
  "user": {
    "id": "...",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "emailVerified": false,
    "createdAt": "..."
  },
  "message": "Registration successful. Please check your email to verify your account."
}
```

#### POST `/api/auth/verify-email`
Verify email address with token from email
```json
{
  "token": "verification-token-from-email"
}
```

#### POST `/api/auth/resend-verification`
Resend verification email
```json
{
  "email": "john@example.com"
}
```

#### POST `/api/auth/login`
Login with optional 2FA
```json
{
  "email": "john@example.com",
  "password": "SecurePass123",
  "twoFactorCode": "123456" // Optional, only if 2FA is enabled
}
```

**Response (Email Not Verified)**:
```json
{
  "message": "Please verify your email address before logging in...",
  "requiresVerification": true
}
```

**Response (2FA Required)**:
```json
{
  "requires2FA": true,
  "message": "A verification code has been sent to your email"
}
```

#### POST `/api/auth/enable-2fa`
Enable two-factor authentication
```json
{
  "email": "john@example.com",
  "password": "SecurePass123"
}
```

#### POST `/api/auth/disable-2fa`
Disable two-factor authentication
```json
{
  "email": "john@example.com",
  "password": "SecurePass123",
  "twoFactorCode": "123456"
}
```

#### POST `/api/auth/request-2fa-code`
Request a new 2FA code (for disabling 2FA)
```json
{
  "email": "john@example.com",
  "password": "SecurePass123"
}
```

## Database Schema Updates

### User Model (`server/models/User.ts`)

New fields added:
```typescript
{
  emailVerified: Boolean,           // Default: false
  emailVerificationToken: String,   // 32-byte hex token
  emailVerificationExpires: Date,   // 24 hours from creation
  twoFactorEnabled: Boolean,        // Default: false
  twoFactorCode: String,            // 6-digit code
  twoFactorExpires: Date            // 10 minutes from creation
}
```

## Email Service Functions

Located in `server/services/emailService.ts`:

### Core Functions

1. **sendWelcomeEmail(params)**
   - Sent after email verification
   - Parameters: `to`, `firstName`, `unsubscribeUrl?`

2. **sendEmailVerification(params)**
   - Sent on registration
   - Parameters: `to`, `firstName`, `verificationUrl`, `unsubscribeUrl?`

3. **send2FACode(params)**
   - Sent on login with 2FA enabled
   - Parameters: `to`, `firstName`, `code`, `unsubscribeUrl?`

4. **sendFileSharedNotification(params)**
   - Sent when file is shared
   - Parameters: `to`, `ownerName?`, `fileName?`, `accessLevel?`, `openUrl?`, `unsubscribeUrl?`

5. **sendAccessGrantedNotification(params)**
   - Sent when access is granted
   - Parameters: `to`, `grantedByName?`, `fileName?`, `accessLevel`, `openUrl?`, `unsubscribeUrl?`

6. **sendDownloadNotification(params)**
   - Sent when file is downloaded
   - Parameters: `to`, `fileName?`, `downloaderName?`, `downloadedAt?`, `unsubscribeUrl?`

7. **sendPasswordResetEmail(params)**
   - Sent for password reset
   - Parameters: `to`, `firstName?`, `resetUrl`, `unsubscribeUrl?`

## Frontend Integration

### New Pages

1. **VerifyEmail** (`client/src/pages/VerifyEmail.tsx`)
   - Handles email verification from link
   - Auto-redirects to login after success
   - Allows resending verification email

### Updated Pages

1. **Login** (`client/src/pages/Login.tsx`)
   - Shows verification reminder if email not verified
   - Handles 2FA code input
   - Displays appropriate error messages

2. **Register** (`client/src/pages/Register.tsx`)
   - Shows verification message after successful registration
   - Updated toast duration for verification message

### Routes

Added to `client/src/App.tsx`:
```tsx
<Route path="/verify-email" element={<VerifyEmail />} />
```

## Security Features

1. **Email Verification**
   - Prevents fake email registrations
   - Ensures users have access to their email
   - Token expires after 24 hours

2. **Two-Factor Authentication**
   - Optional additional security layer
   - 6-digit codes expire after 10 minutes
   - Codes are single-use (cleared after verification)

3. **Google OAuth Integration**
   - Automatically marks email as verified (Google already verified it)
   - Updates existing unverified accounts

## Testing Checklist

### Email Verification
- [ ] Register new account
- [ ] Receive verification email in Gmail
- [ ] Click verification link
- [ ] Successfully verify email
- [ ] Login after verification
- [ ] Cannot login before verification
- [ ] Resend verification email works
- [ ] Expired token shows appropriate error

### Two-Factor Authentication
- [ ] Enable 2FA from account settings
- [ ] Login triggers 2FA code email
- [ ] Receive 6-digit code in Gmail
- [ ] Enter correct code to complete login
- [ ] Invalid code shows error
- [ ] Expired code shows error
- [ ] Disable 2FA requires 2FA code

### Email Notifications
- [ ] Welcome email received after verification
- [ ] File shared notification received
- [ ] Access granted notification received
- [ ] Download notification received (if enabled)
- [ ] All emails properly formatted
- [ ] Links in emails work correctly

### Google OAuth
- [ ] Google login automatically verifies email
- [ ] Existing unverified account gets verified via Google

## Troubleshooting

### Emails Not Sending

1. **Check Gmail App Password**
   - Ensure 2-Step Verification is enabled
   - Generate new app password if needed
   - Verify password in `.env` is correct (no spaces)

2. **Check SMTP Settings**
   ```env
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587  # Use 465 for SSL, 587 for TLS
   ```

3. **Check Server Logs**
   - Look for "Welcome email error" or similar messages
   - Check for SMTP connection errors

4. **Test Email Service**
   ```javascript
   // Run in server context
   const EmailService = require('./services/emailService');
   await EmailService.sendWelcomeEmail({
     to: 'test@example.com',
     firstName: 'Test'
   });
   ```

### Gmail Blocking Emails

1. **Check Gmail Security Settings**
   - Ensure "Less secure app access" is OFF (we use App Password)
   - Check for any blocked sign-in attempts

2. **Check Spam Folder**
   - Emails might be filtered to spam initially
   - Mark as "Not Spam" to train Gmail

3. **Sending Limits**
   - Gmail has daily sending limits (~500 emails/day)
   - Consider using a dedicated email service for production

### 2FA Code Issues

1. **Code Expired**
   - Codes expire after 10 minutes
   - Request a new code by attempting login again

2. **Code Not Received**
   - Check spam folder
   - Verify email address is correct
   - Check server logs for email sending errors

## Production Considerations

### Email Service Provider

For production, consider using a dedicated email service:

1. **SendGrid**
   - High deliverability
   - Analytics and tracking
   - Free tier available

2. **AWS SES**
   - Cost-effective
   - Scalable
   - Requires domain verification

3. **Mailgun**
   - Developer-friendly
   - Good documentation
   - Free tier available

### Configuration Changes

Update `server/services/emailService.ts` for your email provider:

```typescript
function createTransport(): Transporter {
  // For SendGrid
  return nodemailer.createTransport({
    host: 'smtp.sendgrid.net',
    port: 587,
    auth: {
      user: 'apikey',
      pass: process.env.SENDGRID_API_KEY
    }
  });
  
  // For AWS SES
  return nodemailer.createTransport({
    host: 'email-smtp.us-east-1.amazonaws.com',
    port: 587,
    auth: {
      user: process.env.AWS_SES_USERNAME,
      pass: process.env.AWS_SES_PASSWORD
    }
  });
}
```

### Security Best Practices

1. **Environment Variables**
   - Never commit `.env` file
   - Use secure key management in production
   - Rotate credentials regularly

2. **Rate Limiting**
   - Implement rate limiting for email endpoints
   - Prevent email bombing attacks

3. **Email Templates**
   - Store templates separately for easy updates
   - Use proper HTML sanitization

4. **Monitoring**
   - Track email delivery rates
   - Monitor bounce rates
   - Set up alerts for failures

## Future Enhancements

1. **Email Templates**
   - Move HTML to separate template files
   - Support multiple languages
   - Add company branding

2. **Unsubscribe Management**
   - Implement unsubscribe functionality
   - Track user preferences
   - Comply with email regulations (CAN-SPAM, GDPR)

3. **Email Analytics**
   - Track open rates
   - Track click rates
   - A/B testing for emails

4. **Advanced 2FA**
   - Support TOTP (Google Authenticator)
   - SMS-based 2FA
   - Backup codes

## Support

For issues or questions:
1. Check server logs for errors
2. Verify Gmail configuration
3. Test with a different email provider
4. Check network/firewall settings
