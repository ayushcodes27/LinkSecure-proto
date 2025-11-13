import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import mongoose from 'mongoose';
import FileModel from '../models/File';
import FileAccess from '../models/FileAccess';
import { fileStorageService } from '../services/fileStorage';
import { SecureLinkService } from '../services/secureLinkService';
import EmailService from '../services/emailService';
import User from '../models/User';
import {
  uploadSingle,
  uploadMultiple,
  validateFileUpload,
  handleUploadError,
  processUploadedFiles,
  saveFileMetadata
} from '../middleware/fileUpload';
import { requireAuth } from '../middleware/auth';

const router = express.Router();

// Apply authentication to all file routes
router.use(requireAuth);

// Single file upload endpoint
router.post('/upload', 
  uploadSingle,
  handleUploadError,
  validateFileUpload,
  processUploadedFiles,
  saveFileMetadata,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const savedFiles = (req as any).savedFiles;
      const file = savedFiles[0];

      res.status(201).json({
        success: true,
        message: 'File uploaded successfully',
        data: {
          fileId: file.fileId,
          originalName: file.originalName,
          fileName: file.fileName,
          fileUrl: file.fileUrl,
          mimeType: file.mimeType,
          fileSize: file.fileSize,
          uploadMethod: file.uploadMethod,
          metadata: file.metadata,
          isPublic: file.isPublic,
          uploadedAt: file.createdAt,
          downloadCount: file.downloadCount
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

// Multiple files upload endpoint
router.post('/upload-multiple',
  uploadMultiple,
  handleUploadError,
  validateFileUpload,
  processUploadedFiles,
  saveFileMetadata,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const savedFiles = (req as any).savedFiles;

      const filesData = savedFiles.map((file: any) => ({
        fileId: file.fileId,
        originalName: file.originalName,
        fileName: file.fileName,
        fileUrl: file.fileUrl,
        mimeType: file.mimeType,
        fileSize: file.fileSize,
        uploadMethod: file.uploadMethod,
        metadata: file.metadata,
        isPublic: file.isPublic,
        uploadedAt: file.createdAt,
        downloadCount: file.downloadCount
      }));

      res.status(201).json({
        success: true,
        message: `${savedFiles.length} files uploaded successfully`,
        data: {
          files: filesData,
          totalFiles: savedFiles.length,
          totalSize: filesData.reduce((sum: number, file: any) => sum + file.fileSize, 0)
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get user's files
router.get('/my-files', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userIdString = (req as any).user.id;
    const userId = new mongoose.Types.ObjectId(userIdString);
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    // Include files uploaded by the user and files shared with the user via FileAccess
    const accessibleFileIds = await FileAccess.find({ userId: userIdString, isActive: true }).distinct('fileId');

    const files = await FileModel.find({
      isDeleted: { $ne: true },
      $or: [
        { uploadedBy: userId },
        { fileId: { $in: accessibleFileIds } }
      ]
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('-__v');

    const totalFiles = await FileModel.countDocuments({
      isDeleted: { $ne: true },
      $or: [
        { uploadedBy: userId },
        { fileId: { $in: accessibleFileIds } }
      ]
    });

    res.json({
      success: true,
      data: {
        files,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalFiles / limit),
          totalFiles,
          hasNextPage: page < Math.ceil(totalFiles / limit),
          hasPrevPage: page > 1
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

// Get file by ID
router.get('/:fileId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { fileId } = req.params;
    const userId = (req as any).user.id;

    // Fetch file first
    const file = await FileModel.findOne({ fileId }).select('-__v');

    if (!file) {
      return res.status(404).json({
        success: false,
        error: 'File not found',
        message: 'The requested file does not exist'
      });
    }

    if (file.isDeleted) {
      return res.status(410).json({
        success: false,
        error: 'Gone',
        message: 'File is in trash'
      });
    }

    // Check access: owner, public, or shared via FileAccess
    const isOwner = file.uploadedBy?.toString?.() === userId;
    const isPublic = !!file.isPublic;
    let hasSharedAccess = false;

    if (!isOwner && !isPublic) {
      const access = await FileAccess.findOne({ fileId, userId, isActive: true }).select('accessLevel');
      hasSharedAccess = !!access; // view/edit/admin allowed
    }

    if (!isOwner && !isPublic && !hasSharedAccess) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'You do not have permission to view this file'
      });
    }

    // Track view analytics
    const userAgent = req.get('User-Agent') || '';
    const device = userAgent.includes('Mobile') ? 'Mobile' : 
                   userAgent.includes('Tablet') ? 'Tablet' : 'Desktop';
    const browser = userAgent.includes('Chrome') ? 'Chrome' :
                    userAgent.includes('Firefox') ? 'Firefox' :
                    userAgent.includes('Safari') ? 'Safari' :
                    userAgent.includes('Edge') ? 'Edge' : 'Other';

    await FileModel.updateOne(
      { fileId },
      {
        $inc: { viewCount: 1 },
        $set: { lastAccessedAt: new Date() },
        $push: {
          accessHistory: {
            accessedAt: new Date(),
            accessType: 'view',
            ipAddress: req.ip || req.connection.remoteAddress,
            userAgent: req.get('User-Agent'),
            userId: userId,
            device,
            browser,
            location: 'Unknown'
          }
        }
      }
    );

    res.json({
      success: true,
      data: file
    });
  } catch (error) {
    next(error);
  }
});

// Download file
router.get('/:fileId/download', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { fileId } = req.params;
    const userId = (req as any).user.id;

    // Always fetch the file by ID first
    const file = await FileModel.findOne({ fileId });

    if (!file) {
      return res.status(404).json({
        success: false,
        error: 'File not found',
        message: 'The requested file does not exist'
      });
    }

    if (file.isDeleted) {
      return res.status(410).json({
        success: false,
        error: 'Gone',
        message: 'File is in trash'
      });
    }

    // Determine access: owner, public, or shared via FileAccess (view/edit/admin)
    const isOwner = file.uploadedBy?.toString?.() === userId;
    const isPublic = !!file.isPublic;
    let hasSharedAccess = false;

    if (!isOwner && !isPublic) {
      const access = await FileAccess.findOne({ fileId, userId, isActive: true }).select('accessLevel');
      hasSharedAccess = !!access; // Any of view/edit/admin can download
    }

    if (!isOwner && !isPublic && !hasSharedAccess) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'You do not have permission to download this file'
      });
    }

    // Parse user agent for device and browser info
    const userAgent = req.get('User-Agent') || '';
    const device = userAgent.includes('Mobile') ? 'Mobile' : 
                   userAgent.includes('Tablet') ? 'Tablet' : 'Desktop';
    const browser = userAgent.includes('Chrome') ? 'Chrome' :
                    userAgent.includes('Firefox') ? 'Firefox' :
                    userAgent.includes('Safari') ? 'Safari' :
                    userAgent.includes('Edge') ? 'Edge' : 'Other';

    // Track download history on File document
    const downloadRecord = {
      downloadedAt: new Date(),
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      userId: userId
    };

    const accessRecord = {
      accessedAt: new Date(),
      accessType: 'download' as const,
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      userId: userId,
      device,
      browser,
      location: 'Unknown' // Can be enhanced with IP geolocation service
    };

    await FileModel.updateOne(
      { fileId },
      {
        $inc: { downloadCount: 1 },
        $set: { lastAccessedAt: new Date() },
        $push: {
          downloadHistory: downloadRecord,
          accessHistory: accessRecord
        }
      }
    );

    // Also record access on FileAccess if it's a shared download
    if (!isOwner && !isPublic && hasSharedAccess) {
      await FileAccess.updateOne(
        { fileId, userId, isActive: true },
        {
          $set: { lastAccessedAt: new Date() },
          $push: {
            accessHistory: {
              accessedAt: new Date(),
              accessType: 'download',
              ipAddress: req.ip || req.connection.remoteAddress,
              userAgent: req.get('User-Agent')
            }
          }
        }
      );
    }

    // Set appropriate headers
    res.setHeader('Content-Type', file.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${file.originalName}"`);
    res.setHeader('Content-Length', file.fileSize);

    // Stream the file
    const fileBuffer = await fileStorageService.getFile(file.filePath);
    res.send(fileBuffer);

    // Optional notification to owner (fire-and-forget)
    Promise.resolve().then(async () => {
      try {
        const owner = await User.findById(file.uploadedBy).select('email firstName lastName');
        const downloader = await User.findById(userId).select('firstName lastName');
        if (owner?.email && owner.email !== (downloader as any)?.email) {
          await EmailService.sendDownloadNotification({
            to: owner.email,
            fileName: file.originalName,
            downloaderName: downloader ? `${downloader.firstName} ${downloader.lastName}` : undefined,
            downloadedAt: new Date(),
          });
        }
      } catch (e) {
        console.error('Download notification email error:', e);
      }
    });
  } catch (error) {
    next(error);
  }
});

// Update file metadata
router.put('/:fileId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { fileId } = req.params;
    const userId = (req as any).user.id;
    const { description, tags, category, isPublic } = req.body;

    const file = await FileModel.findOne({ fileId });

    if (!file) {
      return res.status(404).json({
        success: false,
        error: 'File not found',
        message: 'The requested file does not exist'
      });
    }

    // Owner or shared with edit/admin can modify metadata
    const isOwner = file.uploadedBy?.toString?.() === userId;
    let hasEditOrAdmin = false;
    if (!isOwner) {
      const access = await FileAccess.findOne({ fileId, userId, isActive: true }).select('accessLevel');
      hasEditOrAdmin = !!access && (access.accessLevel === 'edit' || access.accessLevel === 'admin');
    }

    if (!isOwner && !hasEditOrAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'You do not have permission to modify this file'
      });
    }

    const updateData: any = {};
    if (description !== undefined) updateData['metadata.description'] = description;
    if (tags !== undefined) updateData['metadata.tags'] = Array.isArray(tags) ? tags : tags.split(',').map((tag: string) => tag.trim());
    if (category !== undefined) updateData['metadata.category'] = category;
    if (isPublic !== undefined) updateData.isPublic = isPublic;

    const updatedFile = await FileModel.findOneAndUpdate(
      { fileId },
      updateData,
      { new: true, runValidators: true }
    ).select('-__v');

    res.json({
      success: true,
      message: 'File metadata updated successfully',
      data: updatedFile
    });
  } catch (error) {
    next(error);
  }
});

