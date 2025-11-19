import { Router, Request, Response } from 'express';
import axios from 'axios';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import LinkMapping from '../models/LinkMapping';
import { getAzureSASService } from '../services/azureSASService';
import { 
  generateUniqueShortCode, 
  isValidShortCode, 
  calculateExpiryTime,
  isExpired 
} from '../services/linkUtils';
import { requireAuth } from '../middleware/auth';

const router = Router();

/**
 * GET /api/links/my-links
 * Get all links created by the authenticated user
 * 
 * Authentication: Required (Bearer Token)
 * 
 * Response:
 * {
 *   "success": true,
 *   "links": [
 *     {
 *       "short_code": "xyz123ab",
 *       "status": "active",
 *       "blob_path": "userId/file.pdf",
 *       "created_at": "2024-01-15T10:30:00.000Z",
 *       "expires_at": "2024-01-16T10:30:00.000Z",
 *       "access_count": 5,
 *       "metadata": { ... }
 *     }
 *   ]
 * }
 */
router.get('/my-links', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    
    // Find all links created by this user, sorted by creation date (newest first)
    const myLinks = await LinkMapping.find({ owner_id: userId }).sort({ created_at: -1 });
    
    return res.status(200).json({
      success: true,
      links: myLinks
    });
  } catch (error) {
    console.error('❌ Error fetching user links:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Failed to fetch user links'
    });
  }
});

/**
 * PATCH /api/links/:short_code/revoke
 * Revoke a specific link by updating its status to 'revoked'
 * 
 * Authentication: Required (Bearer Token)
 * 
 * URL Parameters:
 * - short_code: 8-character alphanumeric identifier
 * 
 * Response (Success):
 * {
 *   "success": true,
 *   "message": "Link successfully revoked",
 *   "link": { ... }
 * }
 * 
 * Response (Not Found):
 * {
 *   "success": false,
 *   "error": "Not Found",
 *   "message": "Link not found"
 * }
 * 
 * Response (Forbidden):
 * {
 *   "success": false,
 *   "error": "Forbidden",
 *   "message": "You do not own this link"
 * }
 */
router.patch('/:short_code/revoke', requireAuth, async (req: Request, res: Response) => {
  try {
    const { short_code } = req.params;
    const userId = (req as any).user.id;
    
    // Validate short code format
    if (!isValidShortCode(short_code)) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Invalid short code format'
      });
    }
    
    // Find the link in the database
    const link = await LinkMapping.findOne({ short_code });
    
    if (!link) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Link not found'
      });
    }
    
    // Validate ownership
    if (link.owner_id !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'You do not own this link'
      });
    }
    
    // Revoke the link
    link.status = 'revoked';
    link.is_active = false; // Also set is_active to false for backward compatibility
    await link.save();
    
    console.log(`✅ Link revoked: ${short_code} by user ${userId}`);
    
    return res.status(200).json({
      success: true,
      message: 'Link successfully revoked',
      link
    });
  } catch (error) {
    console.error('❌ Error revoking link:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Failed to revoke link'
    });
  }
});

/**
 * POST /api/v1/links/create
 * Create a new short link that maps to an Azure Blob Storage file
 * 
 * Request Body:
 * {
 *   "owner_id": "string",        // Required: User ID of the link creator
 *   "blob_path": "string",       // Required: Full path to file in Azure (e.g., "userId/file.pdf")
 *   "expiry_minutes": number,    // Optional: Minutes until link expires (default: 1440 = 24 hours)
 *   "metadata": {                // Optional: Additional file information
 *     "original_file_name": "string",
 *     "file_size": number,
 *     "mime_type": "string"
 *   }
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "link": "https://your-domain/s/xyz123ab",
 *   "short_code": "xyz123ab",
 *   "expires_at": "2024-01-15T10:30:00.000Z",
 *   "blob_path": "userId/file.pdf"
 * }
 */
