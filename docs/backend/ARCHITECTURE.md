# APCS Server - Backend Architecture

> Enterprise-grade Node.js backend with TypeScript, Prisma ORM, and real-time capabilities

## Overview

The APCS Server is a RESTful API backend built on Node.js and Express, providing secure authentication, data persistence, real-time communication, and business logic for the Agile Project Collaboration System. It follows clean architecture principles with clear separation between controllers, services, and data access layers.

## Architecture Principles

### Layered Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Presentation Layer                      │
│   ┌─────────────────────────────────────────────────────┐  │
│   │  Routes (API Endpoints)                             │  │
│   │  • Express route definitions                        │  │
│   │  • Request validation                               │  │
│   │  • Response formatting                              │  │
│   └─────────────────────────────────────────────────────┘  │
└───────────────────────┬─────────────────────────────────────┘
                        │
┌───────────────────────┼─────────────────────────────────────┐
│                     │ Middleware Layer                      │
│   ┌─────────────────┴───────────────────────────────────┐  │
│   │  • Authentication (JWT verification)                │  │
│   │  • Authorization (RBAC)                             │  │
│   │  • Error handling                                   │  │
│   │  • Request logging                                  │  │
│   │  • Rate limiting                                    │  │
│   └─────────────────┬───────────────────────────────────┘  │
└─────────────────────┼───────────────────────────────────────┘
                      │
┌─────────────────────┼───────────────────────────────────────┐
│                   │ Application Layer                       │
│   ┌───────────────┴─────────────────────────────────────┐  │
│   │  Controllers (Request Handlers)                     │  │
│   │  • Parse request data                               │  │
│   │  • Call appropriate services                        │  │
│   │  • Format responses                                 │  │
│   └───────────────┬─────────────────────────────────────┘  │
└───────────────────┼───────────────────────────────────────────┘
                    │
┌───────────────────┼───────────────────────────────────────┐
│                 │ Business Logic Layer                    │
│   ┌─────────────┴───────────────────────────────────────┐│
│   │  Services                                           ││
│   │  • Business rules                                   ││
│   │  • Data transformation                              ││
│   │  • Transaction management                           ││
│   │  • External API calls                               ││
│   └─────────────┬───────────────────────────────────────┘│
└─────────────────┼───────────────────────────────────────────┘
                  │
┌─────────────────┼───────────────────────────────────────┐
│               │ Data Access Layer                       │
│   ┌───────────┴─────────────────────────────────────────┐│
│   │  Prisma ORM                                         ││
│   │  • Type-safe database queries                       ││
│   │  • Connection pooling                               ││
│   │  • Transaction support                              ││
│   └───────────┬─────────────────────────────────────────┘│
└───────────────┼───────────────────────────────────────────┘
                │
        ┌───────┴───────┐
        │  PostgreSQL   │
        │   Database    │
        └───────────────┘
