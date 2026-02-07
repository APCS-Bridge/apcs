import express from "express";
import type { NextFunction, Request, Response } from "express";
import helmet from "helmet";
import morgan from "morgan";
import cors from "cors";
import path from "path";
import fs from "fs";

const app: express.Application = express();

// Ensure upload directories exist
const uploadDirs = [
  path.join(process.cwd(), 'uploads'),
  path.join(process.cwd(), 'uploads', 'temp'),
  path.join(process.cwd(), 'uploads', 'avatars'),
  path.join(process.cwd(), 'uploads', 'documents')
];

uploadDirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

//
// Middleware setup
// IMPORTANT: Serve static files BEFORE helmet to avoid blocking
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads'), {
  setHeaders: (res) => {
    res.set('Cross-Origin-Resource-Policy', 'cross-origin');
  }
}));

app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
})); // Send appropriate headers to prevent XSS attacks
app.use(express.json()); // Parse JSON request body
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies
app.use(morgan('combined')); // HTTP request logger
app.use(cors({
  credentials: true,
  origin: true // Allow all origins
})); // Configure CORS properly

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Server is running correctly',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Test uploads endpoint
app.get('/uploads-test', (req, res) => {
  const uploadsPath = path.join(process.cwd(), 'uploads');
  res.json({
    uploadsPath,
    exists: fs.existsSync(uploadsPath),
    contents: fs.existsSync(uploadsPath) ? fs.readdirSync(uploadsPath) : []
  });
});

// API Routes
import authRoutes from './src/routes/auth.routes';
import userRoutes from './src/routes/user.routes';
import spaceRoutes from './src/routes/space.routes';
import invitationRoutes from './src/routes/invitation.routes';
import meetingRoutes from './src/routes/meeting.routes';
import sprintRoutes from './src/routes/sprint.routes';
import notificationRoutes from './src/routes/notification.routes';
import chatRoutes from './src/routes/chat.routes';
import documentRoutes from './src/routes/document.routes';
import sessionRoutes from './src/routes/session.routes';
import documentReviewWorkflowRoutes from './src/routes/documentReviewWorkflow.routes';

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/spaces', spaceRoutes);
app.use('/api/invitations', invitationRoutes);
app.use('/api', meetingRoutes); // Includes /api/meetings and /api/spaces/:spaceId/meetings
app.use('/api', sprintRoutes); // Includes /api/sprints and /api/spaces/:spaceId/sprints
app.use('/api/notifications', notificationRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api', documentRoutes); // Document management routes
app.use('/api/session', sessionRoutes); // Session management routes
app.use('/api/workflows', documentReviewWorkflowRoutes); // Document review workflow routes

export default app;