router.post('/create', async (req: Request, res: Response) => {
  try {
    const { owner_id, blob_path, expiry_minutes = 1440, metadata, password } = req.body;

    // Validation
    if (!owner_id) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'owner_id is required'
      });
    }

    if (!blob_path) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'blob_path is required'
      });
    }

    // Validate expiry_minutes range (1 hour to 7 days)
    const minExpiry = 60; // 1 hour
    const maxExpiry = 10080; // 7 days
    const validatedExpiryMinutes = Math.max(minExpiry, Math.min(maxExpiry, expiry_minutes));

    if (validatedExpiryMinutes !== expiry_minutes) {
      console.warn(`⚠️  Expiry minutes adjusted from ${expiry_minutes} to ${validatedExpiryMinutes}`);
    }

    // Verify the blob exists in Azure Storage
    const azureSAS = getAzureSASService();
    const blobExists = await azureSAS.blobExists(blob_path);

    if (!blobExists) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'The specified file does not exist in Azure Storage'
      });
    }

    // Generate unique short code
    const short_code = await generateUniqueShortCode();

    // Calculate expiry time
    const expires_at = calculateExpiryTime(validatedExpiryMinutes);

    // Hash password if provided
    let passwordHash: string | undefined;
    if (password && password.trim().length > 0) {
      const saltRounds = 10;
      passwordHash = await bcrypt.hash(password, saltRounds);
      console.log('🔒 Password protection enabled for link');
    }

    // Create link mapping in database
    const linkMapping = new LinkMapping({
      short_code,
      blob_path,
      owner_id,
      expires_at,
      passwordHash,
      metadata: metadata || {}
    });

    await linkMapping.save();

    // Construct the frontend viewer URL (not backend direct download)
    const frontendUrl = process.env.FRONTEND_URL || process.env.CLIENT_URL || 'http://localhost:8080';
    const linkUrl = `${frontendUrl}/#/s/${short_code}`;

    console.log('✅ Created new short link:');
    console.log(`  🔗 Short Code: ${short_code}`);
    console.log(`  📄 Blob Path: ${blob_path}`);
    console.log(`  👤 Owner: ${owner_id}`);
    console.log(`  ⏰ Expires: ${expires_at.toISOString()}`);

    return res.status(201).json({
      success: true,
      link: linkUrl,
      short_code,
      expires_at: expires_at.toISOString(),
      blob_path,
      owner_id,
      created_at: linkMapping.created_at
    });

  } catch (error) {
    console.error('❌ Error creating link:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Failed to create link'
    });
  }
});

/**
 * POST /api/v1/links/verify/:short_code
 * Verify password for a password-protected link and return a JWT token
 * 
 * Request Body:
 * {
 *   "password": "string"
 * }
 * 
 * Response (Success):
 * {
 *   "success": true,
 *   "downloadToken": "jwt_token_here"
 * }
 * 
 * Response (Failure):
 * {
 *   "success": false,
 *   "error": "Forbidden",
 *   "message": "Invalid password"
 * }
 */
router.post('/verify/:short_code', async (req: Request, res: Response) => {
  try {
    const { short_code } = req.params;
    const { password } = req.body;

    // Validate short code format
    if (!isValidShortCode(short_code)) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Invalid short code format'
      });
    }

    // Find the link mapping
    const linkMapping = await LinkMapping.findByShortCode(short_code);

    if (!linkMapping) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Link not found'
      });
    }

    // Check if link has expired
    if (isExpired(linkMapping.expires_at)) {
      return res.status(410).json({
        success: false,
        error: 'Gone',
        message: 'Link has expired'
      });
    }

    // Check if link is password-protected
    if (!linkMapping.passwordHash) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'This link is not password-protected'
      });
    }

    // Validate password
    if (!password || password.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Password is required'
      });
    }

    // Compare password with hash
    const isPasswordValid = await bcrypt.compare(password, linkMapping.passwordHash);

    if (!isPasswordValid) {
      console.warn(`⚠️  Invalid password attempt for link: ${short_code}`);
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'Invalid password'
      });
    }

    // Generate JWT token (valid for 5 minutes)
    const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
    const token = jwt.sign(
      { short_code },
      JWT_SECRET,
      { expiresIn: '5m' }
    );

    console.log(`✅ Password verified for link: ${short_code}`);

    return res.status(200).json({
      success: true,
      downloadToken: token
    });

  } catch (error) {
    console.error('❌ Error verifying password:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Failed to verify password'
    });
  }
});