```

### Design Patterns

1. **Service Layer Pattern**: Business logic isolated from HTTP concerns
2. **Repository Pattern**: Data access abstracted via Prisma
3. **Middleware Pipeline**: Cross-cutting concerns handled uniformly
4. **Dependency Injection**: Services receive dependencies via constructor
5. **Strategy Pattern**: Different authentication strategies (JWT, OAuth)

## Technology Stack

### Core Framework
- **Node.js 18+**: JavaScript runtime with ES modules
- **Express.js**: Minimal, flexible web framework
- **TypeScript**: Static typing for enhanced developer experience

### Database & ORM
- **PostgreSQL 16**: Robust relational database
- **Prisma 5**: Modern ORM with type generation
- **Connection Pooling**: Efficient database connections

### Authentication & Security
- **JWT**: JSON Web Tokens for stateless authentication
- **bcrypt**: Password hashing with salt rounds
- **Helmet**: Security headers
- **CORS**: Cross-origin request configuration

### Real-Time Communication
- **Socket.io**: WebSocket library with fallbacks
- **Redis**: Pub/sub for multi-instance scaling
- **Firebase Admin**: Push notification delivery

### Development Tools
- **nodemon**: Auto-restart on file changes
- **ts-node**: Execute TypeScript without compilation
- **eslint**: Code linting
- **prettier**: Code formatting

## Project Structure

```
apcs_server/
├── src/
│   ├── controllers/            # Request handlers
│   │   ├── auth.controller.ts
│   │   ├── user.controller.ts
│   │   ├── space.controller.ts
│   │   ├── backlog.controller.ts
│   │   ├── sprint.controller.ts
│   │   ├── meeting.controller.ts
│   │   ├── notification.controller.ts
│   │   ├── document.controller.ts
│   │   └── chat.controller.ts
│   │
│   ├── services/               # Business logic
│   │   ├── auth.service.ts
│   │   ├── user.service.ts
│   │   ├── space.service.ts
│   │   ├── backlog.service.ts
│   │   ├── sprint.service.ts
│   │   ├── meeting.service.ts
│   │   ├── notification.service.ts
│   │   ├── document.service.ts
│   │   └── board.service.ts
│   │
│   ├── routes/                 # Route definitions
│   │   ├── auth.routes.ts
│   │   ├── user.routes.ts
│   │   ├── space.routes.ts
│   │   ├── sprint.routes.ts
│   │   ├── meeting.routes.ts
│   │   ├── notification.routes.ts
│   │   └── document.routes.ts
│   │
│   ├── middleware/             # Express middleware
│   │   ├── auth.middleware.ts      # JWT verification
│   │   ├── upload.middleware.ts    # File uploads
│   │   └── document.middleware.ts  # Document permissions
│   │
│   ├── lib/                    # Shared utilities
│   │   ├── prisma.ts              # Prisma client
│   │   ├── auth.ts                # JWT utilities
│   │   ├── firebase.ts            # FCM setup
│   │   ├── socket.ts              # Socket.io server
│   │   ├── socketHandlers.ts      # Socket event handlers
│   │   └── queue.ts               # Job queue
│   │
│   ├── types/                  # TypeScript types
│   │   └── notifications.ts
│   │
│   ├── utils/                  # Helper functions
│   │   ├── notificationHelpers.ts
│   │   └── upload.util.ts
│   │
│   ├── config/                 # Configuration files
│   │   ├── auth.ts
│   │   └── firebase-admin.json
│   │
│   └── generated/              # Prisma generated types
│       └── prisma/
│
├── prisma/
│   ├── schema.prisma          # Database schema
│   ├── seed.js                # Seed data
│   └── migrations/            # Migration history
│
├── scripts/
│   └── setup-notifications.sh
│
├── app.ts                     # Express app setup
├── server.ts                  # HTTP server entry point
├── package.json
├── tsconfig.json
└── docker-compose.yml
```

## Core Components

### 1. Express Application Setup

**File**: [app.ts](../app.ts)

```typescript
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import { errorHandler } from './middleware/errorHandler';
import { rateLimiter } from './middleware/rateLimiter';

// Route imports
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import spaceRoutes from './routes/space.routes';
// ... other routes

const app = express();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3001',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
app.use(morgan('combined'));

// Rate limiting
app.use('/api/auth', rateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
}));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/spaces', spaceRoutes);
// ... other routes

// Error handling (must be last)
app.use(errorHandler);

export default app;
```

### 2. Server Entry Point with Socket.io

**File**: [server.ts](../server.ts)

```typescript
import http from 'http';
import app from './app';
import { initSocket } from './lib/socket';
import { prisma } from './lib/prisma';

const PORT = process.env.PORT || 3000;

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.io
const io = initSocket(server);

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, closing server gracefully');
  
  // Close Socket.io connections
  io.close(() => {
    console.log('Socket.io connections closed');
  });
  
  // Close HTTP server
  server.close(() => {
    console.log('HTTP server closed');
  });
  
  // Disconnect Prisma
  await prisma.$disconnect();
  
  process.exit(0);
});

// Start server
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV}`);
  console.log(`🔗 Database: Connected`);
});

export { server, io };
```

### 3. Prisma Client Configuration

**File**: [src/lib/prisma.ts](../src/lib/prisma.ts)

```typescript
import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma || new PrismaClient({
  log: process.env.NODE_ENV === 'development' 
    ? ['query', 'error', 'warn'] 
    : ['error'],
  errorFormat: 'pretty',
});

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// Connection pool configuration
prisma.$connect()
  .then(() => console.log('✅ Database connected'))
  .catch((error) => console.error('❌ Database connection failed:', error));

// Graceful shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});
```

## Authentication System

### JWT Implementation

**File**: [src/lib/auth.ts](../src/lib/auth.ts)

