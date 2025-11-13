import SecureLinkModel, { ISecureLink } from '../models/SecureLink';
import FileModel from '../models/File';
import { randomUUID, randomBytes, scryptSync } from 'crypto';
import mongoose from 'mongoose';
import { 
  BlobServiceClient, 
  StorageSharedKeyCredential, 
  generateBlobSASQueryParameters, 
  BlobSASPermissions 
} from '@azure/storage-blob';

export interface CreateSecureLinkOptions {
  fileId: string;
  createdBy: string;
  expiresInHours?: number;
  maxAccessCount?: number;
  useTrackingPage?: boolean; // Optional: use tracking page instead of direct Azure URL
  passwordPlain?: string;
  requireEmail?: boolean;
  allowPreview?: boolean;
  watermarkEnabled?: boolean;
}

export interface SecureLinkResponse {
  linkId: string;
  secureToken: string;
  secureUrl: string;
  expiresAt: Date;
  maxAccessCount?: number;
  fileName: string;
  originalName: string;
}

export class SecureLinkService {
  private static readonly DEFAULT_EXPIRY_HOURS = parseInt(process.env.SAS_DEFAULT_EXPIRY_HOURS || '24');
  private static readonly MAX_EXPIRY_HOURS = parseInt(process.env.SAS_MAX_EXPIRY_HOURS || '168'); // 7 days
  private static readonly MIN_EXPIRY_HOURS = parseInt(process.env.SAS_MIN_EXPIRY_HOURS || '1'); // 1 hour
  private static readonly SAS_PERMISSIONS = process.env.SAS_PERMISSIONS || 'r'; // Read-only

  /**
   * Generate Azure SAS token for a blob
   */
  private static generateAzureSASToken(
    containerName: string, 
    blobName: string, 
    expiresInHours: number
  ): string {
    const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME;
    const accountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY;

    if (!accountName || !accountKey) {
      throw new Error('Azure Storage credentials not configured');
    }

    const sharedKeyCredential = new StorageSharedKeyCredential(accountName, accountKey);
    
    const sasOptions = {
      containerName,
      blobName,
      permissions: BlobSASPermissions.parse('r'), // Read-only access
      startsOn: new Date(),
      expiresOn: new Date(new Date().valueOf() + expiresInHours * 3600 * 1000),
    };

    const sasToken = generateBlobSASQueryParameters(sasOptions, sharedKeyCredential).toString();
    return sasToken;
  }

  /**
   * Generate Azure SAS URL for a blob
   */
  private static generateAzureSASUrl(
    containerName: string, 
    blobName: string, 
    expiresInHours: number
  ): string {
    const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME;
    if (!accountName) {
      throw new Error('Azure Storage account name not configured');
    }

    const sasToken = this.generateAzureSASToken(containerName, blobName, expiresInHours);
    const blobUrl = `https://${accountName}.blob.core.windows.net/${containerName}/${blobName}`;
    return `${blobUrl}?${sasToken}`;
  }

  /**
   * Generate a secure link for a file
   */
  static async generateSecureLink(options: CreateSecureLinkOptions): Promise<SecureLinkResponse> {
    const { fileId, createdBy, expiresInHours = this.DEFAULT_EXPIRY_HOURS, maxAccessCount, useTrackingPage = false, passwordPlain, requireEmail = false, allowPreview = true, watermarkEnabled = false } = options;

    // Validate expiry time
    const validatedExpiryHours = Math.min(
      Math.max(expiresInHours, this.MIN_EXPIRY_HOURS),
      this.MAX_EXPIRY_HOURS
    );

    // Find the file and verify ownership
    const file = await FileModel.findOne({ 
      fileId, 
      uploadedBy: createdBy 
    });

    if (!file) {
      throw new Error('File not found or you do not have permission to create a link for this file');
    }

    // Check if file is already public
    if (file.isPublic) {
      throw new Error('Cannot create secure link for public files. Public files are already accessible.');
    }

    // Create expiry date
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + validatedExpiryHours);

    // Hash password if provided
    let passwordHash: string | undefined = undefined;
    if (passwordPlain && passwordPlain.trim().length > 0) {
      // Use Node's built-in scrypt for password hashing (format: salt:hash)
      const salt = randomBytes(16).toString('hex');
      const hash = scryptSync(passwordPlain, salt, 64).toString('hex');
      passwordHash = `${salt}:${hash}`;
    }

