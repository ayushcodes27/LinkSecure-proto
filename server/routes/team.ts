import express, { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import User from '../models/User';
import EmailService from '../services/emailService';
import FileAccess from '../models/FileAccess';
import FileModel from '../models/File';
import AccessRequest from '../models/AccessRequest'; // Assuming this model is created
import { requireAuth } from '../middleware/auth';

const router = express.Router();

// Apply authentication to all team routes
router.use(requireAuth);

// POST /api/team/add-user - Add a user by email and assign access level
router.post('/add-user', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, accessLevel, fileId } = req.body as {
      email?: string;
      accessLevel?: 'view' | 'edit' | 'admin';
      fileId?: string;
    };

    const userId = (req as any).user.id;

    if (!email || !accessLevel || !fileId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'Email, access level, and file ID are required'
      });
    }

    // Validate access level
    if (!['view', 'edit', 'admin'].includes(accessLevel)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid access level',
        message: 'Access level must be view, edit, or admin'
      });
    }

    // Check if the file exists and user has permission to share it
    const file = await FileModel.findOne({
      fileId,
      $or: [
        { uploadedBy: userId },
        {
          _id: {
            $in: await FileAccess.find({ userId, fileId, accessLevel: 'admin', isActive: true }).distinct('_id')
          }
        }
      ]
    });

    if (!file) {
      return res.status(404).json({
        success: false,
        error: 'File not found',
        message: 'File does not exist or you do not have permission to share it'
      });
    }

    // Check if the target user exists
    const targetUser = await User.findOne({ email: email.toLowerCase() });
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
        message: 'No registered user found with this email address'
      });
    }

    // Prevent self-sharing
    if (targetUser._id.toString() === userId) {
      return res.status(400).json({
        success: false,
        error: 'Invalid operation',
        message: 'You cannot grant access to yourself'
      });
    }

    // Check if access already exists
    const existingAccess = await FileAccess.findOne({
      fileId,
      userId: targetUser._id,
      isActive: true
    });

    if (existingAccess) {
      // Update existing access level
      existingAccess.accessLevel = accessLevel;
      existingAccess.grantedBy = new mongoose.Types.ObjectId(userId);
      existingAccess.grantedAt = new Date();
      await existingAccess.save();

      // Notify target user about updated access
      Promise.resolve().then(async () => {
        try {
          const owner = await User.findById(userId).select('firstName lastName email');
          await EmailService.sendAccessGrantedNotification({
            to: targetUser.email,
            grantedByName: owner ? `${owner.firstName} ${owner.lastName}` : undefined,
            fileName: file.originalName,
            accessLevel,
          });
        } catch (e) {
          console.error('Access update email error:', e);
        }
      });

      return res.json({
        success: true,
        message: 'Access level updated successfully',
        data: {
          userId: targetUser._id,
          email: targetUser.email,
          firstName: targetUser.firstName,
          lastName: targetUser.lastName,
          accessLevel,
          grantedAt: existingAccess.grantedAt
        }
      });
    }

    // Create new access record
    const fileAccess = await FileAccess.create({
      fileId,
      userId: targetUser._id,
      grantedBy: new mongoose.Types.ObjectId(userId),
      accessLevel,
      isActive: true
    });

    // Track share in file analytics
    await FileModel.updateOne(
      { fileId },
      {
        $inc: { shareCount: 1 },
        $push: {
          accessHistory: {
            accessedAt: new Date(),
            accessType: 'share',
            ipAddress: (req as any).ip || (req as any).connection.remoteAddress,
            userAgent: req.get('User-Agent'),
            userId: targetUser._id,
            device: 'Unknown',
            browser: 'Unknown',
            location: 'Unknown'
          }
        }
      }
    );

    // Notify target user about new share
    Promise.resolve().then(async () => {
      try {
        const owner = await User.findById(userId).select('firstName lastName email');
        await EmailService.sendFileSharedNotification({
          to: targetUser.email,
          ownerName: owner ? `${owner.firstName} ${owner.lastName}` : undefined,
          fileName: file.originalName,
          accessLevel,
        });
      } catch (e) {
        console.error('Share email error:', e);
      }
    });

    res.status(201).json({
      success: true,
      message: 'User access granted successfully',
      data: {
        userId: targetUser._id,
        email: targetUser.email,
        firstName: targetUser.firstName,
        lastName: targetUser.lastName,
        accessLevel,
        grantedAt: fileAccess.grantedAt
      }
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/team/members - Retrieve all current team members with permissions for a file
router.get('/members', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { fileId } = req.query as { fileId?: string };
    const userId = (req as any).user.id;

    if (!fileId) {
      return res.status(400).json({
        success: false,
        error: 'Missing file ID',
        message: 'File ID is required'
      });
    }

    // Check if user has access to view team members for this file
    const file = await FileModel.findOne({
      fileId,
      $or: [
        { uploadedBy: userId },
        {
          _id: {
            $in: await FileAccess.find({ userId, fileId, isActive: true }).distinct('_id')
          }
        }
      ]
    });

    if (!file) {
      return res.status(404).json({
        success: false,
        error: 'File not found',
        message: 'File does not exist or you do not have permission to view its team members'
      });
    }

    // Get all active access records for this file
    const accessRecords = await FileAccess.find({
      fileId,
      isActive: true
    }).populate('userId', 'firstName lastName email').populate('grantedBy', 'firstName lastName email');

    // Include the file owner as admin
    const ownerAccess = {
      userId: {
        _id: file.uploadedBy,
        firstName: 'Owner', // This would be populated from User model in real implementation
        lastName: '',
        email: 'owner@example.com' // This would be populated from User model
      },
      grantedBy: null,
      accessLevel: 'admin' as const,
      grantedAt: file.createdAt,
      lastAccessedAt: file.lastAccessedAt,
      isActive: true,
      accessHistory: file.accessHistory
    };

    // Get all pending access requests for this file
    const requestRecords = await AccessRequest.find({
      fileId,
      status: 'pending'
    }).populate('userId', 'firstName lastName email');

    const members = accessRecords.map(record => ({
      userId: record.userId._id,
      firstName: (record.userId as any).firstName,
      lastName: (record.userId as any).lastName,
      email: (record.userId as any).email,
      accessLevel: record.accessLevel,
      grantedBy: record.grantedBy ? {
        _id: record.grantedBy._id,
        firstName: (record.grantedBy as any).firstName,
        lastName: (record.grantedBy as any).lastName,
        email: (record.grantedBy as any).email
      } : null,
      grantedAt: record.grantedAt,
      lastAccessedAt: record.lastAccessedAt,
      accessHistory: record.accessHistory
    }));

    // Add owner to the list if not already included
    const ownerExists = members.some(member => member.userId.toString() === file.uploadedBy.toString());
    if (!ownerExists) {
      // Get owner details
      const owner = await User.findById(file.uploadedBy).select('firstName lastName email');
      if (owner) {
        members.unshift({
          userId: owner._id as any,
          firstName: owner.firstName,
          lastName: owner.lastName,
          email: owner.email,
          accessLevel: 'admin',
          grantedBy: null as any,
          grantedAt: file.createdAt,
          lastAccessedAt: file.lastAccessedAt,
          accessHistory: file.accessHistory
        });
      }
    }

    res.json({
      success: true,
      data: {
        fileId,
        fileName: file.originalName,
        members,
        totalMembers: members.length,
        requests: requestRecords.map(req => ({
          requestId: req._id,
          userId: (req.userId as any)._id,
          firstName: (req.userId as any).firstName,
          lastName: (req.userId as any).lastName,
          email: (req.userId as any).email,
        }))
      }
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/file/access - Validate user access when file is opened
router.post('/file/access', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { fileId } = req.body as { fileId?: string };
    const userId = (req as any).user.id;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');

    if (!fileId) {
      return res.status(400).json({
        success: false,
        error: 'Missing file ID',
        message: 'File ID is required'
      });
    }

    // Check if file exists
    const file = await FileModel.findOne({ fileId });
    if (!file) {
      return res.status(404).json({
        success: false,
        error: 'File not found',
        message: 'The requested file does not exist'
      });
    }

    // Check if user is the owner
    if (file.uploadedBy.toString() === userId) {
      // Record access for owner
      await FileModel.updateOne(
        { fileId },
        {
          $set: { lastAccessedAt: new Date() },
          $push: {
            accessHistory: {
              accessedAt: new Date(),
              accessType: 'view',
              ipAddress,
              userAgent,
              userId: new mongoose.Types.ObjectId(userId)
            }
          }
        }
      );

      return res.json({
        success: true,
        message: 'Access granted',
        data: {
          accessLevel: 'admin',
          file: {
            fileId: file.fileId,
            originalName: file.originalName,
            fileSize: file.fileSize,
            mimeType: file.mimeType,
            uploadedAt: file.createdAt
          }
        }
      });
    }

    // Check if user has granted access
    const accessRecord = await FileAccess.findOne({
      fileId,
      userId,
      isActive: true
    });

    if (!accessRecord) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        message: 'You do not have permission to access this file'
      });
    }

    // Record access
    accessRecord.lastAccessedAt = new Date();
    accessRecord.accessHistory.push({
      accessedAt: new Date(),
      accessType: 'view',
      ipAddress,
      userAgent
    });
    await accessRecord.save();

    // Also update file's general access history
    await FileModel.updateOne(
      { fileId },
      {
        $set: { lastAccessedAt: new Date() },
        $push: {
          accessHistory: {
            accessedAt: new Date(),
            accessType: 'view',
            ipAddress,
            userAgent,
            userId: new mongoose.Types.ObjectId(userId)
          }
        }
      }
    );

    res.json({
      success: true,
      message: 'Access granted',
      data: {
        accessLevel: accessRecord.accessLevel,
        file: {
          fileId: file.fileId,
          originalName: file.originalName,
          fileSize: file.fileSize,
          mimeType: file.mimeType,
          uploadedAt: file.createdAt
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/team/update-access - Update user access level
router.put('/update-access', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { fileId, userId: targetUserId, accessLevel } = req.body as {
      fileId?: string;
      userId?: string;
      accessLevel?: 'view' | 'edit' | 'admin';
    };

    const currentUserId = (req as any).user.id;

    if (!fileId || !targetUserId || !accessLevel) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'File ID, user ID, and access level are required'
      });
    }

    // Validate access level
    if (!['view', 'edit', 'admin'].includes(accessLevel)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid access level',
        message: 'Access level must be view, edit, or admin'
      });
    }

    // Check if current user has permission to modify access (must be owner or admin)
    const file = await FileModel.findOne({ fileId });
    if (!file) {
      return res.status(404).json({
        success: false,
        error: 'File not found',
        message: 'File does not exist'
      });
    }

    const isOwner = file.uploadedBy.toString() === currentUserId;
    const hasAdminAccess = await FileAccess.findOne({
      fileId,
      userId: currentUserId,
      accessLevel: 'admin',
      isActive: true
    });

    if (!isOwner && !hasAdminAccess) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions',
        message: 'You do not have permission to modify access levels'
      });
    }

    // Find and update the access record
    const accessRecord = await FileAccess.findOne({
      fileId,
      userId: targetUserId,
      isActive: true
    });

    if (!accessRecord) {
      return res.status(404).json({
        success: false,
        error: 'Access record not found',
        message: 'The specified user does not have access to this file'
      });
    }

    accessRecord.accessLevel = accessLevel;
    accessRecord.grantedBy = new mongoose.Types.ObjectId(currentUserId);
    accessRecord.grantedAt = new Date();
    await accessRecord.save();

    // Notify target user about updated access level
    Promise.resolve().then(async () => {
      try {
        const targetUser = await User.findById(targetUserId).select('email firstName lastName');
        const actor = await User.findById(currentUserId).select('firstName lastName');
        if (targetUser) {
          await EmailService.sendAccessGrantedNotification({
            to: targetUser.email,
            grantedByName: actor ? `${actor.firstName} ${actor.lastName}` : undefined,
            fileName: file.originalName,
            accessLevel: accessLevel!,
          });
        }
      } catch (e) {
        console.error('Access update email error:', e);
      }
    });

    res.json({
      success: true,
      message: 'Access level updated successfully',
      data: {
        fileId,
        userId: targetUserId,
        accessLevel,
        updatedAt: accessRecord.grantedAt
      }
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/team/remove-access - Remove user access
router.delete('/remove-access', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { fileId, userId: targetUserId } = req.query as {
      fileId?: string;
      userId?: string;
    };

    const currentUserId = (req as any).user.id;

    if (!fileId || !targetUserId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'File ID and user ID are required'
      });
    }

    // Check if current user has permission to remove access
    const file = await FileModel.findOne({ fileId });
    if (!file) {
      return res.status(404).json({
        success: false,
        error: 'File not found',
        message: 'File does not exist'
      });
    }

    const isOwner = file.uploadedBy.toString() === currentUserId;
    const hasAdminAccess = await FileAccess.findOne({
      fileId,
      userId: currentUserId,
      accessLevel: 'admin',
      isActive: true
    });

    if (!isOwner && !hasAdminAccess) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions',
        message: 'You do not have permission to remove access'
      });
    }

    // Cannot remove access from owner
    if (file.uploadedBy.toString() === targetUserId) {
      return res.status(400).json({
        success: false,
        error: 'Invalid operation',
        message: 'Cannot remove access from the file owner'
      });
    }

    // Soft delete the access record
    const result = await FileAccess.updateOne(
      { fileId, userId: targetUserId, isActive: true },
      { isActive: false }
    );

    if (result.modifiedCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'Access record not found',
        message: 'The specified user does not have access to this file'
      });
    }

    res.json({
      success: true,
      message: 'User access removed successfully',
      data: {
        fileId,
        userId: targetUserId,
        removedAt: new Date()
      }
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/team/request-access - Create a new access request
router.post('/request-access', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { fileId, requestedRole, message } = req.body as {
      fileId?: string;
      requestedRole?: 'view' | 'edit' | 'admin';
      message?: string;
    };

    const userId = (req as any).user.id;

    if (!fileId || !requestedRole) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'File ID and requested role are required'
      });
    }

    // Validate requested role
    if (!['view', 'edit', 'admin'].includes(requestedRole)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid requested role',
        message: 'Requested role must be view, edit, or admin'
      });
    }

    // Check if the file exists
    const file = await FileModel.findOne({ fileId });
    if (!file) {
      return res.status(404).json({
        success: false,
        error: 'File not found',
        message: 'The requested file does not exist'
      });
    }

    // Prevent requesting access to own file
    if (file.uploadedBy.toString() === userId) {
      return res.status(400).json({
        success: false,
        error: 'Invalid operation',
        message: 'You cannot request access to your own file'
      });
    }

    // Check if user already has access to this file
    const existingAccess = await FileAccess.findOne({
      fileId,
      userId,
      isActive: true
    });

    if (existingAccess) {
      return res.status(400).json({
        success: false,
        error: 'Access already exists',
        message: 'You already have access to this file'
      });
    }

    // Check if there's already a pending request for this file from this user
    const existingRequest = await AccessRequest.findOne({
      fileId,
      userId,
      status: 'pending'
    });

    if (existingRequest) {
      return res.status(400).json({
        success: false,
        error: 'Request already exists',
        message: 'You already have a pending access request for this file'
      });
    }

    // Create new access request
    const accessRequest = await AccessRequest.create({
      fileId,
      userId,
      requestedRole,
      message,
      status: 'pending'
    });

    res.status(201).json({
      success: true,
      message: 'Access request submitted successfully',
      data: {
        requestId: accessRequest._id,
        fileId,
        requestedRole,
        status: 'pending',
        createdAt: accessRequest.createdAt
      }
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/team/my-requests - Get user's outgoing access requests
router.get('/my-requests', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user.id;

    // Get all access requests made by the user
    const requests = await AccessRequest.find({
      userId
    }).populate('userId', 'firstName lastName email').sort({ createdAt: -1 });

    res.json({
      success: true,
      data: requests.map(req => ({
        requestId: req._id,
        fileId: req.fileId,
        requestedRole: req.requestedRole,
        status: req.status,
        message: req.message,
        actionedBy: req.actionedBy,
        actionedAt: req.actionedAt,
        createdAt: req.createdAt,
        updatedAt: req.updatedAt
      }))
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/team/manage-request - Approve or deny an access request
router.post('/manage-request', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { requestId, action, accessLevel } = req.body as {
      requestId?: string;
      action?: 'approve' | 'deny';
      accessLevel?: 'view' | 'edit' | 'admin';
    };
    const currentUserId = (req as any).user.id;

    if (!requestId || !action) {
      return res.status(400).json({
        success: false,
        message: 'Request ID and action are required'
      });
    }

    if (action === 'approve' && !accessLevel) {
      return res.status(400).json({
        success: false,
        message: 'Access level is required for approval'
      });
    }

    const request = await AccessRequest.findById(requestId);
    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Access request not found'
      });
    }

    const file = await FileModel.findOne({ fileId: request.fileId });
    if (!file) {
      return res.status(404).json({
        success: false,
        message: 'Associated file not found'
      });
    }

    // Check if current user has permission to manage requests (owner or admin)
    const isOwner = file.uploadedBy.toString() === currentUserId;
    const hasAdminAccess = await FileAccess.findOne({
      fileId: request.fileId,
      userId: currentUserId,
      accessLevel: 'admin',
      isActive: true
    });

    if (!isOwner && !hasAdminAccess) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to manage requests for this file'
      });
    }

    if (action === 'approve') {
      // Grant access
      await FileAccess.findOneAndUpdate(
        { fileId: request.fileId, userId: request.userId },
        {
          accessLevel,
          grantedBy: new mongoose.Types.ObjectId(currentUserId),
          grantedAt: new Date(),
          isActive: true
        },
        { upsert: true, new: true }
      );

      request.status = 'approved';
      request.actionedBy = new mongoose.Types.ObjectId(currentUserId);
      request.actionedAt = new Date();
      await request.save();

      // Notify requester of approval
      Promise.resolve().then(async () => {
        try {
          const requester = await User.findById(request.userId).select('email firstName lastName');
          const actor = await User.findById(currentUserId).select('firstName lastName');
          if (requester) {
            await EmailService.sendAccessGrantedNotification({
              to: requester.email,
              grantedByName: actor ? `${actor.firstName} ${actor.lastName}` : undefined,
              fileName: file.originalName,
              accessLevel: accessLevel!,
            });
          }
        } catch (e) {
          console.error('Access approved email error:', e);
        }
      });

      res.json({
        success: true,
        message: 'Access request approved and access granted'
      });

    } else if (action === 'deny') {
      request.status = 'denied';
      request.actionedBy = new mongoose.Types.ObjectId(currentUserId);
      request.actionedAt = new Date();
      await request.save();

      res.json({
        success: true,
        message: 'Access request denied'
      });

    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid action'
      });
    }
  } catch (error) {
    next(error);
  }
});


export default router;