```typescript
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';

const JWT_SECRET = process.env.JWT_SECRET!;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const REFRESH_TOKEN_EXPIRES_IN = '30d';

interface TokenPayload {
  userId: string;
  email: string;
  role: string;
}

export const hashPassword = async (password: string): Promise<string> => {
  const salt = await bcrypt.genSalt(12);
  return bcrypt.hash(password, salt);
};

export const comparePassword = async (
  password: string,
  hash: string
): Promise<boolean> => {
  return bcrypt.compare(password, hash);
};

export const generateAccessToken = (payload: TokenPayload): string => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

export const generateRefreshToken = (payload: TokenPayload): string => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRES_IN });
};

export const verifyToken = (token: string): TokenPayload => {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
};

// Token blacklist (for logout)
const tokenBlacklist = new Set<string>();

export const blacklistToken = (token: string) => {
  tokenBlacklist.add(token);
};

export const isTokenBlacklisted = (token: string): boolean => {
  return tokenBlacklist.has(token);
};
```

### Authentication Middleware

**File**: [src/middleware/auth.middleware.ts](../src/middleware/auth.middleware.ts)

```typescript
import { Request, Response, NextFunction } from 'express';
import { verifyToken, isTokenBlacklisted } from '../lib/auth';
import { prisma } from '../lib/prisma';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];

    // Check if token is blacklisted
    if (isTokenBlacklisted(token)) {
      return res.status(401).json({ error: 'Token has been revoked' });
    }

    // Verify token
    const decoded = verifyToken(token);

    // Fetch user from database
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true, role: true, name: true },
    });

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    // Attach user to request
    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

// Role-based authorization
export const authorize = (...allowedRoles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
};
```

## Service Layer Examples

### User Service

**File**: [src/services/user.service.ts](../src/services/user.service.ts)

```typescript
import { prisma } from '../lib/prisma';
import { hashPassword } from '../lib/auth';
import { UserRole } from '@prisma/client';

export class UserService {
  async createUser(data: {
    email: string;
    password: string;
    name: string;
    role?: UserRole;
  }) {
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      throw new Error('User already exists');
    }

    const hashedPassword = await hashPassword(data.password);

    return prisma.user.create({
      data: {
        email: data.email,
        password: hashedPassword,
        name: data.name,
        role: data.role || 'USER',
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });
  }

  async getUserById(id: string) {
    return prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        avatarUrl: true,
        createdAt: true,
      },
    });
  }

  async updateUser(id: string, data: {
    name?: string;
    avatarUrl?: string;
  }) {
    return prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
      },
    });
  }

  async deleteUser(id: string) {
    // Soft delete: mark user as inactive
    return prisma.user.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async listUsers(filters: {
    role?: UserRole;
    search?: string;
  }) {
    return prisma.user.findMany({
      where: {
        AND: [
          filters.role ? { role: filters.role } : {},
          filters.search ? {
            OR: [
              { name: { contains: filters.search, mode: 'insensitive' } },
              { email: { contains: filters.search, mode: 'insensitive' } },
            ],
          } : {},
        ],
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        avatarUrl: true,
      },
      orderBy: { name: 'asc' },
    });
  }
}

export const userService = new UserService();
```

### Space (Workspace) Service

**File**: [src/services/space.service.ts](../src/services/space.service.ts)