/**
 * GET /s/:short_code
 * Proxy and stream Azure Blob Storage file to the user
 * 
 * This route securely proxies files from Azure, hiding the underlying storage URL
 * and keeping the linksecure.onrender.com URL in the browser's address bar.
 * 
 * URL Parameters:
 * - short_code: 8-character alphanumeric identifier
 * 
 * Response:
 * - 200 OK: File stream with proper headers (Content-Disposition, Content-Type, Content-Length)
 * - 400 Bad Request: Invalid short code format
 * - 404 Not Found: Short code doesn't exist
 * - 410 Gone: Link has expired
 * - 500 Internal Server Error: Server error or streaming error
 * 
 * Security:
 * - Azure SAS URL is generated server-side and never exposed to the client
 * - File is streamed in chunks, not loaded into memory
 * - Access count is tracked in the database
 * - Original filename and MIME type are preserved from metadata
 */

/**
 * GET /api/links/:short_code/content
 * Stream file content inline (for preview/display, not download)
 * This endpoint serves files with Content-Disposition: inline
 * Use case: Embedding files in viewer pages, PDFs, images, videos
 * Features:
 * - Same validation as download route
 * - Serves content inline instead of attachment
 * - Supports watermarking, email capture workflows
 * - CORS-enabled for frontend embedding
 */

// Handle OPTIONS preflight for CORS
router.options('/:short_code/content', (req: Request, res: Response) => {
  const allowedOrigin = process.env.FRONTEND_URL || process.env.CLIENT_URL || '*';
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Range');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours
  res.status(204).end();
});

