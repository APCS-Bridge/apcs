import type { Request, Response } from 'express';
import {
  registerFcmToken,
  getUserTokens,
  deleteFcmToken,
  sendNotification,
  sendBulkNotifications,
  fetchUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotificationById,
  deleteAllUserNotifications,
} from '../services/notification.service';

/**
 * POST /notifications/register-token
 * Register a user's FCM token for push notifications
 */
export const registerToken = async (req: Request, res: Response): Promise<void> => {
  try {
    const { fcmToken, platform } = req.body;
    const userId = req.user?.userId; // Assuming auth middleware attaches user to req

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (!fcmToken) {
      res.status(400).json({ error: 'FCM token is required' });
      return;
    }

    const token = await registerFcmToken({
      userId,
      fcmToken,
      platform: platform || 'web',
    });

    res.status(201).json({
      message: 'Token registered successfully',
      token: {
        id: token.id,
        platform: token.platform,
        createdAt: token.createdAt,
      },
    });
  } catch (error: any) {
    console.error('Error registering token:', error);
    res.status(500).json({ error: 'Failed to register token' });
  }
};

/**
 * GET /notifications/tokens
 * Get all FCM tokens for the authenticated user
 */
export const getTokens = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const tokens = await getUserTokens(userId);

    res.json({
      tokens: tokens.map((t: { id: string; fcmToken: string; platform: string | null; createdAt: Date }) => ({
        id: t.id,
        platform: t.platform,
        createdAt: t.createdAt,
      })),
    });
  } catch (error: any) {
    console.error('Error fetching tokens:', error);
    res.status(500).json({ error: 'Failed to fetch tokens' });
  }
};

/**
 * DELETE /notifications/tokens/:token
 * Delete a specific FCM token
 */
export const deleteToken = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (!token) {
      res.status(400).json({ error: 'Token parameter is required' });
      return;
    }

    await deleteFcmToken(token);

    res.json({ message: 'Token deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting token:', error);
    res.status(500).json({ error: 'Failed to delete token' });
  }
};

/**
 * POST /notifications/send
 * Send a notification to a user (admin only)
 */
export const send = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId, title, body, data } = req.body;

    if (!userId || !title || !body) {
      res.status(400).json({ error: 'userId, title, and body are required' });
      return;
    }

    const result = await sendNotification({ userId, title, body, data });

    res.status(202).json({
      message: 'Notification queued successfully',
      jobId: result.jobId,
    });
  } catch (error: any) {
    console.error('Error sending notification:', error);
    res.status(500).json({ error: 'Failed to send notification' });
  }
};

/**
 * POST /notifications/send-bulk
 * Send notifications to multiple users (admin only)
 */
export const sendBulk = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userIds, title, body, data } = req.body;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      res.status(400).json({ error: 'userIds array is required' });
      return;
    }

    if (!title || !body) {
      res.status(400).json({ error: 'title and body are required' });
      return;
    }

    const result = await sendBulkNotifications(userIds, title, body, data);

    res.status(202).json({
      message: 'Bulk notifications queued successfully',
      jobCount: result.jobCount,
    });
  } catch (error: any) {
    console.error('Error sending bulk notifications:', error);
    res.status(500).json({ error: 'Failed to send bulk notifications' });
  }
};

/**
 * GET /notifications
 * Get all notifications for the authenticated user
 */
export const getNotifications = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const unreadOnly = req.query.unread === 'true';
    const notifications = await fetchUserNotifications(userId, unreadOnly);

    res.json({
      success: true,
      data: notifications,
    });
  } catch (error: any) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
};

/**
 * PATCH /notifications/:id/read
 * Mark a notification as read
 */
export const markAsRead = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (!id) {
      res.status(400).json({ error: 'Notification ID is required' });
      return;
    }

    await markNotificationAsRead(id, userId);

    res.json({
      success: true,
      message: 'Notification marked as read',
    });
  } catch (error: any) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
};

/**
 * PATCH /notifications/read-all
 * Mark all notifications as read
 */
export const markAllAsRead = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    await markAllNotificationsAsRead(userId);

    res.json({
      success: true,
      message: 'All notifications marked as read',
    });
  } catch (error: any) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({ error: 'Failed to mark all notifications as read' });
  }
};

/**
 * DELETE /notifications/:id
 * Delete a specific notification
 */
export const deleteNotification = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (!id) {
      res.status(400).json({ error: 'Notification ID is required' });
      return;
    }

    await deleteNotificationById(id, userId);

    res.json({
      success: true,
      message: 'Notification deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting notification:', error);
    res.status(500).json({ error: 'Failed to delete notification' });
  }
};

/**
 * DELETE /notifications
 * Delete all notifications for the authenticated user
 */
export const deleteAllNotifications = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    await deleteAllUserNotifications(userId);

    res.json({
      success: true,
      message: 'All notifications deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting all notifications:', error);
    res.status(500).json({ error: 'Failed to delete all notifications' });
  }
};

/**
 * POST /notifications/test
 * Send a test notification (for testing purposes)
 * Can be used with or without authentication
 * If not authenticated, userId must be provided in request body
 */
export const sendTestNotification = async (req: Request, res: Response): Promise<void> => {
  try {
    // Get userId from auth or request body
    const userId = req.user?.userId || req.body.userId;

    if (!userId) {
      res.status(400).json({ 
        error: 'userId is required. Either authenticate or provide userId in request body',
        example: { userId: 'user-id-here', type: 0 }
      });
      return;
    }

    const testTypes = [
      {
        title: '🎉 Welcome Notification',
        body: 'This is a test notification to verify your notification system is working!',
        data: { type: 'test', timestamp: new Date().toISOString() } as Record<string, string>
      },
      {
        title: '📝 New Task Assigned',
        body: 'You have been assigned to work on "Test Feature Implementation"',
        data: { type: 'task', taskId: 'test-123' } as Record<string, string>
      },
      {
        title: '💬 New Message',
        body: 'You have a new message in the team chat',
        data: { type: 'message', chatId: 'test-chat' } as Record<string, string>
      },
      {
        title: '⚡ Sprint Update',
        body: 'Sprint "Q1 2026" has been updated with new tasks',
        data: { type: 'sprint', sprintId: 'test-sprint' } as Record<string, string>
      },
      {
        title: '✅ Task Completed',
        body: 'Task "Setup notification system" has been marked as complete',
        data: { type: 'task_complete', taskId: 'test-456' } as Record<string, string>
      }
    ];

    // Get notification type from request or use random
    const typeIndex = req.body.type !== undefined
      ? parseInt(req.body.type, 10) 
      : Math.floor(Math.random() * testTypes.length);
    
    const testNotification = testTypes[typeIndex] || testTypes[0];

    if (!testNotification) {
      res.status(500).json({ error: 'No test notification templates available' });
      return;
    }

    const result = await sendNotification({
      userId,
      title: testNotification.title,
      body: testNotification.body,
      data: testNotification.data,
    });

    res.status(202).json({
      success: true,
      message: 'Test notification sent successfully!',
      jobId: result.jobId,
      userId,
      notification: {
        title: testNotification.title,
        body: testNotification.body,
      },
    });
  } catch (error: any) {
    console.error('Error sending test notification:', error);
    res.status(500).json({ error: 'Failed to send test notification' });
  }
};