```typescript
import { prisma } from '../lib/prisma';
import { Methodology } from '@prisma/client';

export class SpaceService {
  async createSpace(data: {
    name: string;
    description?: string;
    methodology: Methodology;
    ownerId: string;
  }) {
    return prisma.$transaction(async (tx) => {
      // Create space
      const space = await tx.space.create({
        data: {
          name: data.name,
          description: data.description,
          methodology: data.methodology,
          ownerId: data.ownerId,
        },
      });

      // Add owner as member
      await tx.spaceMember.create({
        data: {
          spaceId: space.id,
          userId: data.ownerId,
          scrumRole: data.methodology === 'SCRUM' ? 'PRODUCT_OWNER' : null,
        },
      });

      // Create default columns for Kanban
      if (data.methodology === 'KANBAN') {
        await tx.column.createMany({
          data: [
            { spaceId: space.id, name: 'To Do', order: 0 },
            { spaceId: space.id, name: 'In Progress', order: 1 },
            { spaceId: space.id, name: 'Done', order: 2 },
          ],
        });
      }

      return space;
    });
  }

  async getSpaceById(id: string, userId: string) {
    // Verify user has access
    const member = await prisma.spaceMember.findFirst({
      where: { spaceId: id, userId },
    });

    if (!member) {
      throw new Error('Access denied');
    }

    return prisma.space.findUnique({
      where: { id },
      include: {
        owner: {
          select: { id: true, name: true, email: true },
        },
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true, avatarUrl: true },
            },
          },
        },
        columns: {
          orderBy: { order: 'asc' },
        },
        sprints: {
          where: { status: 'ACTIVE' },
          take: 1,
        },
      },
    });
  }

  async getUserSpaces(userId: string) {
    const memberships = await prisma.spaceMember.findMany({
      where: { userId },
      include: {
        space: {
          include: {
            _count: {
              select: { members: true, tasks: true },
            },
          },
        },
      },
    });

    return memberships.map(m => m.space);
  }

  async addMember(spaceId: string, userId: string, scrumRole?: ScrumRole) {
    // Verify space exists and is accessible
    const space = await prisma.space.findUnique({
      where: { id: spaceId },
    });

    if (!space) {
      throw new Error('Space not found');
    }

    return prisma.spaceMember.create({
      data: {
        spaceId,
        userId,
        scrumRole,
      },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  }
}

export const spaceService = new SpaceService();
```

## Controller Examples

### Authentication Controller

**File**: [src/controllers/auth.controller.ts](../src/controllers/auth.controller.ts)

```typescript
import { Request, Response } from 'express';
import { authService } from '../services/auth.service';
import { generateAccessToken, generateRefreshToken, blacklistToken } from '../lib/auth';
import { AuthRequest } from '../middleware/auth.middleware';

export class AuthController {
  async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password required' });
      }

      const user = await authService.validateCredentials(email, password);

      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const accessToken = generateAccessToken({
        userId: user.id,
        email: user.email,
        role: user.role,
      });

      const refreshToken = generateRefreshToken({
        userId: user.id,
        email: user.email,
        role: user.role,
      });

      // Set refresh token as httpOnly cookie
      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      });

      return res.json({
        accessToken,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
      });
    } catch (error) {
      console.error('Login error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  async logout(req: AuthRequest, res: Response) {
    try {
      const authHeader = req.headers.authorization;
      if (authHeader) {
        const token = authHeader.split(' ')[1];
        blacklistToken(token);
      }

      res.clearCookie('refreshToken');
      return res.json({ message: 'Logged out successfully' });
    } catch (error) {
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  async refreshToken(req: Request, res: Response) {
    try {
      const { refreshToken } = req.cookies;

      if (!refreshToken) {
        return res.status(401).json({ error: 'No refresh token provided' });
      }

      const decoded = verifyToken(refreshToken);
      
      const newAccessToken = generateAccessToken({
        userId: decoded.userId,
        email: decoded.email,
        role: decoded.role,
      });

      return res.json({ accessToken: newAccessToken });
    } catch (error) {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }
  }
}

export const authController = new AuthController();
```

## Data Model & Prisma Schema

### Key Entities

The database schema supports both Kanban and Scrum workflows:

```prisma
// User Management
model User {
  id          String   @id @default(cuid())
  email       String   @unique
  password    String
  name        String
  role        UserRole @default(USER)
  avatarUrl   String?
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

// Workspace/Space
model Space {
  id           String      @id @default(cuid())
  name         String
  description  String?
  methodology  Methodology
  ownerId      String
  createdAt    DateTime    @default(now())
  updatedAt    DateTime    @updatedAt
}

// Backlog Items (User Stories)
model BacklogItem {
  id            String   @id @default(cuid())
  spaceId       String
  title         String
  description   String?
  priority      Int      @default(0)
  storyPoints   Int?
  assigneeId    String?
  createdById   String
  status        String   @default("TODO")
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}

// Tasks (on Kanban board)
model Task {
  id             String   @id @default(cuid())
  backlogItemId  String
  spaceId        String
  columnId       String
  title          String
  description    String?
  assigneeId     String?
  order          Int
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
}

// Sprints (for Scrum)
model Sprint {
  id          String       @id @default(cuid())
  spaceId     String
  name        String
  startDate   DateTime
  endDate     DateTime
  status      SprintStatus @default(PLANNING)
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt
}
```

For complete schema, see [prisma/schema.prisma](../prisma/schema.prisma).

## Real-Time Features

### Socket.io Integration

