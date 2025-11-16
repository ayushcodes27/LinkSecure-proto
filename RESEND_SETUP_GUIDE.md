# 🚀 Quick Resend Setup Guide (5 minutes)

## Why Resend?
- ✅ **Free tier:** 100 emails/day, 3,000/month
- ✅ **Works on Render:** No SMTP port blocking
- ✅ **Simple API:** Just HTTP POST requests
- ✅ **Fast:** Emails deliver in seconds
- ✅ **Reliable:** 99.99% uptime

---

## Step 1: Sign Up for Resend (2 minutes)

1. Go to https://resend.com/signup
2. Sign up with your email or GitHub
3. Verify your email address
4. You're in! 🎉

---

## Step 2: Get Your API Key (1 minute)

1. Go to **API Keys** in the Resend dashboard
2. Click **"Create API Key"**
3. Name it: `LinkSecure Production`
4. Copy the API key (starts with `re_`)
   ```
   re_123abc456def789...
   ```
5. ⚠️ **Save it now!** You can't see it again

---

## Step 3: Add Environment Variables to Render (2 minutes)

1. Go to your Render dashboard: https://dashboard.render.com
2. Select your **LinkSecure** web service
3. Go to **"Environment"** tab
4. Click **"Add Environment Variable"**
5. Add these two variables:

   ```
   Key: EMAIL_SERVICE
   Value: resend
   ```

   ```
   Key: RESEND_API_KEY
   Value: re_123abc456def789... (paste your actual API key)
   ```

6. (Optional) Update EMAIL_FROM:
   ```
   Key: EMAIL_FROM
   Value: LinkSecure <noreply@yourdomain.com>
   ```

7. Click **"Save Changes"**
8. Render will automatically redeploy 🚀

---

## Step 4: Verify Domain (Optional - For Better Deliverability)

**Only needed if you have a custom domain.**

1. In Resend dashboard, go to **"Domains"**
2. Click **"Add Domain"**
3. Enter your domain: `yourdomain.com`
4. Add the DNS records Resend provides to your domain registrar
5. Wait for verification (usually 5-10 minutes)
6. Update `EMAIL_FROM` to use your verified domain

**Without domain verification:**
- Emails send from `onboarding@resend.dev`
- Still works perfectly!
- Might land in spam (but usually doesn't)

**With domain verification:**
- Emails send from `noreply@yourdomain.com`
- Better deliverability
- Professional appearance

---

## Testing Your Setup

### Option 1: Test via Production App

1. Log into https://linksecure-2cdc.onrender.com
2. Upload a file
3. Share it with your email
4. Check your inbox! 📬

### Option 2: Check Render Logs

1. Go to Render dashboard
2. Click on your web service
3. Go to **"Logs"** tab
4. Look for:
   ```
   📧 Sending email via resend to user@example.com
   ✅ Email sent via Resend: re_abc123
   ```

### If You See Errors:

**Error: `RESEND_API_KEY not configured`**
- Solution: Double-check Step 3, make sure you saved the env vars

**Error: `Resend API error: 401`**
- Solution: API key is wrong, regenerate it in Resend dashboard

**Error: `Resend API error: 422`**
- Solution: Check `EMAIL_FROM` format, should be `Name <email@domain.com>`

---

## Troubleshooting

### Emails Not Arriving?

1. **Check spam folder** - Even with Resend, first emails might go to spam
2. **Check Resend dashboard** - Go to "Emails" tab to see delivery status
3. **Check Render logs** - Look for "✅ Email sent via Resend"
4. **Verify recipient email** - Make sure it's a real, active email address

### Still Using SMTP?

Check Render environment variables. If you see:
```
EMAIL_SERVICE=smtp
```
or if `EMAIL_SERVICE` is not set, it's defaulting to SMTP (which fails on Render).

**Fix:** Set `EMAIL_SERVICE=resend` and add `RESEND_API_KEY`

---

## Email Limits

### Free Plan (Resend):
- **3,000 emails/month**
- **100 emails/day**
- Perfect for testing and small apps

### If You Hit Limits:
- Upgrade to Resend Pro ($20/month for 50,000 emails)
- Or temporarily disable notifications:
  - Remove the share notification toggle
  - Comment out email sends in code

---

## Alternative: SendGrid or Mailgun

Don't want to use Resend? You can use:

### SendGrid:
```env
EMAIL_SERVICE=sendgrid
SENDGRID_API_KEY=SG.xxx
```

### Mailgun:
```env
EMAIL_SERVICE=mailgun
MAILGUN_API_KEY=xxx
MAILGUN_DOMAIN=mg.yourdomain.com
```

Both work exactly the same way! The code supports all three providers.

---

## Summary

✅ Sign up for Resend (free)
✅ Get API key
✅ Add to Render environment:
   - `EMAIL_SERVICE=resend`
   - `RESEND_API_KEY=re_xxx`
✅ Save and wait for redeploy
✅ Test by sharing a file

**Total time:** ~5 minutes
**Cost:** $0 (free tier)
**Emails/month:** 3,000

---

## Need Help?

- **Resend Docs:** https://resend.com/docs
- **Resend Status:** https://status.resend.com
- **Support:** help@resend.com

Happy emailing! 📧✨
