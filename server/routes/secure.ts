import express, { Request, Response, NextFunction } from 'express';
import { SecureLinkService } from '../services/secureLinkService';
import { fileStorageService } from '../services/fileStorage';

const router = express.Router();

// Access file via secure link (no authentication required)
router.get('/:token', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token } = req.params;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');

    // Validate the secure link
    const { file, secureLink } = await SecureLinkService.validateSecureLink(token);

    // Check if user is authenticated and has direct access
    let userAccessLevel = null;
    if (req.headers.authorization?.startsWith('Bearer ')) {
      try {
        const jwt = require('jsonwebtoken');
        const token = req.headers.authorization.slice(7);
        const secret = process.env.JWT_SECRET || "dev_secret_change_me";
        const payload = jwt.verify(token, secret) as any;
        const userId = payload.sub;

        // Check direct access
        const FileAccess = require('../models/FileAccess').default;
        const accessRecord = await FileAccess.findOne({
          fileId: file.fileId,
          userId,
          isActive: true
        });

        if (accessRecord) {
          userAccessLevel = accessRecord.accessLevel;
        } else if (file.uploadedBy.toString() === userId) {
          userAccessLevel = 'admin';
        }
      } catch (authError) {
        // Ignore auth errors, proceed with link-based access
      }
    }

    // Enforce secure link policies
    if (secureLink.passwordHash) {
      const provided = (req.query.password as string) || req.get('x-secure-password') || '';
      const [salt, storedHash] = (secureLink.passwordHash as string).split(':');
      const { scryptSync } = require('crypto');
      const computed = provided ? scryptSync(provided, salt, 64).toString('hex') : '';
      const ok = !!provided && computed === storedHash;
      if (!ok) {
        return res.status(401).json({ success: false, error: 'Password required', message: 'Valid password is required.' });
      }
    }

    if (secureLink.requireEmail) {
      const email = (req.query.email as string) || req.get('x-visitor-email');
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
      if (!email) {
        return res.status(400).json({ success: false, error: 'Email required', message: 'Visitor email is required.' });
      }
      if (!emailRegex.test(email)) {
        return res.status(400).json({ success: false, error: 'Invalid email', message: 'Please provide a valid email address.' });
      }
    }

    if (secureLink.allowPreview === false) {
      return res.status(403).json({ success: false, error: 'Preview disabled', message: 'Preview is disabled for this link.' });
    }

    // If user has direct access, allow access without consuming link quota
    if (userAccessLevel) {
      // Record access in file history but not in secure link
      const FileModel = require('../models/File').default;
      await FileModel.updateOne(
        { fileId: file.fileId },
        {
          $set: { lastAccessedAt: new Date() },
          $push: {
            accessHistory: {
              accessedAt: new Date(),
              accessType: 'view',
              ipAddress,
              userAgent,
              userId: userAccessLevel === 'admin' ? file.uploadedBy : null // Would need to get from JWT
            }
          }
        }
      );

      // Set appropriate headers for file viewing
      res.setHeader('Content-Type', file.mimeType);
      res.setHeader('Content-Disposition', `inline; filename="${file.originalName}"`);
      res.setHeader('Content-Length', file.fileSize);
      res.setHeader('Cache-Control', 'private, max-age=3600'); // Cache for 1 hour

      // Stream the file
      const fileBuffer = await fileStorageService.getFile(file.filePath);
      return res.send(fileBuffer);
    }

    // Record the access via secure link
    await SecureLinkService.recordAccess(token, ipAddress, userAgent, 'view');

    // Set appropriate headers for file viewing
    res.setHeader('Content-Type', file.mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${file.originalName}"`);
    res.setHeader('Content-Length', file.fileSize);
    res.setHeader('Cache-Control', 'private, max-age=3600'); // Cache for 1 hour

    // Watermark signal header for client-side overlay if needed
    if (secureLink.watermarkEnabled) {
      res.setHeader('X-LinkSecure-Watermark', 'true');
    }

    // Stream the file
    const fileBuffer = await fileStorageService.getFile(file.filePath);
    res.send(fileBuffer);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('Invalid') || error.message.includes('expired')) {
        return res.status(403).json({
          success: false,
          error: 'Access Denied',
          message: error.message
        });
      }
    }
    next(error);
  }
});

