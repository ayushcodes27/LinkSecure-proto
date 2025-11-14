# File Proxy Streaming Implementation

## Overview
Modified the short link redirect endpoint (`GET /s/:short_code`) to **proxy and stream files** instead of redirecting to Azure Blob Storage URLs. This keeps the LinkSecure URL in the browser and completely hides Azure storage details from users.

## Changes Made (Commit: 0c3f057)

### 1. Installed Dependencies
```bash
npm install axios
```
- **axios**: Used for HTTP streaming from Azure to our server

### 2. Updated Route: `GET /s/:short_code`

**Before (Redirect Approach):**
```typescript
// Generate Azure SAS URL
const sasUrl = await azureSAS.generateRedirectSASUrl(linkMapping.blob_path);

// Redirect user to Azure
return res.redirect(302, sasUrl);
```

**Problem with redirect:**
- ❌ Azure URL exposed in browser address bar
- ❌ User sees `blob.core.windows.net` domain
- ❌ SAS token visible in URL
- ❌ Direct link to Azure infrastructure

**After (Proxy Streaming Approach):**
```typescript
// 1. Generate SAS URL (server-side only)
const sasUrl = await azureSAS.generateRedirectSASUrl(linkMapping.blob_path);

// 2. Fetch file from Azure as a stream
const azureResponse = await axios.get(sasUrl, {
  responseType: 'stream'
});

// 3. Extract metadata from database
const originalFileName = linkMapping.metadata?.original_file_name;
const mimeType = linkMapping.metadata?.mime_type;
const fileSize = linkMapping.metadata?.file_size;

// 4. Set proper download headers
res.setHeader('Content-Type', mimeType);
res.setHeader('Content-Disposition', `attachment; filename="${originalFileName}"`);
res.setHeader('Content-Length', fileSize.toString());

// 5. Stream file to user
azureResponse.data.pipe(res);
```

**Benefits of proxy streaming:**
- ✅ Browser shows `linksecure.onrender.com/s/xyz123` throughout download
- ✅ Azure URL completely hidden from user
- ✅ Original filename preserved (`photo.jpg` instead of blob hash)
- ✅ Proper MIME type for browser handling
- ✅ Download progress bar (Content-Length header)
- ✅ Memory efficient (streams chunks, not loaded fully)
- ✅ Access tracking still works

## How It Works Now

### User Flow:
1. User clicks: `https://linksecure.onrender.com/s/x7mK4pQz`
2. Browser sends GET request to your server
3. **Server-side operations (invisible to user):**
   - Looks up `x7mK4pQz` in database → finds `blob_path: "user123/photo.jpg"`
   - Generates 60-second Azure SAS URL (server-side only)
   - Makes HTTP request to Azure with SAS token
   - Receives file stream from Azure
4. **Server sets response headers:**
   ```
   Content-Type: image/jpeg
   Content-Disposition: attachment; filename="photo.jpg"
   Content-Length: 181285
   ```
5. **Server pipes Azure stream to browser**
6. Browser downloads file showing:
   - URL: `linksecure.onrender.com/s/x7mK4pQz` ← **Never changes**
   - Filename: `photo.jpg` ← **Original name from metadata**
   - Progress: 45% (181 KB / 400 KB) ← **Content-Length enables this**

### Server-Side Flow Diagram:
```
User Browser                LinkSecure Server              Azure Storage
     |                              |                              |
     |  GET /s/x7mK4pQz            |                              |
     |---------------------------->|                              |
     |                              |                              |
     |                              | DB Lookup (x7mK4pQz)        |
     |                              | → blob_path: user123/photo  |
     |                              |                              |
     |                              | Generate SAS Token           |
     |                              | (60-second, internal only)   |
     |                              |                              |
     |                              | GET blob + SAS               |
     |                              |---------------------------->|
     |                              |                              |
     |                              |    File Stream               |
     |                              |<----------------------------|
     |                              |                              |
     |    File Stream (proxied)     |                              |
     |<-----------------------------|                              |
     |                              |                              |
     |  (URL stays linksecure.com)  |                              |
```

## Response Headers Set

```http
Content-Type: image/jpeg
Content-Disposition: attachment; filename="photo.jpg"
Content-Length: 181285
X-Content-Type-Options: nosniff
Cache-Control: no-cache, no-store, must-revalidate
Pragma: no-cache
Expires: 0
```

### Header Explanations:

- **Content-Type**: Tells browser the file type (e.g., `image/jpeg`, `application/pdf`)
- **Content-Disposition**: Forces download with original filename
- **Content-Length**: Enables progress bar in browser
- **X-Content-Type-Options**: Security - prevents MIME sniffing
- **Cache-Control**: Prevents caching of sensitive files
- **Pragma/Expires**: Legacy cache prevention

