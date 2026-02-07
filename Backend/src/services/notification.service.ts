import prisma from '../lib/prisma';
import { notificationQueue, isRedisAvailable } from '../lib/queue';
import { NotificationType } from '@prisma/client';

export interface RegisterTokenData {
  userId: string;
  fcmToken: string;
  platform?: string;
}

export interface SendNotificationData {
  userId: string;
  title: string;
  body: string;
  data?: Record<string, string>;
  type?: NotificationType;
}

/**
 * Register or update a user's FCM token
 */
export const registerFcmToken = async (tokenData: RegisterTokenData) => {
  const { userId, fcmToken, platform = 'web' } = tokenData;

  // Upsert the token (insert if new, update if exists)
  const token = await prisma.notificationToken.upsert({
    where: {
      userId_fcmToken: {
        userId,
        fcmToken,
      },
    },
    update: {
      platform,
    },
    create: {
      userId,
      fcmToken,
      platform,
    },
  });

  console.log(`✅ Registered FCM token for user: ${userId}`);
  return token;
};

/**
 * Get all FCM tokens for a user
 */
export const getUserTokens = async (userId: string) => {
  const tokens = await prisma.notificationToken.findMany({
    where: { userId },
  });

  return tokens;
};

/**
 * Delete a specific FCM token
 */
export const deleteFcmToken = async (fcmToken: string) => {
  await prisma.notificationToken.delete({
    where: { fcmToken },
  });

  console.log(`🗑️ Deleted FCM token: ${fcmToken.substring(0, 20)}...`);
};

/**
 * Send notification to a user (enqueue job)
 */
export const sendNotification = async (notificationData: SendNotificationData) => {
  const { userId, title, body, data, type = 'MESSAGE_RECEIVED' } = notificationData;

  // Save notification to database first
  const notification = await prisma.notification.create({
    data: {
      userId,
      type: type as NotificationType,
      title,
      body,
      data: data || {},
    },
  });

  // Check if Redis is available
  if (!isRedisAvailable || !notificationQueue) {
    console.warn('⚠️ Redis not available. Notification saved but not sent via FCM.');
    return { notificationId: notification.id, status: 'saved' };
  }

  // Add notification job to queue
  const job = await notificationQueue.add(
    'user-notification',
    {
      userId,
      notificationId: notification.id,
      title,
      body,
      data,
    },
    {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
    }
  );

  console.log(`📨 Notification job enqueued: ${job.id} for user: ${userId}`);
  return { jobId: job.id, notificationId: notification.id, status: 'enqueued' };
};

/**
 * Send notification to multiple users
 */
export const sendBulkNotifications = async (
  userIds: string[],
  title: string,
  body: string,
  data?: Record<string, string>
) => {
  // Check if Redis is available
  if (!isRedisAvailable || !notificationQueue) {
    console.warn('⚠️ Redis not available. Cannot send bulk notifications.');
    throw new Error('Notification system is currently unavailable. Please ensure Redis is running.');
  }

  const jobs = await Promise.all(
    userIds.map((userId) =>
      notificationQueue!.add(
        'bulk-notification',
        { userId, title, body, data },
        {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
        }
      )
    )
  );

  console.log(`📨 ${jobs.length} bulk notification jobs enqueued`);
  return { jobCount: jobs.length, status: 'enqueued' };
};

/**
 * Fetch notifications for a user
 */
export const fetchUserNotifications = async (userId: string, unreadOnly: boolean = false) => {
  const notifications = await prisma.notification.findMany({
    where: {
      userId,
      ...(unreadOnly && { read: false }),
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  return notifications;
};

/**
 * Mark a notification as read
 */
export const markNotificationAsRead = async (notificationId: string, userId: string) => {
  const notification = await prisma.notification.findFirst({
    where: {
      id: notificationId,
      userId,
    },
  });

  if (!notification) {
    throw new Error('Notification not found');
  }

  await prisma.notification.update({
    where: { id: notificationId },
    data: {
      read: true,
      readAt: new Date(),
    },
  });

  console.log(`✅ Notification marked as read: ${notificationId}`);
};

/**
 * Mark all notifications as read for a user
 */
export const markAllNotificationsAsRead = async (userId: string) => {
  await prisma.notification.updateMany({
    where: {
      userId,
      read: false,
    },
    data: {
      read: true,
      readAt: new Date(),
    },
  });

  console.log(`✅ All notifications marked as read for user: ${userId}`);
};

/**
 * Delete a notification by ID
 */
export const deleteNotificationById = async (notificationId: string, userId: string) => {
  const notification = await prisma.notification.findFirst({
    where: {
      id: notificationId,
      userId,
    },
  });

  if (!notification) {
    throw new Error('Notification not found');
  }

  await prisma.notification.delete({
    where: { id: notificationId },
  });

  console.log(`🗑️ Notification deleted: ${notificationId}`);
};

/**
 * Delete all notifications for a user
 */
export const deleteAllUserNotifications = async (userId: string) => {
  const result = await prisma.notification.deleteMany({
    where: { userId },
  });

  console.log(`🗑️ Deleted ${result.count} notifications for user: ${userId}`);
};