// Download file via secure link (no authentication required)
router.get('/:token/download', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token } = req.params;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');

    // Validate the secure link
    const { file, secureLink } = await SecureLinkService.validateSecureLink(token);

    // Enforce secure link policies before download
    if (secureLink.passwordHash) {
      const provided = (req.query.password as string) || req.get('x-secure-password') || '';
      const [salt, storedHash] = (secureLink.passwordHash as string).split(':');
      const { scryptSync } = require('crypto');
      const computed = provided ? scryptSync(provided, salt, 64).toString('hex') : '';
      const ok = !!provided && computed === storedHash;
      if (!ok) {
        return res.status(401).json({ success: false, error: 'Password required', message: 'Valid password is required.' });
      }
    }

    if (secureLink.requireEmail) {
      const email = (req.query.email as string) || req.get('x-visitor-email');
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
      if (!email) {
        return res.status(400).json({ success: false, error: 'Email required', message: 'Visitor email is required.' });
      }
      if (!emailRegex.test(email)) {
        return res.status(400).json({ success: false, error: 'Invalid email', message: 'Please provide a valid email address.' });
      }
    }

    // Check if user is authenticated and has direct access
    let userAccessLevel = null;
    if (req.headers.authorization?.startsWith('Bearer ')) {
      try {
        const jwt = require('jsonwebtoken');
        const token = req.headers.authorization.slice(7);
        const secret = process.env.JWT_SECRET || "dev_secret_change_me";
        const payload = jwt.verify(token, secret) as any;
        const userId = payload.sub;

        // Check direct access
        const FileAccess = require('../models/FileAccess').default;
        const accessRecord = await FileAccess.findOne({
          fileId: file.fileId,
          userId,
          isActive: true
        });

        if (accessRecord) {
          userAccessLevel = accessRecord.accessLevel;
        } else if (file.uploadedBy.toString() === userId) {
          userAccessLevel = 'admin';
        }
      } catch (authError) {
        // Ignore auth errors, proceed with link-based access
      }
    }

    // If user has direct access, allow download without consuming link quota
    if (userAccessLevel) {
      // Record download in file history but not in secure link
      const FileModel = require('../models/File').default;
      await FileModel.updateOne(
        { fileId: file.fileId },
        {
          $inc: { downloadCount: 1 },
          $set: { lastAccessedAt: new Date() },
          $push: {
            downloadHistory: {
              downloadedAt: new Date(),
              ipAddress,
              userAgent,
              userId: userAccessLevel === 'admin' ? file.uploadedBy : null // Would need to get from JWT
            },
            accessHistory: {
              accessedAt: new Date(),
              accessType: 'download',
              ipAddress,
              userAgent,
              userId: userAccessLevel === 'admin' ? file.uploadedBy : null
            }
          }
        }
      );

      // Set appropriate headers for file download
      res.setHeader('Content-Type', file.mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${file.originalName}"`);
      res.setHeader('Content-Length', file.fileSize);

      // Stream the file
      const fileBuffer = await fileStorageService.getFile(file.filePath);
      return res.send(fileBuffer);
    }

    // Record the download access via secure link
    await SecureLinkService.recordAccess(token, ipAddress, userAgent, 'download');

    // Set appropriate headers for file download
    res.setHeader('Content-Type', file.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${file.originalName}"`);
    res.setHeader('Content-Length', file.fileSize);

    // Watermark signal header for client-side overlay if needed
    if (secureLink.watermarkEnabled) {
      res.setHeader('X-LinkSecure-Watermark', 'true');
    }

    // Stream the file
    const fileBuffer = await fileStorageService.getFile(file.filePath);
    res.send(fileBuffer);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('Invalid') || error.message.includes('expired')) {
        return res.status(403).json({
          success: false,
          error: 'Access Denied',
          message: error.message
        });
      }
    }
    next(error);
  }
});

// Get secure link info (without downloading)
router.get('/:token/info', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token } = req.params;

    // Validate the secure link
    const { file, secureLink } = await SecureLinkService.validateSecureLink(token);

    // Return file information without the actual file content
    res.json({
      success: true,
      data: {
        fileName: file.originalName,
        fileSize: file.fileSize,
        mimeType: file.mimeType,
        expiresAt: secureLink.expiresAt,
        accessCount: secureLink.accessCount,
        maxAccessCount: secureLink.maxAccessCount,
        isActive: secureLink.isActive,
        policies: {
          passwordProtected: !!secureLink.passwordHash,
          requireEmail: !!secureLink.requireEmail,
          watermarkEnabled: !!secureLink.watermarkEnabled,
          allowPreview: secureLink.allowPreview !== false
        }
      }
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('Invalid') || error.message.includes('expired')) {
        return res.status(403).json({
          success: false,
          error: 'Access Denied',
          message: error.message
        });
      }
    }
    next(error);
  }
});

export default router;