router.get('/:short_code/content', async (req: Request, res: Response) => {
  try {
    const { short_code } = req.params;

    console.log(`🔍 Content stream request for: ${short_code}`);
    
    // Validate short code format
    if (!isValidShortCode(short_code)) {
      console.warn(`⚠️  Invalid short code format: ${short_code}`);
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Invalid link format'
      });
    }

    // Look up the link mapping in database
    const linkMapping = await LinkMapping.findByShortCode(short_code);

    if (!linkMapping) {
      console.warn(`⚠️  Short code not found: ${short_code}`);
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Link does not exist or has been deleted'
      });
    }

    // Check if the link has been revoked
    if (linkMapping.status === 'revoked') {
      console.warn(`⚠️  Link revoked: ${short_code}`);
      return res.status(410).json({
        success: false,
        error: 'Gone',
        message: 'This link has been revoked by the owner',
        status: 'revoked'
      });
    }

    // Check if link has expired
    if (isExpired(linkMapping.expires_at)) {
      console.warn(`⚠️  Link expired: ${short_code}`);
      
      // Auto-update status to expired
      if (linkMapping.status === 'active') {
        linkMapping.status = 'expired';
        linkMapping.is_active = false;
        await linkMapping.save();
      }
      
      return res.status(410).json({
        success: false,
        error: 'Gone',
        message: 'This link has expired',
        status: 'expired',
        expiredAt: linkMapping.expires_at
      });
    }

    // Extract file metadata
    const originalFileName = linkMapping.metadata?.original_file_name || 'file';
    const mimeType = linkMapping.metadata?.mime_type || 'application/octet-stream';
    const fileSize = linkMapping.metadata?.file_size;

    // If this is just a check request (not actual content fetch), return metadata only
    if (req.query.check === 'true') {
      console.log(`✅ Access check passed for: ${short_code}`);
      return res.status(200).json({
        success: true,
        fileName: originalFileName,
        mimeType,
        fileSize,
        requiresPassword: !!linkMapping.passwordHash
      });
    }

    // Check if link is password-protected (only for actual content fetch)
    if (linkMapping.passwordHash) {
      const downloadToken = req.query.token as string;

      console.log(`🔐 Password-protected link - Token check:`, {
        short_code,
        hasToken: !!downloadToken,
        queryParams: req.query,
        url: req.url
      });

      if (!downloadToken) {
        console.warn(`⚠️  Password-protected content accessed without token: ${short_code}`);
        return res.status(401).json({
          success: false,
          error: 'Unauthorized',
          message: 'Password required',
          requiresPassword: true,
          fileName: originalFileName
        });
      }

      // Verify JWT token
      try {
        const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
        const decoded = jwt.verify(downloadToken, JWT_SECRET) as { short_code: string };

        if (decoded.short_code !== short_code) {
          console.warn(`⚠️  Token mismatch: ${short_code}`);
          return res.status(403).json({
            success: false,
            error: 'Forbidden',
            message: 'Invalid download token'
          });
        }

        console.log(`🔓 Valid token for content stream: ${short_code}`);
      } catch (error) {
        console.warn(`⚠️  Invalid token: ${short_code}`);
        return res.status(401).json({
          success: false,
          error: 'Unauthorized',
          message: 'Download token is invalid or expired',
          requiresPassword: true
        });
      }
    }

    // Generate Azure SAS URL
    const azureSAS = getAzureSASService();
    const sasUrl = await azureSAS.generateRedirectSASUrl(linkMapping.blob_path);

    console.log('✅ Streaming content inline:');
    console.log(`  🔗 Short Code: ${short_code}`);
    console.log(`  📄 Blob Path: ${linkMapping.blob_path}`);
    console.log(`  📊 Access Count: ${linkMapping.access_count + 1}`);
    console.log(`  🖼️  Serving as: INLINE (not download)`);

    // Fetch the file from Azure as a stream
    const azureResponse = await axios.get(sasUrl, {
      responseType: 'stream',
      validateStatus: (status) => status < 500
    });

    if (azureResponse.status !== 200) {
      console.error(`❌ Azure error ${azureResponse.status} for: ${linkMapping.blob_path}`);
      return res.status(azureResponse.status).json({
        success: false,
        error: 'Storage Error',
        message: 'File could not be retrieved from storage'
      });
    }

    // Set response headers for INLINE viewing (not download)
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${originalFileName}"`);
    
    if (fileSize) {
      res.setHeader('Content-Length', fileSize.toString());
    }

    // CORS headers for frontend embedding (must be set first)
    const allowedOrigin = process.env.FRONTEND_URL || process.env.CLIENT_URL || '*';
    res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Range');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Range, Content-Type');

    // Security headers - allow iframe embedding from our domain
    res.setHeader('X-Content-Type-Options', 'nosniff');
    // Note: X-Frame-Options is omitted because CSP frame-ancestors is more flexible and takes precedence
    res.setHeader('Content-Security-Policy', `frame-ancestors 'self' ${allowedOrigin} https://*.onrender.com`);
    
    // Cache control for secure content
    res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    // Increment access count
    await LinkMapping.incrementAccessCount(short_code);

    console.log(`📺 Streaming inline: ${originalFileName} (${mimeType})`);

    // Pipe the Azure stream to response
    azureResponse.data.pipe(res);

    // Error handlers
    azureResponse.data.on('error', (streamError: Error) => {
      console.error('❌ Stream error:', streamError);
      if (!res.headersSent) {
        res.status(500).end();
      }
    });

    res.on('finish', () => {
      console.log(`✅ Content streamed successfully: ${short_code}`);
    });

  } catch (error) {
    console.error('❌ Error streaming content:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'An error occurred while processing your request'
    });
  }
});

/**
 * GET /s/:short_code (LEGACY - Redirects to Frontend Viewer)
 * This route is kept for backward compatibility
 * Old links using backend URLs will automatically redirect to the frontend viewer
 */
