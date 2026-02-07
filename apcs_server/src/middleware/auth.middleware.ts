/**
 * Authentication middleware
 */
import type { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../lib/auth';
import prisma from '../lib/prisma';
import type { UserRole } from '@prisma/client';
import { isTokenRevoked } from '../services/auth.service';

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        email: string;
        name: string;
        role: UserRole;
      };
    }
  }
}

/**
 * Middleware to verify JWT token
 */
export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    console.log('🔐 [AUTH] Request received', { hasAuth: !!authHeader });

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.warn('⚠️ [AUTH] No Bearer token provided');
      res.status(401).json({
        success: false,
        message: 'No token provided'
      });
      return;
    }

    const token = authHeader.substring(7);
    console.log('🔐 [AUTH] Token extracted, checking revocation...');

    // Check if token is revoked
    const revoked = await isTokenRevoked(token);
    if (revoked) {
      console.warn('⚠️ [AUTH] Token has been revoked');
      res.status(401).json({
        success: false,
        message: 'Token has been revoked'
      });
      return;
    }

    console.log('🔐 [AUTH] Token valid, verifying...');

    // Verify token
    let payload;
    try {
      payload = verifyAccessToken(token);
      console.log('✅ [AUTH] Token verified', { userId: payload.userId });
    } catch (error) {
      console.error('❌ [AUTH] Token verification failed', { error: error instanceof Error ? error.message : 'Unknown error' });
      res.status(401).json({
        success: false,
        message: error instanceof Error ? error.message : 'Invalid token'
      });
      return;
    }

    console.log('🔐 [AUTH] Fetching user from database...', { userId: payload.userId });

    // Get user from database to ensure they still exist and get current role
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true
      }
    });

    console.log('✅ [AUTH] User lookup complete', { found: !!user, userId: payload.userId });

    if (!user) {
      console.warn('⚠️ [AUTH] User not found in database', { userId: payload.userId });
      res.status(401).json({
        success: false,
        message: 'User not found'
      });
      return;
    }

    // Attach user to request
    req.user = {
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role
    };

    console.log('✅ [AUTH] User attached to request, proceeding...');
    next();
  } catch (error) {
    console.error('❌ [AUTH] Authentication error:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}

/**
 * Middleware to check if user has required role
 */
export function authorize(...allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Not authenticated'
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: 'Insufficient permissions'
      });
      return;
    }

    next();
  };
}
