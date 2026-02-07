import { Queue, Worker, Job } from 'bullmq';
import Redis from 'ioredis';
import { firebaseMessaging } from './firebase';
import prisma from './prisma';

// Redis connection configuration with error handling
const redisConnection = new Redis({
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  maxRetriesPerRequest: null,
  retryStrategy: (times) => {
    if (times > 3) {
      console.error(' Redis connection failed after 3 retries. Notification system disabled.');
      return null; // Stop retrying
    }
    return Math.min(times * 200, 1000);
  },
  lazyConnect: true, // Don't connect immediately
});

// Redis subscriber for AI agent events
const redisSubscriber = new Redis({
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  retryStrategy: (times) => {
    if (times > 3) {
      return null;
    }
    return Math.min(times * 200, 1000);
  },
  lazyConnect: true,
});

// Handle Redis connection errors
redisConnection.on('error', (err: any) => {
  if (err.code === 'ECONNREFUSED') {
    console.warn(' Redis connection refused. Notification system will not work until Redis is started.');
  }
});

redisSubscriber.on('error', (err: any) => {
  if (err.code === 'ECONNREFUSED') {
    // Silently ignore connection refused errors for subscriber
  }
});

// Create notification queue (will be null if Redis is not available)
let notificationQueue: Queue | null = null;
let notificationWorker: Worker<NotificationJobData> | null = null;
let isRedisAvailable = false;

// Try to connect to Redis
async function initializeRedis() {
  try {
    await redisConnection.connect();
    await redisSubscriber.connect();
    isRedisAvailable = true;
    console.log(' Redis connected successfully');
    
    // Create notification queue
    notificationQueue = new Queue('notifications', {
      connection: redisConnection,
    });
    
    // Start the worker
    startWorker();
    
    // Subscribe to AI notifications
    subscribeToAINotifications();
  } catch (error: any) {
    console.warn('  Redis not available. Notification system disabled.');
    console.warn('   To enable notifications, start Redis: sudo systemctl start redis-server');
    isRedisAvailable = false;
  }
}

// Initialize Redis connection
initializeRedis();

export { notificationQueue };

// Notification job data interface
interface NotificationJobData {
  userId: string;
  title: string;
  body: string;
  data?: Record<string, string>;
}

// Process notification jobs
function startWorker() {
  if (!isRedisAvailable || !redisConnection) {
    return;
  }
  
  notificationWorker = new Worker<NotificationJobData>(
  'notifications',
  async (job: Job<NotificationJobData>) => {
    const { userId, title, body, data } = job.data;

    console.log(`📨 Processing notification job for user: ${userId}`);

    try {
      // Get all FCM tokens for the user
      const tokens = await prisma.notificationToken.findMany({
        where: { userId },
      });

      if (tokens.length === 0) {
        console.warn(`⚠️ No FCM tokens found for user: ${userId}`);
        return { sent: 0, message: 'No tokens found' };
      }

      // Send notifications to all user tokens
      const messaging = firebaseMessaging();
      const results = await Promise.allSettled(
        tokens.map(async (token: { id: string; fcmToken: string; userId: string; platform: string | null; createdAt: Date }) => {
          try {
            await messaging.send({
              token: token.fcmToken,
              notification: { title, body },
              data: data || {},
            });
            console.log(`✅ Notification sent to token: ${token.fcmToken.substring(0, 20)}...`);
            return { success: true, token: token.fcmToken };
          } catch (error: any) {
            console.error(`❌ Failed to send to token: ${token.fcmToken.substring(0, 20)}...`, error.message);
            
            // Remove invalid tokens
            if (error.code === 'messaging/invalid-registration-token' || 
                error.code === 'messaging/registration-token-not-registered') {
              await prisma.notificationToken.delete({
                where: { id: token.id },
              });
              console.log(`🗑️ Removed invalid token: ${token.id}`);
            }
            
            return { success: false, token: token.fcmToken, error: error.message };
          }
        })
      );

      const successCount = results.filter((r: PromiseSettledResult<{ success: boolean; token: string; error?: string }>) => r.status === 'fulfilled' && r.value.success).length;
      console.log(`✅ Sent ${successCount}/${tokens.length} notifications for user: ${userId}`);

      return { sent: successCount, total: tokens.length };
    } catch (error) {
      console.error('❌ Error processing notification job:', error);
      throw error;
    }
  },
  {
    connection: redisConnection,
    concurrency: 10,
  }
);

  // Handle worker events
  notificationWorker?.on('completed', (job) => {
    console.log(`✅ Job ${job.id} completed`);
  });

  notificationWorker?.on('failed', (job, err) => {
    console.error(`❌ Job ${job?.id} failed:`, err.message);
  });
}

// Subscribe to AI agent notifications channel
function subscribeToAINotifications() {
  if (!isRedisAvailable || !redisSubscriber || !notificationQueue) {
    return;
  }
  
  redisSubscriber.subscribe('ai_notifications', (err) => {
    if (err) {
      console.error('❌ Failed to subscribe to ai_notifications channel:', err);
    } else {
      console.log('✅ Subscribed to ai_notifications channel');
    }
  });

  // Handle incoming messages from AI agent
  redisSubscriber.on('message', async (channel, message) => {
    if (channel === 'ai_notifications' && notificationQueue) {
      try {
        const data: NotificationJobData = JSON.parse(message);
        console.log(' Received notification from AI agent:', data);
        
        // Add to queue for processing
        await notificationQueue.add('ai-notification', data, {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
        });
      } catch (error) {
        console.error(' Error processing AI notification:', error);
      }
    }
  });
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('⏹️ Shutting down notification worker...');
  if (notificationWorker) {
    await notificationWorker.close();
  }
  if (redisConnection && isRedisAvailable) {
    await redisConnection.quit();
  }
  if (redisSubscriber && isRedisAvailable) {
    await redisSubscriber.quit();
  }
});

export { notificationWorker, redisSubscriber, isRedisAvailable };
