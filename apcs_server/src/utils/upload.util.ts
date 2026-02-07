/**
 * Upload utility - File upload helpers
 */
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

const mkdir = promisify(fs.mkdir);
const unlink = promisify(fs.unlink);
const access = promisify(fs.access);

// Base upload directory
const UPLOAD_BASE_DIR = path.join(process.cwd(), 'uploads');

/**
 * Ensure upload directory exists
 */
export async function ensureUploadDir(subPath: string = ''): Promise<string> {
  const fullPath = path.join(UPLOAD_BASE_DIR, subPath);
  
  try {
    await access(fullPath);
  } catch {
    await mkdir(fullPath, { recursive: true });
  }
  
  return fullPath;
}

/**
 * Generate unique filename
 */
export function generateUniqueFilename(originalName: string): string {
  const ext = path.extname(originalName);
  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).substring(2, 15);
  return `${timestamp}-${randomStr}${ext}`;
}

/**
 * Delete file if exists
 */
export async function deleteFile(filePath: string): Promise<void> {
  try {
    await access(filePath);
    await unlink(filePath);
  } catch (error) {
    // File doesn't exist or can't be deleted, ignore
    console.log(`Could not delete file: ${filePath}`);
  }
}

/**
 * Get file URL path
 */
export function getFileUrl(relativePath: string): string {
  // Use environment variable for base URL, fallback to localhost
  const baseUrl = process.env.API_BASE_URL || 'http://localhost:3000';
  return `${baseUrl}/uploads/${relativePath}`;
}

/**
 * Extract relative path from full path
 */
export function getRelativePath(fullPath: string): string {
  return path.relative(UPLOAD_BASE_DIR, fullPath);
}

/**
 * Validate image file
 */
export function isValidImage(mimetype: string): boolean {
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  return validTypes.includes(mimetype);
}

/**
 * Validate file size (in bytes)
 */
export function isValidFileSize(size: number, maxSizeMB: number = 5): boolean {
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  return size <= maxSizeBytes;
}

/**
 * Get upload paths for user avatars
 */
export function getUserAvatarPath(userId: string): {
  directory: string;
  relativePath: string;
} {
  const relativePath = path.join('avatars', userId);
  return {
    directory: path.join(UPLOAD_BASE_DIR, relativePath),
    relativePath
  };
}