router.get('/:short_code', async (req: Request, res: Response) => {
  try {
    const { short_code } = req.params;

    console.log(`🔄 Legacy download link accessed: ${short_code} - Redirecting to frontend viewer`);
    
    // Validate short code format
    if (!isValidShortCode(short_code)) {
      console.warn(`⚠️  Invalid short code format: ${short_code}`);
      const frontendUrl = process.env.FRONTEND_URL || process.env.CLIENT_URL || 'http://localhost:8080';
      return res.redirect(`${frontendUrl}/#/error?message=Invalid+link+format`);
    }

    // Redirect to frontend viewer page
    const frontendUrl = process.env.FRONTEND_URL || process.env.CLIENT_URL || 'http://localhost:8080';
    const viewerUrl = `${frontendUrl}/#/s/${short_code}`;
    
    console.log(`🔗 Redirecting to: ${viewerUrl}`);
    return res.redirect(viewerUrl);

    /* OLD IMPLEMENTATION - Now handled by frontend viewer + /api/links/:short_code/content
    // Validate short code format
    if (!isValidShortCode(short_code)) {
      console.warn(`⚠️  Invalid short code format: ${short_code}`);
      return res.status(400).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Invalid Link - LinkSecure</title>
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #f5f5f5; }
            .container { background: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); max-width: 500px; margin: 0 auto; }
            h1 { color: #e74c3c; }
            p { color: #555; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>❌ Invalid Link</h1>
            <p>The link format is invalid. Please check the URL and try again.</p>
          </div>
        </body>
        </html>
      `);
    }

    // Look up the link mapping in database
    console.log(`🔍 Querying database for short_code: ${short_code}`);
    const linkMapping = await LinkMapping.findByShortCode(short_code);
    console.log(`📊 Query result:`, linkMapping ? `Found (ID: ${linkMapping.id})` : 'Not found');

    if (!linkMapping) {
      console.warn(`⚠️  Short code not found in database: ${short_code}`);
      console.log(`💡 Debug: Check if link exists in 'linkmappings' collection with short_code='${short_code}' and is_active=true`);
      return res.status(404).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Link Not Found - LinkSecure</title>
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #f5f5f5; }
            .container { background: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); max-width: 500px; margin: 0 auto; }
            h1 { color: #e74c3c; }
            p { color: #555; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>🔍 Link Not Found</h1>
            <p>This link does not exist or has been deleted.</p>
            <p><small>Error Code: 404</small></p>
          </div>
        </body>
        </html>
      `);
    }

    // Check if the link has been revoked
    if (linkMapping.status === 'revoked') {
      console.warn(`⚠️  Link revoked: ${short_code}`);
      return res.status(410).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Link Revoked - LinkSecure</title>
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #f5f5f5; }
            .container { background: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); max-width: 500px; margin: 0 auto; }
            h1 { color: #e74c3c; }
            p { color: #555; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>🚫 Link Revoked</h1>
            <p>This link has been revoked by the owner.</p>
            <p><small>Error Code: 410 Gone</small></p>
          </div>
        </body>
        </html>
      `);
    }

    // Check if link has expired
    if (isExpired(linkMapping.expires_at)) {
      console.warn(`⚠️  Link expired: ${short_code} (expired at ${linkMapping.expires_at.toISOString()})`);
      
      // Auto-update status to expired
      if (linkMapping.status === 'active') {
        linkMapping.status = 'expired';
        linkMapping.is_active = false;
        await linkMapping.save();
      }
      
      return res.status(410).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Link Expired - LinkSecure</title>
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #f5f5f5; }
            .container { background: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); max-width: 500px; margin: 0 auto; }
            h1 { color: #f39c12; }
            p { color: #555; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>⏰ Link Expired</h1>
            <p>This link has expired and is no longer accessible.</p>
            <p>Expired on: ${linkMapping.expires_at.toLocaleDateString()} at ${linkMapping.expires_at.toLocaleTimeString()}</p>
            <p><small>Error Code: 410 Gone</small></p>
          </div>
        </body>
        </html>
      `);
    }

    // Check if link is password-protected
    if (linkMapping.passwordHash) {
      // Check for download token in query parameters
      const downloadToken = req.query.token as string;

      if (!downloadToken) {
        // No token provided - check if this is an API request or browser navigation
        console.warn(`⚠️  Password-protected link accessed without token: ${short_code}`);
        
        const acceptHeader = req.headers.accept || '';
        const isApiRequest = acceptHeader.includes('application/json') || req.headers['x-requested-with'];
        
        if (isApiRequest) {
          // API request - return JSON response
          console.log(`🔄 Returning JSON response for API request`);
          return res.status(401).json({
            success: false,
            error: 'Unauthorized',
            message: 'Password required',
            requiresPassword: true,
            fileName: linkMapping.metadata?.original_file_name || 'Protected File'
          });
        } else {
          // Browser navigation - redirect to frontend
          console.log(`🔄 Redirecting to frontend password page (hash routing)`);
          const frontendUrl = process.env.FRONTEND_URL || process.env.CLIENT_URL || 'http://localhost:8080';
          // Use hash-based route so backend hosting doesn't need rewrite rules
          return res.redirect(`${frontendUrl}/#/s/${short_code}`);
        }
      }

      // Verify JWT token
      try {
        const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
        const decoded = jwt.verify(downloadToken, JWT_SECRET) as { short_code: string };

        // Verify the token is for this specific short code
        if (decoded.short_code !== short_code) {
          console.warn(`⚠️  Token mismatch for link: ${short_code}`);
          return res.status(403).json({
            success: false,
            error: 'Forbidden',
            message: 'Invalid download token',
            requiresPassword: true
          });
        }

        console.log(`🔓 Valid download token verified for: ${short_code}`);
      } catch (error) {
        // Token is invalid or expired
        console.warn(`⚠️  Invalid or expired token for link: ${short_code}`, error);
        return res.status(401).json({
          success: false,
          error: 'Unauthorized',
          message: 'Download token is invalid or expired',
          requiresPassword: true
        });
      }
    }

    // Generate Azure SAS URL with 60-second expiry for internal use only
    const azureSAS = getAzureSASService();
    const sasUrl = await azureSAS.generateRedirectSASUrl(linkMapping.blob_path);

    console.log('✅ Proxying file stream:');
    console.log(`  🔗 Short Code: ${short_code}`);
    console.log(`  📄 Blob Path: ${linkMapping.blob_path}`);
    console.log(`  📊 Access Count: ${linkMapping.access_count + 1}`);
    console.log(`  🔒 Azure URL hidden from client`);
    if (linkMapping.passwordHash) {
      console.log(`  🔐 Password protection: ENABLED`);
    }

    // Fetch the file from Azure as a stream
    const azureResponse = await axios.get(sasUrl, {
      responseType: 'stream',
      validateStatus: (status) => status < 500 // Accept all non-server-error responses
    });

    // Check if Azure returned an error
    if (azureResponse.status !== 200) {
      console.error(`❌ Azure returned status ${azureResponse.status} for blob: ${linkMapping.blob_path}`);
      return res.status(azureResponse.status).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>File Error - LinkSecure</title>
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #f5f5f5; }
            .container { background: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); max-width: 500px; margin: 0 auto; }
            h1 { color: #e74c3c; }
            p { color: #555; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>❌ File Error</h1>
            <p>The file could not be retrieved from storage.</p>
            <p><small>Error Code: ${azureResponse.status}</small></p>
          </div>
        </body>
        </html>
      `);
    }

    // Extract file metadata from link mapping
    const originalFileName = linkMapping.metadata?.original_file_name || 'download';
    const mimeType = linkMapping.metadata?.mime_type || 'application/octet-stream';
    const fileSize = linkMapping.metadata?.file_size;

    // Set response headers for file download
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${originalFileName}"`);
    
    if (fileSize) {
      res.setHeader('Content-Length', fileSize.toString());
    }

    // Additional security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    // Increment access count before streaming
    await LinkMapping.incrementAccessCount(short_code);

    console.log(`📥 Streaming file: ${originalFileName} (${mimeType}, ${fileSize ? `${fileSize} bytes` : 'size unknown'})`);

    // Pipe the Azure stream directly to the response
    // This streams the file chunk-by-chunk, keeping the LinkSecure URL in the browser
    azureResponse.data.pipe(res);

    // Handle stream errors
    azureResponse.data.on('error', (streamError: Error) => {
      console.error('❌ Error during file streaming:', streamError);
      // If headers haven't been sent yet, send error response
      if (!res.headersSent) {
        res.status(500).send('Error streaming file');
      }
    });

    res.on('error', (responseError: Error) => {
      console.error('❌ Error on response stream:', responseError);
    });

    // Log when streaming completes
    res.on('finish', () => {
      console.log(`✅ File streamed successfully: ${short_code}`);
    });

  } catch (error) {
    console.error('❌ Error processing file proxy:', error);
    return res.status(500).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Error - LinkSecure</title>
        <style>
          body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #f5f5f5; }
          .container { background: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); max-width: 500px; margin: 0 auto; }
          h1 { color: #e74c3c; }
          p { color: #555; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>⚠️ Server Error</h1>
          <p>An error occurred while processing your request. Please try again later.</p>
          <p><small>Error Code: 500</small></p>
        </div>
      </body>
      </html>
    `);
  }
  END OF COMMENTED OUT CODE */
  } catch (error) {
    console.error('❌ Error redirecting to frontend:', error);
    const frontendUrl = process.env.FRONTEND_URL || process.env.CLIENT_URL || 'http://localhost:8080';
    return res.redirect(`${frontendUrl}/#/error?message=Server+error`);
  }
});

