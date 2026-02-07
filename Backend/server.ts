import dotenv from 'dotenv';
// Load environment variables immediately, before other imports
dotenv.config();

import app from './app';
import { createServer } from 'http';
import { initializeFirebase } from './src/lib/firebase';
import { initializeSocketIO } from './src/lib/socket';
import { setupChatHandlers } from './src/lib/socketHandlers';
import './src/lib/queue'; // Initialize notification worker and Redis subscriber
// import { verifyCloudinaryConfig } from './config/cloudinary';

const PORT = process.env.PORT || 3000;
const DATABASE_URL = process.env.DATABASE_URL;

// Validate required environment variables
if (!DATABASE_URL) {
  console.error('Error: DATABASE_URL environment variable is required');
  process.exit(1);
}

// Initialize Firebase Admin SDK
try {
  initializeFirebase();
} catch (error) {
  console.error('Failed to initialize Firebase. Push notifications will not work.');
  console.error(error);
}

// Verify Cloudinary configuration (uncomment when cloudinary config is ready)
// verifyCloudinaryConfig();

// Create HTTP server
const httpServer = createServer(app);

// Initialize Socket.IO
const io = initializeSocketIO(httpServer);
setupChatHandlers(io);

// Set Socket.IO instance in chat controller for REST API integration
import { setSocketIO } from './src/controllers/chat.controller';
setSocketIO(io);

// Export io for use in other parts of the application
export { io };

// Start the server
httpServer.listen(PORT, () => {
  console.log(` Server is running on port ${PORT}`);
  console.log(` Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(` Health check available at: http://localhost:${PORT}/health`);
  console.log(` Socket.IO ready for real-time connections`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  process.exit(0);
});