    // Create secure link
    const secureLink = await SecureLinkModel.createSecureLink({
      fileId: file.fileId,
      fileName: file.fileName,
      originalName: file.originalName,
      createdBy: new mongoose.Types.ObjectId(createdBy),
      expiresAt,
      maxAccessCount,
      isActive: true,
      accessCount: 0,
      accessHistory: [],
      passwordHash,
      requireEmail,
      allowPreview,
      watermarkEnabled
    });

    // Generate Azure SAS URL instead of local URL
    const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME || 'linksecure-files';
    const azureSasUrl = this.generateAzureSASUrl(
      containerName, 
      file.blobName || file.fileName, 
      validatedExpiryHours
    );

    // Generate final URL (either direct Azure SAS or tracking page)
    let secureUrl: string;
    // If any policies require server mediation, force tracking page
    const mustUseTracking = !!(passwordHash || requireEmail || watermarkEnabled || allowPreview === false);
    if (useTrackingPage || mustUseTracking) {
      const candidate = (process.env.PUBLIC_BASE_URL || process.env.BASE_URL || '').trim();
      const isLocal = candidate.startsWith('http://localhost') || candidate.startsWith('https://localhost') || candidate.includes('127.0.0.1');
      if (candidate && !isLocal) {
        const trackingParams = new URLSearchParams({
          url: azureSasUrl,
          name: file.originalName,
          size: file.fileSize.toString()
        });
        secureUrl = `${candidate.replace(/\/$/, '')}/api/files/azure-sas-tracker?${trackingParams.toString()}`;
      } else {
        // Fallback to direct Azure link if no public base URL configured to avoid localhost links
        secureUrl = azureSasUrl;
      }
    } else {
      secureUrl = azureSasUrl;
    }

