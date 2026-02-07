/**
 * Authentication controller - handles login and token management
 */
import type { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { 
  verifyPassword, 
  generateTokens, 
  verifyRefreshToken,
  type TokenPayload 
} from '../lib/auth';
import { revokeToken } from '../services/auth.service';
import jwt from 'jsonwebtoken';

/**
 * Login endpoint - authenticate user and return JWT tokens
 * POST /api/auth/login
 * Body: { email: string, password: string }
 */
export async function login(req: Request, res: Response) {
  try {
    const { email, password } = req.body;

    console.log('🔐 [LOGIN] Login attempt', { email, timestamp: new Date().toISOString() });

    // Validate input
    if (!email || !password) {
      console.warn('⚠️ [LOGIN] Missing email or password');
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    // Find user by email
    console.log('🔍 [LOGIN] Searching for user by email...', { email });
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      console.warn('⚠️ [LOGIN] User not found in database', { email });
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    console.log('✅ [LOGIN] User found', { userId: user.id, email: user.email });

    // Verify password
    console.log('🔐 [LOGIN] Verifying password...');
    const isPasswordValid = await verifyPassword(password, user.passwordHash);

    if (!isPasswordValid) {
      console.warn('⚠️ [LOGIN] Password verification failed', { email });
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    console.log('✅ [LOGIN] Password verified successfully');

    // Generate tokens
    const tokenPayload: TokenPayload = {
      userId: user.id,
      email: user.email,
      name: user.name
    };

    console.log('🔐 [LOGIN] Generating tokens...');
    const tokens = generateTokens(tokenPayload);

    console.log('✅ [LOGIN] Login successful', { userId: user.id, email: user.email });

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role
        },
        ...tokens
      }
    });

  } catch (error) {
    console.error('❌ [LOGIN] Login error:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}

/**
 * Refresh token endpoint - generate new access token using refresh token
 * POST /api/auth/refresh
 * Body: { refreshToken: string }
 */
export async function refreshToken(req: Request, res: Response) {
  try {
    const { refreshToken } = req.body;

    // Validate input
    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: 'Refresh token is required'
      });
    }

    // Verify refresh token
    let payload: TokenPayload;
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: error instanceof Error ? error.message : 'Invalid refresh token'
      });
    }

    // Verify user still exists
    const user = await prisma.user.findUnique({
      where: { id: payload.userId }
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }

    // Generate new tokens
    const tokenPayload: TokenPayload = {
      userId: user.id,
      email: user.email,
      name: user.name
    };

    const tokens = generateTokens(tokenPayload);

    return res.status(200).json({
      success: true,
      message: 'Token refreshed successfully',
      data: tokens
    });

  } catch (error) {
    console.error('Refresh token error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}

/**
 * Logout endpoint - revoke access token
 * POST /api/auth/logout
 * Auth: Required (any authenticated user)
 */
export async function logout(req: Request, res: Response) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const token = authHeader.substring(7);

    // Decode token to get expiry time
    const decoded = jwt.decode(token) as any;
    if (!decoded || !decoded.exp) {
      return res.status(400).json({
        success: false,
        message: 'Invalid token format'
      });
    }

    // Convert exp (seconds since epoch) to Date
    const expiresAt = new Date(decoded.exp * 1000);

    // Revoke the token
    await revokeToken(token, req.user!.userId, expiresAt);

    return res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });

  } catch (error) {
    console.error('Logout error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}