// Delete file
router.delete('/:fileId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { fileId } = req.params;
    const userId = (req as any).user.id;

    const file = await FileModel.findOne({ fileId });

    if (!file) {
      return res.status(404).json({
        success: false,
        error: 'File not found',
        message: 'The requested file does not exist'
      });
    }

    // Owner or shared admin can delete
    const isOwner = file.uploadedBy?.toString?.() === userId;
    let hasAdmin = false;
    if (!isOwner) {
      const access = await FileAccess.findOne({ fileId, userId, isActive: true }).select('accessLevel');
      hasAdmin = !!access && access.accessLevel === 'admin';
    }

    if (!isOwner && !hasAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'You do not have permission to delete this file'
      });
    }

    // Soft delete: mark as deleted and record metadata
    file.isDeleted = true;
    file.deletedAt = new Date();
    file.deletedBy = (req as any).user.id;
    await file.save();

    res.json({
      success: true,
      message: 'File moved to trash',
      data: {
        fileId: file.fileId,
        originalName: file.originalName,
        deletedAt: file.deletedAt
      }
    });
  } catch (error) {
    next(error);
  }
});

// Get files in trash
router.get('/trash/list', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user.id;
    const files = await FileModel.find({ uploadedBy: userId, isDeleted: true })
      .sort({ deletedAt: -1 })
      .select('-__v');
    res.json({ success: true, data: { files } });
  } catch (error) {
    next(error);
  }
});