    return {
      linkId: secureLink.linkId,
      secureToken: secureLink.secureToken,
      secureUrl,
      expiresAt: secureLink.expiresAt,
      maxAccessCount: secureLink.maxAccessCount,
      fileName: secureLink.fileName,
      originalName: secureLink.originalName
    };
  }

  /**
   * Validate and get file from secure token
   * Note: For Azure SAS URLs, this method is mainly used for tracking access
   */
  static async validateSecureLink(token: string): Promise<{ file: any; secureLink: ISecureLink }> {
    const secureLink = await SecureLinkModel.findByToken(token);

    if (!secureLink) {
      throw new Error('Invalid or expired secure link');
    }

    // Check if link is still valid
    if (!SecureLinkModel.isLinkValid(secureLink)) {
      throw new Error('Secure link has expired or reached maximum access count');
    }

    // Find the associated file
    const file = await FileModel.findOne({ fileId: secureLink.fileId });

    if (!file) {
      throw new Error('Associated file not found');
    }

    return { file, secureLink };
  }

  /**
   * Validate Azure SAS URL and get file information
   * This method extracts file information from Azure SAS URL for tracking purposes
   */
  static async validateAzureSASUrl(sasUrl: string): Promise<{ file: any; secureLink: ISecureLink | null }> {
    try {
      // Parse the SAS URL to extract container and blob name
      const url = new URL(sasUrl);
      const pathParts = url.pathname.split('/');
      const containerName = pathParts[1];
      const blobName = pathParts.slice(2).join('/');

      // Find the file by blob name
      const file = await FileModel.findOne({ 
        $or: [
          { blobName: blobName },
          { fileName: blobName },
          { filePath: blobName }
        ]
      });

      if (!file) {
        throw new Error('File not found for the provided SAS URL');
      }

      // Try to find the secure link record (optional for tracking)
      const secureLink = await SecureLinkModel.findOne({ 
        fileId: file.fileId,
        isActive: true
      });

      return { file, secureLink };
    } catch (error) {
      throw new Error('Invalid Azure SAS URL');
    }
  }

  /**
   * Record access to a secure link
   */
  static async recordAccess(
    token: string, 
    ipAddress?: string, 
    userAgent?: string, 
    accessType: 'view' | 'download' = 'view'
  ): Promise<void> {
    const secureLink = await SecureLinkModel.findByToken(token);

    if (!secureLink) {
      throw new Error('Invalid secure link');
    }

    // Update access count and history
    secureLink.accessCount += 1;
    secureLink.lastAccessedAt = new Date();
    secureLink.accessHistory.push({
      accessedAt: new Date(),
      ipAddress,
      userAgent,
      accessType
    });
    
    await secureLink.save();
  }

  /**
   * Record access to an Azure SAS URL
   */
  static async recordAzureSASAccess(
    sasUrl: string, 
    ipAddress?: string, 
    userAgent?: string, 
    accessType: 'view' | 'download' = 'view'
  ): Promise<void> {
    try {
      const { file, secureLink } = await this.validateAzureSASUrl(sasUrl);
      
      if (secureLink) {
        // Update access count and history for the secure link
        secureLink.accessCount += 1;
        secureLink.lastAccessedAt = new Date();
        secureLink.accessHistory.push({
          accessedAt: new Date(),
          ipAddress,
          userAgent,
          accessType
        });
        await secureLink.save();
      }

      // Also update file access history
      const accessRecord = {
        accessedAt: new Date(),
        accessType: accessType,
        ipAddress: ipAddress,
        userAgent: userAgent,
        userId: secureLink?.createdBy
      };

      await FileModel.updateOne(
        { fileId: file.fileId },
        { 
          $inc: { downloadCount: accessType === 'download' ? 1 : 0 },
          $set: { lastAccessedAt: new Date() },
          $push: { accessHistory: accessRecord }
        }
      );
    } catch (error) {
      console.error('Error recording Azure SAS access:', error);
      // Don't throw error to avoid breaking the user experience
    }
  }

  /**
   * Get all secure links for a user
   */
  static async getUserSecureLinks(userId: string, page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;

    const links = await SecureLinkModel.find({ createdBy: new mongoose.Types.ObjectId(userId) })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('-__v');

    const totalLinks = await SecureLinkModel.countDocuments({ createdBy: new mongoose.Types.ObjectId(userId) });

    return {
      links,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalLinks / limit),
        totalLinks,
        hasNextPage: page < Math.ceil(totalLinks / limit),
        hasPrevPage: page > 1
      }
    };
  }

  /**
   * Revoke a secure link
   */
  static async revokeSecureLink(linkId: string, userId: string): Promise<void> {
    const secureLink = await SecureLinkModel.findOne({ 
      linkId, 
      createdBy: new mongoose.Types.ObjectId(userId) 
    });

    if (!secureLink) {
      throw new Error('Secure link not found or you do not have permission to revoke it');
    }

    secureLink.isActive = false;
    await secureLink.save();
  }

  /**
   * Get secure link details
   */
  static async getSecureLinkDetails(linkId: string, userId: string) {
    const secureLink = await SecureLinkModel.findOne({ 
      linkId, 
      createdBy: new mongoose.Types.ObjectId(userId) 
    });

    if (!secureLink) {
      throw new Error('Secure link not found or you do not have permission to view it');
    }

    return secureLink;
  }

  /**
   * Clean up expired links (can be called by a cron job)
   */
  static async cleanupExpiredLinks(): Promise<number> {
    const result = await SecureLinkModel.updateMany(
      { 
        expiresAt: { $lt: new Date() },
        isActive: true 
      },
      { 
        isActive: false 
      }
    );

    return result.modifiedCount;
  }

  /**
   * Get link statistics for a user
   */
  static async getLinkStatistics(userId: string) {
    const stats = await SecureLinkModel.aggregate([
      { $match: { createdBy: new mongoose.Types.ObjectId(userId) } },
      {
        $group: {
          _id: null,
          totalLinks: { $sum: 1 },
          activeLinks: { 
            $sum: { 
              $cond: [
                { $and: [
                  { $eq: ['$isActive', true] },
                  { $gt: ['$expiresAt', new Date()] }
                ]}, 
                1, 
                0
              ] 
            }
          },
          totalAccesses: { $sum: '$accessCount' },
          expiredLinks: { 
            $sum: { 
              $cond: [
                { $lt: ['$expiresAt', new Date()] }, 
                1, 
                0
              ] 
            }
          }
        }
      }
    ]);

    const recentLinks = await SecureLinkModel.find({ createdBy: new mongoose.Types.ObjectId(userId) })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('linkId originalName expiresAt accessCount isActive createdAt');

    return {
      overview: stats[0] || {
        totalLinks: 0,
        activeLinks: 0,
        totalAccesses: 0,
        expiredLinks: 0
      },
      recentLinks
    };
  }
}

export const secureLinkService = new SecureLinkService();