/**
 * GET /api/v1/links/:short_code/info
 * Get information about a link without accessing the file
 * Useful for displaying link details
 */
router.get('/:short_code/info', async (req: Request, res: Response) => {
  try {
    const { short_code } = req.params;

    if (!isValidShortCode(short_code)) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Invalid short code format'
      });
    }

    const linkMapping = await LinkMapping.findByShortCode(short_code);

    if (!linkMapping) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Link not found'
      });
    }

    const expired = isExpired(linkMapping.expires_at);

    return res.json({
      success: true,
      short_code: linkMapping.short_code,
      blob_path: linkMapping.blob_path,
      owner_id: linkMapping.owner_id,
      created_at: linkMapping.created_at,
      expires_at: linkMapping.expires_at,
      is_expired: expired,
      access_count: linkMapping.access_count,
      last_accessed_at: linkMapping.last_accessed_at,
      metadata: linkMapping.metadata
    });

  } catch (error) {
    console.error('❌ Error getting link info:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Failed to get link info'
    });
  }
});

/**
 * GET /api/v1/links/user/:owner_id
 * Get all links created by a specific user
 */
router.get('/user/:owner_id', async (req: Request, res: Response) => {
  try {
    const { owner_id } = req.params;
    const { include_expired } = req.query;

    const query: any = { owner_id };
    
    if (include_expired !== 'true') {
      query.expires_at = { $gt: new Date() };
    }

    const links = await LinkMapping.find(query)
      .sort({ created_at: -1 })
      .select('-__v');

    return res.json({
      success: true,
      count: links.length,
      links: links.map(link => ({
        short_code: link.short_code,
        blob_path: link.blob_path,
        created_at: link.created_at,
        expires_at: link.expires_at,
        is_expired: isExpired(link.expires_at),
        access_count: link.access_count,
        last_accessed_at: link.last_accessed_at,
        metadata: link.metadata,
        link_url: `${process.env.FRONTEND_URL || process.env.CLIENT_URL || 'http://localhost:8080'}/#/s/${link.short_code}`
      }))
    });

  } catch (error) {
    console.error('❌ Error getting user links:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Failed to get user links'
    });
  }
});

export default router;
