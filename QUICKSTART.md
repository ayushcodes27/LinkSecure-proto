# 🚀 Quick Start Guide - Email System & 2FA

## ⚡ Getting Started in 5 Minutes

### Step 1: Update Gmail App Password (2 minutes)

1. Visit: https://myaccount.google.com/apppasswords
2. Select: **Mail** → **Other (Custom name)** → Enter "LinkSecure"
3. Click **Generate**
4. Copy the 16-character password (remove spaces)

### Step 2: Update .env File (30 seconds)

Open: `/home/ganesh/Desktop/google_auth/server/.env`

Replace the SMTP_PASS line:
```env
SMTP_PASS=your-16-char-password-here
```

### Step 3: Test Email Service (30 seconds)

```bash
cd /home/ganesh/Desktop/google_auth/server
npm run test:email
```

✅ **Success?** You'll receive a test email and see "Email service is working correctly!"

❌ **Failed?** Check `GMAIL_SETUP_GUIDE.md` for troubleshooting

### Step 4: Start Development (1 minute)

```bash
# Terminal 1 - Server
cd /home/ganesh/Desktop/google_auth/server
npm run dev

# Terminal 2 - Client
cd /home/ganesh/Desktop/google_auth/client
npm run dev
```

### Step 5: Test the Features (1 minute)

1. Open: http://localhost:5173
2. Click "Sign up"
3. Register with a real email
4. Check your email for verification link
5. Click the link
6. Login with your credentials

**Done!** 🎉

---

## 🧪 Quick Test Commands

```bash
# Test email service
npm run test:email

# Start server
npm run dev

# View logs
npm run dev | grep -i email
```

---

## 📧 What Emails Will Be Sent?

| Event | Email Type | Trigger |
|-------|-----------|---------|
| Registration | Verification Link | User signs up |
| After Verification | Welcome Email | Email verified |
| Login (2FA on) | 6-Digit Code | User logs in |
| File Shared | Notification | User shares file |
| Access Granted | Notification | User grants access |
| Password Reset | Reset Link | User requests reset |

---

## 🔥 Common Issues

### "Username and Password not accepted"
→ Generate NEW app password, update .env

### Emails not received
→ Check spam folder, verify app password

### "Email verification required"
→ Check email inbox, click verification link

---

## 📚 Full Documentation

- **`GMAIL_SETUP_GUIDE.md`** - Detailed Gmail setup
- **`EMAIL_SYSTEM.md`** - Complete API docs
- **`IMPLEMENTATION_SUMMARY.md`** - All changes made

---

## ✅ Feature Checklist

- ✅ Email verification (required for login)
- ✅ Two-factor authentication (optional)
- ✅ Welcome emails
- ✅ File sharing notifications
- ✅ Access granted notifications
- ✅ Google OAuth integration
- ✅ Test script included

---

## 🎯 What's Next?

After testing locally:

1. **Production Email**: Switch to SendGrid/AWS SES
2. **Security**: Add rate limiting
3. **Monitoring**: Track email delivery
4. **Features**: Add email preferences, unsubscribe

---

**Need Help?** Check `GMAIL_SETUP_GUIDE.md` for detailed instructions!

**Everything Working?** Start testing file uploads and sharing! 🚀
