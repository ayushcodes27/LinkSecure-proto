# Required Render Environment Variables

## 🚨 Critical Missing Variable

Your production deployment is **failing because this variable is missing:**

```
STORAGE_TYPE=azure
```

**Without this**, the app defaults to `local` storage and tries to find files on Render's disk instead of Azure Blob Storage.

---

## ✅ Complete Environment Variables Checklist

### **Storage Configuration (REQUIRED)**
```bash
STORAGE_TYPE=azure
AZURE_STORAGE_ACCOUNT_NAME=your_account_name
AZURE_STORAGE_ACCOUNT_KEY=your_account_key
AZURE_STORAGE_CONTAINER_NAME=linksecure-files
```

### **Database (REQUIRED)**
```bash
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database
```

### **JWT Authentication (REQUIRED)**
```bash
JWT_SECRET=your_secure_random_string_here
```

### **Base URL (REQUIRED)**
```bash
BASE_URL=https://linksecure-2cdc.onrender.com
FRONTEND_URL=https://linksecure-2cdc.onrender.com
```

### **Email Service (OPTIONAL - for now)**
```bash
# Option 1: SMTP (will timeout on Render - not recommended)
EMAIL_SERVICE=smtp
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Option 2: Resend (recommended - see RESEND_SETUP_GUIDE.md)
EMAIL_SERVICE=resend
RESEND_API_KEY=re_your_key_here

EMAIL_FROM=LinkSecure <noreply@linksecure.com>
```

### **Server Configuration (OPTIONAL)**
```bash
PORT=5000
NODE_ENV=production
```

---

## 🎯 Immediate Action Required

1. **Go to Render Dashboard**: https://dashboard.render.com
2. **Select your backend web service** (LinkSecure server)
3. **Click "Environment"** tab
4. **Add the missing variable:**
   - Key: `STORAGE_TYPE`
   - Value: `azure`
5. **Click "Save Changes"**
6. **Wait for automatic redeploy** (~2 minutes)

---

## ✅ How to Verify After Deploy

### Check Render Logs
Look for this in the startup logs:
```
🔍 Environment Variables Check:
  STORAGE_TYPE: azure               ✅ Should say "azure"
  AZURE_STORAGE_ACCOUNT_NAME: xxx   ✅ Should be present
  AZURE_STORAGE_ACCOUNT_KEY: xxx... ✅ Should be present
  
🔧 File Storage Configuration:
  Storage Type: azure               ✅ Should say "azure" not "local"
  Azure Config: Present             ✅ Should say "Present"
```

### Test File Download
1. Log into production: https://linksecure-2cdc.onrender.com
2. Try downloading any file
3. Should work without 500 error

---

## 🐛 Common Issues

### Still Getting 500 Error After Adding STORAGE_TYPE?

**Issue:** Old files in database but not in Azure
**Solution:** Upload a NEW file in production and test downloading it

**Issue:** Azure credentials incorrect
**Solution:** Verify all 3 Azure variables are correct:
- Account name matches your Azure Storage account
- Account key is the full key from Azure portal
- Container name exists in your storage account

---

## 📋 Environment Variables Audit

Run this checklist on Render:

- [ ] `STORAGE_TYPE` = `azure`
- [ ] `AZURE_STORAGE_ACCOUNT_NAME` = your storage account name
- [ ] `AZURE_STORAGE_ACCOUNT_KEY` = your storage access key  
- [ ] `AZURE_STORAGE_CONTAINER_NAME` = `linksecure-files`
- [ ] `MONGODB_URI` = your MongoDB connection string
- [ ] `JWT_SECRET` = a secure random string
- [ ] `BASE_URL` = `https://linksecure-2cdc.onrender.com`
- [ ] `FRONTEND_URL` = `https://linksecure-2cdc.onrender.com`

**Email variables are optional for now** - file operations will work without them.

---

## 🔍 Log Analysis

### What You Were Seeing (BEFORE Fix):
```
STORAGE_TYPE: undefined                    ❌ Missing!
Storage Type: local                        ❌ Wrong!
Error: Failed to read file: File not found ❌ Looking in wrong place
```

### What You Should See (AFTER Fix):
```
STORAGE_TYPE: azure                        ✅ Correct
Storage Type: azure                        ✅ Correct  
Azure Config: Present                      ✅ Good
✅ File uploaded successfully              ✅ Working
```

---

## 💡 Why This Happened

The `fileStorage.ts` service has this logic:
```typescript
storageType: (process.env.STORAGE_TYPE as 'local' | 'azure') || 'local'
```

When `STORAGE_TYPE` is **undefined**, it defaults to `'local'`.

With `'local'`, the service tries to read from:
```
/opt/render/project/src/uploads/filename.pdf  ❌ Render disk (empty)
```

With `'azure'`, it reads from:
```
https://youraccount.blob.core.windows.net/container/filename.pdf  ✅ Azure (has files)
```

---

## 🚀 Expected Timeline

1. **Add `STORAGE_TYPE=azure`**: 30 seconds
2. **Render auto-redeploys**: ~2 minutes  
3. **Server starts with correct config**: immediate
4. **Files download successfully**: immediate

**Total time to fix: ~3 minutes** ⚡

---

## 📞 Need Help?

If downloads still fail after adding `STORAGE_TYPE=azure`:

1. Check Render logs for any Azure authentication errors
2. Verify your Azure Storage account is accessible
3. Confirm files actually exist in your Azure container
4. Test by uploading a NEW file in production

---

**Priority:** 🔥 **CRITICAL** - Add this now to fix all file downloads!
