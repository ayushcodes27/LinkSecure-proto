import express, { Request, Response } from 'express';
import { requireAuth } from '../middleware/auth';
import NotificationModel from '../models/Notification';

const router = express.Router();

// Get all notifications for user
router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { page = 1, limit = 20, unreadOnly = false } = req.query;
    
    const query: any = { userId };
    if (unreadOnly === 'true') {
      query.read = false;
    }

    const notifications = await NotificationModel.find(query)
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));

    const total = await NotificationModel.countDocuments(query);
    const unreadCount = await NotificationModel.countDocuments({ userId, read: false });

    res.json({
      success: true,
      data: {
        notifications,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit))
        },
        unreadCount
      }
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ message: 'Failed to fetch notifications' });
  }
});

// Get unread count
router.get('/unread-count', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const count = await NotificationModel.countDocuments({ 
      userId, 
      read: false 
    });

    res.json({
      success: true,
      data: { count }
    });
  } catch (error) {
    console.error('Error fetching unread count:', error);
    res.status(500).json({ message: 'Failed to fetch unread count' });
  }
});

// Mark notification as read
router.put('/:notificationId/read', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { notificationId } = req.params;

    const notification = await NotificationModel.findOneAndUpdate(
      { _id: notificationId, userId },
      { read: true, readAt: new Date() },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    res.json({
      success: true,
      message: 'Notification marked as read',
      data: { notification }
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ message: 'Failed to mark notification as read' });
  }
});

// Mark all notifications as read
router.put('/mark-all-read', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const result = await NotificationModel.updateMany(
      { userId, read: false },
      { read: true, readAt: new Date() }
    );

    res.json({
      success: true,
      message: `${result.modifiedCount} notifications marked as read`,
      data: { modifiedCount: result.modifiedCount }
    });
  } catch (error) {
    console.error('Error marking all as read:', error);
    res.status(500).json({ message: 'Failed to mark all notifications as read' });
  }
});

// Delete notification
router.delete('/:notificationId', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { notificationId } = req.params;

    const notification = await NotificationModel.findOneAndDelete({
      _id: notificationId,
      userId
    });

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    res.json({
      success: true,
      message: 'Notification deleted'
    });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({ message: 'Failed to delete notification' });
  }
});

// Create notification (helper function for other routes to use)
export const createNotification = async (
  userId: string,
  type: string,
  title: string,
  message: string,
  data?: any
) => {
  try {
    const notification = new NotificationModel({
      userId,
      type,
      title,
      message,
      data
    });
    await notification.save();
    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
};

export default router;