// Restore a file from trash
router.post('/:fileId/restore', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { fileId } = req.params;
    const userId = (req as any).user.id;
    const file = await FileModel.findOne({ fileId });
    if (!file) {
      return res.status(404).json({ success: false, error: 'File not found' });
    }
    const isOwner = file.uploadedBy?.toString?.() === userId;
    if (!isOwner) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }
    file.isDeleted = false;
    file.deletedAt = undefined;
    file.deletedBy = undefined as any;
    await file.save();
    res.json({ success: true, message: 'File restored', data: { fileId: file.fileId } });
  } catch (error) {
    next(error);
  }
});

// Permanently delete a file
router.delete('/:fileId/permanent', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { fileId } = req.params;
    const userId = (req as any).user.id;
    const file = await FileModel.findOne({ fileId });
    if (!file) {
      return res.status(404).json({ success: false, error: 'File not found' });
    }
    const isOwner = file.uploadedBy?.toString?.() === userId;
    if (!isOwner) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }
    // Delete file from storage
    await fileStorageService.deleteFile(file.filePath);
    // Delete file record
    await FileModel.deleteOne({ fileId });
    res.json({ success: true, message: 'File permanently deleted' });
  } catch (error) {
    next(error);
  }
});

// Get file statistics
router.get('/stats/overview', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user.id;

    const stats = await FileModel.aggregate([
      { $match: { uploadedBy: userId } },
      {
        $group: {
          _id: null,
          totalFiles: { $sum: 1 },
          totalSize: { $sum: '$fileSize' },
          totalDownloads: { $sum: '$downloadCount' },
          avgFileSize: { $avg: '$fileSize' }
        }
      }
    ]);

    const fileTypeStats = await FileModel.aggregate([
      { $match: { uploadedBy: userId } },
      {
        $group: {
          _id: '$mimeType',
          count: { $sum: 1 },
          totalSize: { $sum: '$fileSize' }
        }
      },
      { $sort: { count: -1 } }
    ]);

    const uploadMethodStats = await FileModel.aggregate([
      { $match: { uploadedBy: userId } },
      {
        $group: {
          _id: '$uploadMethod',
          count: { $sum: 1 }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        overview: stats[0] || {
          totalFiles: 0,
          totalSize: 0,
          totalDownloads: 0,
          avgFileSize: 0
        },
        fileTypes: fileTypeStats,
        uploadMethods: uploadMethodStats
      }
    });
  } catch (error) {
    next(error);
  }
});