**File**: [src/lib/socket.ts](../src/lib/socket.ts)

```typescript
import { Server as HTTPServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import { verifyToken } from './auth';

export function initSocket(server: HTTPServer): SocketServer {
  const io = new SocketServer(server, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:3001',
      credentials: true,
    },
  });

  // Authentication middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    
    if (!token) {
      return next(new Error('Authentication error'));
    }

    try {
      const decoded = verifyToken(token);
      socket.data.userId = decoded.userId;
      socket.data.userEmail = decoded.email;
      next();
    } catch (error) {
      next(new Error('Invalid token'));
    }
  });

  // Connection handler
  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.data.userId}`);

    // Join user's personal room
    socket.join(`user:${socket.data.userId}`);

    // Join workspace handler
    socket.on('join:workspace', (workspaceId: string) => {
      socket.join(`workspace:${workspaceId}`);
      console.log(`User ${socket.data.userId} joined workspace ${workspaceId}`);
    });

    // Leave workspace handler
    socket.on('leave:workspace', (workspaceId: string) => {
      socket.leave(`workspace:${workspaceId}`);
    });

    // Presence heartbeat
    socket.on('presence:heartbeat', (data) => {
      io.to(`workspace:${data.workspaceId}`).emit('presence:update', {
        userId: socket.data.userId,
        status: data.status,
        timestamp: new Date(),
      });
    });

    // Disconnect handler
    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.data.userId}`);
    });
  });

  return io;
}

// Helper to emit events to workspace
export function emitToWorkspace(io: SocketServer, workspaceId: string, event: string, data: any) {
  io.to(`workspace:${workspaceId}`).emit(event, data);
}

// Helper to emit events to specific user
export function emitToUser(io: SocketServer, userId: string, event: string, data: any) {
  io.to(`user:${userId}`).emit(event, data);
}
```

## Error Handling

### Centralized Error Handler

```typescript
import { Request, Response, NextFunction } from 'express';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public isOperational = true
  ) {
    super(message);
    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: err.message,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
  }

  // Unexpected errors
  console.error('Unexpected error:', err);
  return res.status(500).json({
    error: 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { message: err.message }),
  });
};

// Async handler wrapper
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
```

## Performance & Scalability

### Database Query Optimization

```typescript
// Use select to fetch only needed fields
const users = await prisma.user.findMany({
  select: { id: true, name: true, email: true },
});

// Use includes for nested data
const workspace = await prisma.space.findUnique({
  where: { id },
  include: {
    members: { include: { user: true } },
    columns: true,
  },
});

// Pagination for large datasets
const tasks = await prisma.task.findMany({
  where: { spaceId },
  take: 50,
  skip: page * 50,
  orderBy: { createdAt: 'desc' },
});

// Use transactions for atomic operations
await prisma.$transaction([
  prisma.sprint.update({ where: { id }, data: { status: 'COMPLETED' } }),
  prisma.backlogItem.updateMany({ where: { sprintId: id }, data: { status: 'COMPLETED' } }),
]);
```

### Connection Pooling

```typescript
// Configured in Prisma schema
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  connectionLimit = 10
}
```

### Caching Strategy

```typescript
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

// Cache frequently accessed data
export async function getWorkspaceWithCache(id: string) {
  const cacheKey = `workspace:${id}`;
  
  // Check cache
  const cached = await redis.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }

  // Fetch from database
  const workspace = await prisma.space.findUnique({ where: { id } });
  
  // Store in cache (5 minutes)
  await redis.setex(cacheKey, 300, JSON.stringify(workspace));
  
  return workspace;
}
```

## Testing

### Manual Testing with cURL

```bash
# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"Admin123!"}'

# Create workspace
curl -X POST http://localhost:3000/api/spaces \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Workspace","methodology":"SCRUM"}'

# Get workspaces
curl http://localhost:3000/api/spaces \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Deployment

### Environment Variables

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/apcs_db"

# JWT
JWT_SECRET="your-super-secret-key"
JWT_EXPIRES_IN="7d"

# Server
PORT=3000
NODE_ENV=production
FRONTEND_URL=https://your-frontend.com

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Firebase (for notifications)
FIREBASE_PROJECT_ID=your-project-id
```

### Docker Deployment

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

RUN npx prisma generate

EXPOSE 3000

CMD ["npm", "start"]
```

---

**A solid backend foundation enables great products** 🏗️
