/**
 * Authentication utilities for JWT and password management
 */
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { authConfig } from '../config/auth';

export interface TokenPayload {
  userId: string;
  email: string;
  name: string;
}

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number; // seconds
}

/**
 * Hash a password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(authConfig.bcryptRounds);
  return bcrypt.hash(password, salt);
}

/**
 * Verify a password against a hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Generate access token
 */
export function generateAccessToken(payload: TokenPayload): string {
  return jwt.sign(
    { ...payload, type: 'access' } as object,
    authConfig.jwtSecret as jwt.Secret,
    { expiresIn: authConfig.jwtAccessExpiry } as jwt.SignOptions
  );
}

/**
 * Generate refresh token
 */
export function generateRefreshToken(payload: TokenPayload): string {
  return jwt.sign(
    { ...payload, type: 'refresh' } as object,
    authConfig.jwtSecret as jwt.Secret,
    { expiresIn: authConfig.jwtRefreshExpiry } as jwt.SignOptions
  );
}

/**
 * Generate both access and refresh tokens
 */
export function generateTokens(payload: TokenPayload): TokenResponse {
  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);
  
  return {
    accessToken,
    refreshToken,
    tokenType: 'Bearer',
    expiresIn: 1800 // 30 minutes in seconds
  };
}

/**
 * Verify and decode access token
 */
export function verifyAccessToken(token: string): TokenPayload {
  try {
    const decoded = jwt.verify(token, authConfig.jwtSecret) as TokenPayload & { type: string };
    
    if (decoded.type !== 'access') {
      throw new Error('Invalid token type');
    }
    
    return {
      userId: decoded.userId,
      email: decoded.email,
      name: decoded.name
    };
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Token has expired');
    }
    throw new Error('Invalid token');
  }
}

/**
 * Verify and decode refresh token
 */
export function verifyRefreshToken(token: string): TokenPayload {
  try {
    const decoded = jwt.verify(token, authConfig.jwtSecret) as TokenPayload & { type: string };
    
    if (decoded.type !== 'refresh') {
      throw new Error('Invalid token type');
    }
    
    return {
      userId: decoded.userId,
      email: decoded.email,
      name: decoded.name
    };
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Refresh token has expired');
    }
    throw new Error('Invalid refresh token');
  }
}