// Comprehensive analytics endpoint
router.get('/analytics/dashboard', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userIdString = (req as any).user.id;
    const { timeRange = '30', fileId, startDate: customStartDate, endDate: customEndDate } = req.query;
    
    // Convert userId to ObjectId for MongoDB queries
    const userId = new mongoose.Types.ObjectId(userIdString);

    // Determine date range
    let startDate: Date;
    let endDate: Date = new Date();

    if (customStartDate && customEndDate) {
      // Custom date range
      startDate = new Date(customStartDate as string);
      endDate = new Date(customEndDate as string);
    } else {
      // Predefined time range
      const days = parseInt(timeRange as string);
      startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
    }

    // Build base match query
    const baseMatch: any = { 
      uploadedBy: userId, 
      isDeleted: false 
    };

    // If specific file is selected, filter by fileId
    if (fileId && fileId !== 'all') {
      baseMatch.fileId = fileId;
    }

    console.log('Analytics request:', { 
      userId: userIdString, 
      timeRange, 
      fileId, 
      startDate, 
      endDate,
      hasCustomRange: !!(customStartDate && customEndDate)
    });

    // Total stats
    const totalStats = await FileModel.aggregate([
      { $match: baseMatch },
      {
        $group: {
          _id: null,
          totalFiles: { $sum: 1 },
          totalStorageUsed: { $sum: '$fileSize' },
          totalDownloads: { $sum: '$downloadCount' },
          totalViews: { $sum: '$viewCount' },
          totalShares: { $sum: '$shareCount' }
        }
      }
    ]);

    // File type breakdown for pie chart
    const fileTypeBreakdown = await FileModel.aggregate([
      { $match: baseMatch },
      {
        $group: {
          _id: '$mimeType',
          count: { $sum: 1 },
          size: { $sum: '$fileSize' }
        }
      },
      { $sort: { size: -1 } },
      { $limit: 10 }
    ]);

    // Upload trend (with date filtering)
    const uploadTrend = await FileModel.aggregate([
      { 
        $match: { 
          ...baseMatch,
          createdAt: { $gte: startDate, $lte: endDate }
        } 
      },
      {
        $group: {
          _id: { 
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
          },
          count: { $sum: 1 },
          size: { $sum: '$fileSize' }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Download trend from access history
    const downloadTrend = await FileModel.aggregate([
      { $match: baseMatch },
      { $unwind: '$accessHistory' },
      { 
        $match: { 
          'accessHistory.accessType': 'download',
          'accessHistory.accessedAt': { $gte: startDate, $lte: endDate }
        } 
      },
      {
        $group: {
          _id: { 
            $dateToString: { format: '%Y-%m-%d', date: '$accessHistory.accessedAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Top downloaded files
    const topDownloadedFiles = await FileModel.find(baseMatch)
      .sort({ downloadCount: -1 })
      .limit(10)
      .select('fileId originalName fileName downloadCount mimeType fileSize');

    // Top shared files
    const topSharedFiles = await FileModel.find(baseMatch)
      .sort({ shareCount: -1 })
      .limit(10)
      .select('fileId originalName fileName shareCount mimeType fileSize');

    // Recent activity
    const recentActivity = await FileModel.aggregate([
      { $match: baseMatch },
      { $unwind: '$accessHistory' },
      { 
        $match: { 
          'accessHistory.accessedAt': { $gte: startDate, $lte: endDate }
        } 
      },
      { $sort: { 'accessHistory.accessedAt': -1 } },
      { $limit: 20 },
      {
        $project: {
          fileId: 1,
          originalName: 1,
          fileName: 1,
          mimeType: 1,
          accessType: '$accessHistory.accessType',
          accessedAt: '$accessHistory.accessedAt',
          ipAddress: '$accessHistory.ipAddress',
          device: '$accessHistory.device',
          browser: '$accessHistory.browser'
        }
      }
    ]);

    // Storage usage over time
    const storageUsageOverTime = await FileModel.aggregate([
      { 
        $match: { 
          ...baseMatch,
          createdAt: { $gte: startDate, $lte: endDate }
        } 
      },
      {
        $group: {
          _id: { 
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
          },
          cumulativeSize: { $sum: '$fileSize' }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Access by device
    const accessByDevice = await FileModel.aggregate([
      { $match: baseMatch },
      { $unwind: '$accessHistory' },
      { 
        $match: { 
          'accessHistory.accessedAt': { $gte: startDate, $lte: endDate }
        } 
      },
      {
        $group: {
          _id: '$accessHistory.device',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // Access by browser
    const accessByBrowser = await FileModel.aggregate([
      { $match: baseMatch },
      { $unwind: '$accessHistory' },
      { 
        $match: { 
          'accessHistory.accessedAt': { $gte: startDate, $lte: endDate }
        } 
      },
      {
        $group: {
          _id: '$accessHistory.browser',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    res.json({
      success: true,
      data: {
        totalFiles: totalStats[0]?.totalFiles || 0,
        totalStorageUsed: totalStats[0]?.totalStorageUsed || 0,
        totalDownloads: totalStats[0]?.totalDownloads || 0,
        totalViews: totalStats[0]?.totalViews || 0,
        totalShares: totalStats[0]?.totalShares || 0,
        fileTypeBreakdown,
        uploadTrend,
        downloadTrend,
        topDownloadedFiles,
        topSharedFiles,
        recentActivity,
        storageUsageOverTime,
        accessByDevice,
        accessByBrowser
      }
    });
  } catch (error) {
    next(error);
  }
});

// Per-file analytics endpoint
router.get('/:fileId/analytics', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userIdString = (req as any).user.id;
    const userId = new mongoose.Types.ObjectId(userIdString);
    const { fileId } = req.params;

    const file = await FileModel.findOne({ fileId, uploadedBy: userId, isDeleted: false });

    if (!file) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }

    // Unique viewers
    const uniqueViewers = new Set(
      file.accessHistory
        .filter(a => a.userId)
        .map(a => a.userId?.toString())
    ).size;

    // Access timeline (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const accessTimeline = file.accessHistory
      .filter(a => a.accessedAt >= thirtyDaysAgo)
      .reduce((acc: any, access) => {
        const date = access.accessedAt.toISOString().split('T')[0];
        if (!acc[date]) {
          acc[date] = { views: 0, downloads: 0, shares: 0 };
        }
        acc[date][`${access.accessType}s`] = (acc[date][`${access.accessType}s`] || 0) + 1;
        return acc;
      }, {});

    // Device breakdown
    const deviceBreakdown = file.accessHistory.reduce((acc: any, access) => {
      const device = access.device || 'Unknown';
      acc[device] = (acc[device] || 0) + 1;
      return acc;
    }, {});

    // Browser breakdown
    const browserBreakdown = file.accessHistory.reduce((acc: any, access) => {
      const browser = access.browser || 'Unknown';
      acc[browser] = (acc[browser] || 0) + 1;
      return acc;
    }, {});

    // Location breakdown
    const locationBreakdown = file.accessHistory.reduce((acc: any, access) => {
      const location = access.location || 'Unknown';
      acc[location] = (acc[location] || 0) + 1;
      return acc;
    }, {});

    // Recent viewers
    const recentViewers = await FileModel.aggregate([
      { $match: { fileId } },
      { $unwind: '$accessHistory' },
      { 
        $match: { 
          'accessHistory.userId': { $ne: null }
        } 
      },
      { $sort: { 'accessHistory.accessedAt': -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'users',
          localField: 'accessHistory.userId',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: '$user' },
      {
        $project: {
          accessedAt: '$accessHistory.accessedAt',
          accessType: '$accessHistory.accessType',
          userName: '$user.name',
          userEmail: '$user.email',
          device: '$accessHistory.device',
          browser: '$accessHistory.browser'
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        fileId: file.fileId,
        originalName: file.originalName,
        totalViews: file.viewCount || 0,
        totalDownloads: file.downloadCount || 0,
        totalShares: file.shareCount || 0,
        uniqueViewers,
        accessTimeline: Object.entries(accessTimeline).map(([date, stats]) => ({
          date,
          ...(stats as object)
        })),
        deviceBreakdown: Object.entries(deviceBreakdown).map(([device, count]) => ({
          device,
          count
        })),
        browserBreakdown: Object.entries(browserBreakdown).map(([browser, count]) => ({
          browser,
          count
        })),
        locationBreakdown: Object.entries(locationBreakdown).map(([location, count]) => ({
          location,
          count
        })),
        recentViewers
      }
    });
  } catch (error) {
    next(error);
  }
});

// Get file access history
router.get('/:fileId/history', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { fileId } = req.params;
    const userId = (req as any).user.id;

    // Fetch file first
    const file = await FileModel.findOne({ fileId }).populate('accessHistory.userId downloadHistory.userId', 'firstName lastName email');

    if (!file) {
      return res.status(404).json({
        success: false,
        error: 'File not found',
        message: 'The requested file does not exist'
      });
    }

    // Check access: owner, public, or shared via FileAccess
    const isOwner = file.uploadedBy?.toString?.() === userId;
    const isPublic = !!file.isPublic;
    let hasSharedAccess = false;

    if (!isOwner && !isPublic) {
      const access = await FileAccess.findOne({ fileId, userId, isActive: true }).select('accessLevel');
      hasSharedAccess = !!access; // view/edit/admin allowed
    }

    if (!isOwner && !isPublic && !hasSharedAccess) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'You do not have permission to view this file history'
      });
    }

    res.json({
      success: true,
      data: {
        fileId: file.fileId,
        originalName: file.originalName,
        accessHistory: file.accessHistory.sort((a, b) => new Date(b.accessedAt).getTime() - new Date(a.accessedAt).getTime()),
        downloadHistory: file.downloadHistory.sort((a, b) => new Date(b.downloadedAt).getTime() - new Date(a.downloadedAt).getTime()),
        totalDownloads: file.downloadCount,
        lastAccessedAt: file.lastAccessedAt
      }
    });
  } catch (error) {
    next(error);
  }
});

// Get user's file access history
router.get('/history/my-activity', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const files = await FileModel.find({ 
      $or: [
        { uploadedBy: userId },
        { 'accessHistory.userId': userId }
      ]
    })
    .select('fileId originalName mimeType fileSize accessHistory downloadHistory createdAt')
    .sort({ 'accessHistory.accessedAt': -1 })
    .skip(skip)
    .limit(limit);

    const totalFiles = await FileModel.countDocuments({ 
      $or: [
        { uploadedBy: userId },
        { 'accessHistory.userId': userId }
      ]
    });

    // Create activity timeline
    const activityTimeline = [];
    for (const file of files) {
      // Add access history
      for (const access of file.accessHistory) {
        if (access.userId?.toString() === userId) {
          activityTimeline.push({
            type: access.accessType,
            fileId: file.fileId,
            fileName: file.originalName,
            timestamp: access.accessedAt,
            mimeType: file.mimeType,
            fileSize: file.fileSize
          });
        }
      }
      
      // Add download history
      for (const download of file.downloadHistory) {
        if (download.userId?.toString() === userId) {
          activityTimeline.push({
            type: 'download',
            fileId: file.fileId,
            fileName: file.originalName,
            timestamp: download.downloadedAt,
            mimeType: file.mimeType,
            fileSize: file.fileSize
          });
        }
      }
    }

    // Sort by timestamp (most recent first)
    activityTimeline.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    res.json({
      success: true,
      data: {
        activities: activityTimeline.slice(skip, skip + limit),
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(activityTimeline.length / limit),
          totalActivities: activityTimeline.length,
          hasNextPage: page < Math.ceil(activityTimeline.length / limit),
          hasPrevPage: page > 1
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

// Sync files from Azure storage
router.post('/sync/azure', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user.id;
    
    // Check if Azure storage is configured
    if (process.env.STORAGE_TYPE !== 'azure') {
      return res.json({
        success: false,
        message: 'Azure storage is not configured. Current storage type is: ' + (process.env.STORAGE_TYPE || 'local'),
        data: {
          syncedFiles: 0,
          newFiles: 0,
          errors: ['Azure storage not configured']
        }
      });
    }

    let syncedFiles = 0;
    let newFiles = 0;
    let errors: string[] = [];

    try {
      // List all blobs in Azure storage
      const azureBlobs = await fileStorageService.listAzureBlobs();
      
      for (const blob of azureBlobs) {
        try {
          // Check if file already exists in database
          const existingFile = await FileModel.findOne({ 
            $or: [
              { fileName: blob.name },
              { blobName: blob.name },
              { filePath: blob.name }
            ]
          });

          if (!existingFile && blob.metadata) {
            // Create new file record from Azure blob metadata
            const fileData = {
              fileId: blob.metadata.fileId || require('crypto').randomUUID(),
              originalName: blob.metadata.originalName || blob.name,
              fileName: blob.name,
              blobName: blob.name,
              filePath: blob.name,
              fileUrl: fileStorageService.getFileUrl(blob.name),
              mimeType: blob.metadata.mimeType || 'application/octet-stream',
              fileSize: blob.size,
              uploadedBy: userId,
              uploadMethod: (blob.metadata.uploadMethod as 'drag-drop' | 'choose-files' | 'upload-button') || 'upload-button',
              isPublic: false,
              downloadCount: 0,
              accessHistory: [],
              downloadHistory: []
            };

            await FileModel.createFile(fileData);
            newFiles++;
          } else if (existingFile) {
            // Update existing file metadata if needed
            let updated = false;
            
            if (existingFile.fileSize !== blob.size) {
              existingFile.fileSize = blob.size;
              updated = true;
            }
            
            if (updated) {
              await existingFile.save();
              syncedFiles++;
            }
          }
        } catch (fileError) {
          console.error('Error processing blob:', blob.name, fileError);
          errors.push(`Error processing ${blob.name}: ${fileError instanceof Error ? fileError.message : 'Unknown error'}`);
        }
      }

      res.json({
        success: true,
        message: `Azure sync completed. Found ${azureBlobs.length} blobs in storage.`,
        data: {
          syncedFiles,
          newFiles,
          totalBlobsInAzure: azureBlobs.length,
          errors
        }
      });
    } catch (storageError) {
      console.error('Azure storage error:', storageError);
      res.json({
        success: false,
        message: 'Failed to sync with Azure storage',
        data: {
          syncedFiles: 0,
          newFiles: 0,
          errors: [storageError instanceof Error ? storageError.message : 'Unknown storage error']
        }
      });
    }
  } catch (error) {
    next(error);
  }
});

// ==================== SECURE LINK ENDPOINTS ====================

// Generate secure link for a file
router.post('/:fileId/generate-link', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { fileId } = req.params;
    const userId = (req as any).user.id;
    const { expiresInHours, maxAccessCount, useTrackingPage, password, requireEmail, allowPreview, watermarkEnabled } = req.body;

    const secureLink = await SecureLinkService.generateSecureLink({
      fileId,
      createdBy: userId,
      expiresInHours: expiresInHours ? parseInt(expiresInHours) : undefined,
      maxAccessCount: maxAccessCount ? parseInt(maxAccessCount) : undefined,
      useTrackingPage: useTrackingPage || false,
      passwordPlain: password,
      requireEmail,
      allowPreview,
      watermarkEnabled
    });

    res.status(201).json({
      success: true,
      message: 'Secure link generated successfully',
      data: secureLink
    });
  } catch (error) {
    next(error);
  }
});

// Get all secure links for a user
router.get('/secure-links', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    const result = await SecureLinkService.getUserSecureLinks(userId, page, limit);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
});

// Get secure link details
router.get('/secure-links/:linkId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { linkId } = req.params;
    const userId = (req as any).user.id;

    const secureLink = await SecureLinkService.getSecureLinkDetails(linkId, userId);

    res.json({
      success: true,
      data: secureLink
    });
  } catch (error) {
    next(error);
  }
});

// Revoke a secure link
router.delete('/secure-links/:linkId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { linkId } = req.params;
    const userId = (req as any).user.id;

    await SecureLinkService.revokeSecureLink(linkId, userId);

    res.json({
      success: true,
      message: 'Secure link revoked successfully'
    });
  } catch (error) {
    next(error);
  }
});

// Get secure link statistics
router.get('/secure-links/stats/overview', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user.id;

    const stats = await SecureLinkService.getLinkStatistics(userId);

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    next(error);
  }
});

// Track Azure SAS URL access (no authentication required)
router.post('/track-sas-access', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { sasUrl, accessType = 'view' } = req.body;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');

    if (!sasUrl) {
      return res.status(400).json({
        success: false,
        error: 'SAS URL is required'
      });
    }

    await SecureLinkService.recordAzureSASAccess(sasUrl, ipAddress, userAgent, accessType);

    res.json({
      success: true,
      message: 'Access recorded successfully'
    });
  } catch (error) {
    // Don't expose internal errors to client
    console.error('Error tracking SAS access:', error);
    res.json({
      success: true,
      message: 'Access recorded successfully'
    });
  }
});

// Serve Azure SAS tracker page
router.get('/azure-sas-tracker', (req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, '../public/azure-sas-tracker.html'));
});

export default router;
