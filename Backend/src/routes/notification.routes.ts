import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import {
  registerToken,
  getTokens,
  deleteToken,
  send,
  sendBulk,
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  deleteAllNotifications,
  sendTestNotification,
} from '../controllers/notification.controller';

const router = Router();

/**
 * @route   POST /api/notifications/test
 * @desc    Send a test notification to yourself (PUBLIC for testing)
 * @access  Public
 * @body    { type?: number } (optional: 0-4 for different test types)
 */
router.post('/test', sendTestNotification);

// All other notification routes require authentication
router.use(authenticate);

/**
 * @route   POST /api/notifications/register-token
 * @desc    Register a user's FCM token for push notifications
 * @access  Private
 */
router.post('/register-token', registerToken);

/**
 * @route   GET /api/notifications/tokens
 * @desc    Get all FCM tokens for the authenticated user
 * @access  Private
 */
router.get('/tokens', getTokens);

/**
 * @route   DELETE /api/notifications/tokens/:token
 * @desc    Delete a specific FCM token
 * @access  Private
 */
router.delete('/tokens/:token', deleteToken);

/**
 * @route   POST /api/notifications/send
 * @desc    Send a notification to a user (admin only)
 * @access  Private (Admin)
 * @body    { userId, title, body, data }
 */
router.post('/send', send);

/**
 * @route   POST /api/notifications/send-bulk
 * @desc    Send notifications to multiple users (admin only)
 * @access  Private (Admin)
 * @body    { userIds, title, body, data }
 */
router.post('/send-bulk', sendBulk);

/**
 * @route   GET /api/notifications
 * @desc    Get all notifications for the authenticated user
 * @access  Private
 * @query   ?unread=true (optional) - filter unread only
 */
router.get('/', getNotifications);

/**
 * @route   PATCH /api/notifications/read-all
 * @desc    Mark all notifications as read for the authenticated user
 * @access  Private
 * IMPORTANT: This route MUST come before /:id/read to avoid conflict
 */
router.patch('/read-all', markAllAsRead);

/**
 * @route   PATCH /api/notifications/:id/read
 * @desc    Mark a notification as read
 * @access  Private
 */
router.patch('/:id/read', markAsRead);

/**
 * @route   DELETE /api/notifications/:id
 * @desc    Delete a specific notification
 * @access  Private
 */
router.delete('/:id', deleteNotification);

/**
 * @route   DELETE /api/notifications
 * @desc    Delete all notifications for the authenticated user
 * @access  Private
 */
router.delete('/', deleteAllNotifications);

export default router;
