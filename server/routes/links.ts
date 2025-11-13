import { Router, Request, Response } from 'express';
import LinkMapping from '../models/LinkMapping';
import { getAzureSASService } from '../services/azureSASService';
import { 
  generateUniqueShortCode, 
  isValidShortCode, 
  calculateExpiryTime,
  isExpired 
} from '../services/linkUtils';

const router = Router();

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
    const { owner_id, blob_path, expiry_minutes = 1440, metadata } = req.body;

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

    // Create link mapping in database
    const linkMapping = new LinkMapping({
      short_code,
      blob_path,
      owner_id,
      expires_at,
      metadata: metadata || {}
    });

    await linkMapping.save();

    // Construct the complete link URL
    const baseUrl = process.env.BASE_URL || 'http://localhost:5000';
    const linkUrl = `${baseUrl}/s/${short_code}`;

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
 * GET /s/:short_code
 * Redirect to Azure Blob Storage file using a time-limited SAS URL
 * 
 * URL Parameters:
 * - short_code: 8-character alphanumeric identifier
 * 
 * Response:
 * - 302 Redirect: Temporary redirect to Azure SAS URL (valid for 60 seconds)
 * - 404 Not Found: Short code doesn't exist
 * - 410 Gone: Link has expired
 * - 500 Internal Server Error: Server error
 */
router.get('/:short_code', async (req: Request, res: Response) => {
  try {
    const { short_code } = req.params;

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
    const linkMapping = await LinkMapping.findByShortCode(short_code);

    if (!linkMapping) {
      console.warn(`⚠️  Short code not found: ${short_code}`);
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

    // Check if link has expired
    if (isExpired(linkMapping.expires_at)) {
      console.warn(`⚠️  Link expired: ${short_code} (expired at ${linkMapping.expires_at.toISOString()})`);
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

    // Generate Azure SAS URL with 60-second expiry for immediate redirection
    const azureSAS = getAzureSASService();
    const sasUrl = await azureSAS.generateRedirectSASUrl(linkMapping.blob_path);

    // Increment access count
    await LinkMapping.incrementAccessCount(short_code);

    console.log('✅ Redirecting to file:');
    console.log(`  🔗 Short Code: ${short_code}`);
    console.log(`  📄 Blob Path: ${linkMapping.blob_path}`);
    console.log(`  📊 Access Count: ${linkMapping.access_count + 1}`);
    console.log(`  ⏱️  SAS Expiry: 60 seconds`);

    // Send temporary redirect (302) to the Azure SAS URL
    return res.redirect(302, sasUrl);

  } catch (error) {
    console.error('❌ Error processing redirect:', error);
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
        link_url: `${process.env.BASE_URL || 'http://localhost:5000'}/s/${link.short_code}`
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