## Error Handling

### Database Errors:
```typescript
if (!linkMapping) {
  return res.status(404).send('Link Not Found HTML');
}

if (isExpired(linkMapping.expires_at)) {
  return res.status(410).send('Link Expired HTML');
}
```

### Azure Errors:
```typescript
if (azureResponse.status !== 200) {
  return res.status(azureResponse.status).send('File Error HTML');
}
```

### Streaming Errors:
```typescript
azureResponse.data.on('error', (streamError) => {
  console.error('Error during file streaming:', streamError);
  if (!res.headersSent) {
    res.status(500).send('Error streaming file');
  }
});

res.on('error', (responseError) => {
  console.error('Error on response stream:', responseError);
});

res.on('finish', () => {
  console.log('File streamed successfully');
});
```

## Metadata Requirements

For proper file handling, the following metadata **must be stored** in the `LinkMapping` document when creating short links:

```typescript
metadata: {
  original_file_name: "photo.jpg",  // ← Required for Content-Disposition
  file_size: 181285,                // ← Required for Content-Length
  mime_type: "image/jpeg"           // ← Required for Content-Type
}
```

This metadata is extracted from the `File` model during link creation (already implemented in the unified endpoint).

## Security Benefits

1. **URL Obfuscation**: Azure storage structure hidden from users
2. **Token Protection**: SAS tokens never exposed to client
3. **Access Control**: All requests go through your auth/validation layer
4. **Audit Trail**: Access count tracked in database before streaming
5. **No Direct Access**: Users cannot bypass your server to access Azure
6. **Cache Prevention**: Headers prevent sensitive file caching

## Performance Considerations

### Memory Efficiency:
- **Streaming**: File is piped in chunks (default ~64KB per chunk)
- **No Buffer**: File is NOT loaded entirely into server memory
- **Concurrent Support**: Multiple users can download simultaneously

### Example:
```
1 GB file download:
❌ Without streaming: Server needs 1 GB RAM per user
✅ With streaming: Server needs ~64 KB RAM per user (1/16000th!)
```

## Testing Checklist

After deployment, verify:

1. **URL Persistence**:
   - [ ] Click short link: `https://linksecure.onrender.com/s/xyz123`
   - [ ] During download, URL stays as `linksecure.onrender.com/s/xyz123`
   - [ ] After download, URL still shows `linksecure.onrender.com/s/xyz123`

2. **File Metadata**:
   - [ ] Downloaded file has correct original name (not blob hash)
   - [ ] MIME type handled correctly (images preview, PDFs open, etc.)
   - [ ] Download progress bar appears (thanks to Content-Length)

3. **Error Handling**:
   - [ ] Invalid short code → 400 error page
   - [ ] Non-existent link → 404 error page
   - [ ] Expired link → 410 error page
   - [ ] Azure error → 500 error page

4. **Access Tracking**:
   - [ ] Each download increments `access_count` in database
   - [ ] `last_accessed_at` timestamp updates

## Comparison: Before vs After

| Aspect | Before (Redirect) | After (Proxy Stream) |
|--------|------------------|---------------------|
| Browser URL | Changes to Azure | Stays LinkSecure |
| Azure Exposure | Visible | Hidden |
| SAS Token | In browser | Server-only |
| Filename | Blob hash | Original name |
| Progress Bar | ❌ | ✅ |
| Memory Usage | N/A | ~64KB per user |
| Cache Control | Limited | Full control |
| Access Tracking | ✅ | ✅ |

## Next Steps

1. **Redeploy backend** (automatic via GitHub push)
2. **Test with real files** (especially large files like videos)
3. **Monitor server logs** for streaming errors
4. **Check server memory usage** under load

## Technical Notes

- **Stream Chunk Size**: Default ~64KB (configurable via axios)
- **SAS Token TTL**: 60 seconds (only used server-to-Azure)
- **Response Timeout**: Default 2 minutes (Express default)
- **Max File Size**: Limited by Azure (not by this implementation)
- **Concurrent Downloads**: Supported (each gets its own stream)

## Troubleshooting

### Issue: Download hangs or times out
**Solution**: Check Azure SAS token validity and network connectivity

### Issue: Wrong filename downloaded
**Solution**: Verify `metadata.original_file_name` is set during link creation

### Issue: No progress bar
**Solution**: Ensure `metadata.file_size` is stored and `Content-Length` header is set

### Issue: High memory usage
**Solution**: Verify `responseType: 'stream'` is set in axios (already done)
