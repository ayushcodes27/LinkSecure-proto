import express, { Request, Response } from 'express';
import { requireAuth } from '../middleware/auth';
import UserModel from '../models/User';
import FileModel from '../models/File';
import bcrypt from 'bcrypt';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = express.Router();

// Configure multer for profile image upload
const profileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads', 'profiles');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const userId = (req as any).user?.id;
    const ext = path.extname(file.originalname);
    cb(null, `profile-${userId}-${Date.now()}${ext}`);
  }
});

const profileUpload = multer({
  storage: profileStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed (jpeg, jpg, png, gif, webp)'));
    }
  }
});

// Get user settings
router.get('/settings', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const user = await UserModel.findById(userId).select('-passwordHash -emailVerificationToken -twoFactorCode');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Calculate storage used
    const files = await FileModel.find({ uploadedBy: userId, isDeleted: false });
    const storageUsed = files.reduce((total, file) => total + (file.fileSize || 0), 0);

    res.json({
      success: true,
      data: {
        user: {
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          profileImage: user.profileImage,
          emailVerified: user.emailVerified,
          twoFactorEnabled: user.twoFactorEnabled,
          createdAt: user.createdAt
        },
        notificationPreferences: user.notificationPreferences || {
          emailNotifications: true,
          fileShared: true,
          fileDownloaded: true,
          accessRequestReceived: true,
          accessRequestApproved: true,
          comments: true,
          digestFrequency: 'daily'
        },
        privacySettings: user.privacySettings || {
          defaultFilePrivacy: 'private',
          profileVisibility: 'public',
          activityVisibility: 'public'
        },
        appearanceSettings: user.appearanceSettings || {
          theme: 'system',
          language: 'en',
          timezone: 'UTC',
          dateFormat: 'MM/DD/YYYY'
        },
        storage: {
          used: storageUsed,
          limit: user.storageLimit || 5 * 1024 * 1024 * 1024,
          percentage: ((storageUsed / (user.storageLimit || 5 * 1024 * 1024 * 1024)) * 100).toFixed(2)
        }
      }
    });
  } catch (error) {
    console.error('Error fetching user settings:', error);
    res.status(500).json({ message: 'Failed to fetch settings' });
  }
});

// Upload profile image
router.post('/settings/profile-image', requireAuth, profileUpload.single('profileImage'), async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    
    if (!req.file) {
      return res.status(400).json({ message: 'No image file provided' });
    }

    // Delete old profile image if exists
    const user = await UserModel.findById(userId);
    if (user?.profileImage) {
      const oldImagePath = path.join(process.cwd(), user.profileImage);
      if (fs.existsSync(oldImagePath)) {
        fs.unlinkSync(oldImagePath);
      }
    }

    // Save new image path (relative to project root)
    const imagePath = `/uploads/profiles/${req.file.filename}`;
    const updatedUser = await UserModel.findByIdAndUpdate(
      userId,
      { profileImage: imagePath },
      { new: true }
    ).select('-passwordHash -emailVerificationToken -twoFactorCode');

    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      success: true,
      message: 'Profile image uploaded successfully',
      data: { 
        profileImage: updatedUser.profileImage,
        user: updatedUser 
      }
    });
  } catch (error) {
    console.error('Error uploading profile image:', error);
    res.status(500).json({ message: 'Failed to upload profile image' });
  }
});

// Delete profile image
router.delete('/settings/profile-image', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const user = await UserModel.findById(userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.profileImage) {
      // Delete image file
      const imagePath = path.join(process.cwd(), user.profileImage);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }

      // Remove from database
      user.profileImage = undefined;
      await user.save();
    }

    res.json({
      success: true,
      message: 'Profile image removed successfully'
    });
  } catch (error) {
    console.error('Error removing profile image:', error);
    res.status(500).json({ message: 'Failed to remove profile image' });
  }
});

// Update user profile
router.put('/settings/profile', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { firstName, lastName } = req.body;

    if (!firstName || !lastName) {
      return res.status(400).json({ message: 'First name and last name are required' });
    }

    const user = await UserModel.findByIdAndUpdate(
      userId,
      { firstName, lastName },
      { new: true }
    ).select('-passwordHash -emailVerificationToken -twoFactorCode');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: { user }
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ message: 'Failed to update profile' });
  }
});

// Change password
router.put('/settings/password', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Current and new passwords are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters' });
    }

    const user = await UserModel.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ message: 'Current password is incorrect' });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    user.passwordHash = passwordHash;
    await user.save();

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).json({ message: 'Failed to change password' });
  }
});

// Update notification preferences
router.put('/settings/notifications', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { notificationPreferences } = req.body;

    const user = await UserModel.findByIdAndUpdate(
      userId,
      { notificationPreferences },
      { new: true }
    ).select('-passwordHash -emailVerificationToken -twoFactorCode');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      success: true,
      message: 'Notification preferences updated',
      data: { notificationPreferences: user.notificationPreferences }
    });
  } catch (error) {
    console.error('Error updating notifications:', error);
    res.status(500).json({ message: 'Failed to update notification preferences' });
  }
});

// Update privacy settings
router.put('/settings/privacy', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { privacySettings } = req.body;

    const user = await UserModel.findByIdAndUpdate(
      userId,
      { privacySettings },
      { new: true }
    ).select('-passwordHash -emailVerificationToken -twoFactorCode');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      success: true,
      message: 'Privacy settings updated',
      data: { privacySettings: user.privacySettings }
    });
  } catch (error) {
    console.error('Error updating privacy settings:', error);
    res.status(500).json({ message: 'Failed to update privacy settings' });
  }
});

// Update appearance settings
router.put('/settings/appearance', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { appearanceSettings } = req.body;

    const user = await UserModel.findByIdAndUpdate(
      userId,
      { appearanceSettings },
      { new: true }
    ).select('-passwordHash -emailVerificationToken -twoFactorCode');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      success: true,
      message: 'Appearance settings updated',
      data: { appearanceSettings: user.appearanceSettings }
    });
  } catch (error) {
    console.error('Error updating appearance settings:', error);
    res.status(500).json({ message: 'Failed to update appearance settings' });
  }
});

// Delete account
router.delete('/account', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ message: 'Password is required to delete account' });
    }

    const user = await UserModel.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Verify password
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ message: 'Incorrect password' });
    }

    // Delete user's files
    await FileModel.deleteMany({ uploadedBy: userId });

    // Delete user account
    await UserModel.findByIdAndDelete(userId);

    res.json({
      success: true,
      message: 'Account deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting account:', error);
    res.status(500).json({ message: 'Failed to delete account' });
  }
});

// Clear trash
router.post('/storage/clear-trash', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const result = await FileModel.deleteMany({ 
      uploadedBy: userId, 
      isDeleted: true 
    });

    res.json({
      success: true,
      message: `${result.deletedCount} files permanently deleted from trash`,
      data: { deletedCount: result.deletedCount }
    });
  } catch (error) {
    console.error('Error clearing trash:', error);
    res.status(500).json({ message: 'Failed to clear trash' });
  }
});

export default router;
