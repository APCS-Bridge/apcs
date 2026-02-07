/**
 * Upload service - Business logic for file uploads
 */
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import {
  ensureUploadDir,
  generateUniqueFilename,
  deleteFile,
  getFileUrl,
  getRelativePath,
  isValidImage,
  isValidFileSize,
  getUserAvatarPath
} from '../utils/upload.util';
import prisma from '../lib/prisma';

const readdir = promisify(fs.readdir);

export interface UploadResult {
  filename: string;
  filepath: string;
  url: string;
  size: number;
  mimetype: string;
}

/**
 * Upload user avatar
 */
export async function uploadUserAvatar(
  userId: string,
  file: Express.Multer.File
): Promise<{ avatarUrl: string }> {
  // Validate file type
  if (!isValidImage(file.mimetype)) {
    throw new Error('Invalid file type. Only images are allowed (JPEG, PNG, GIF, WebP)');
  }

  // Validate file size (5MB max)
  if (!isValidFileSize(file.size, 5)) {
    throw new Error('File size exceeds 5MB limit');
  }

  // Get user avatar path
  const { directory, relativePath } = getUserAvatarPath(userId);
  
  // Ensure directory exists
  await ensureUploadDir(relativePath);

  // Delete old avatar if exists
  try {
    const files = await readdir(directory);
    for (const oldFile of files) {
      const oldFilePath = path.join(directory, oldFile);
      await deleteFile(oldFilePath);
    }
  } catch (error) {
    // Directory might not exist yet, ignore
  }

  // Generate unique filename
  const filename = generateUniqueFilename(file.originalname);
  const filepath = path.join(directory, filename);

  // Move file to destination
  await fs.promises.rename(file.path, filepath);

  // Generate URL
  const avatarUrl = getFileUrl(path.join(relativePath, filename));

  // Update user in database
  await prisma.user.update({
    where: { id: userId },
    data: { avatarUrl }
  });

  return { avatarUrl };
}

/**
 * Delete user avatar
 */
export async function deleteUserAvatar(userId: string): Promise<void> {
  // Get user to find avatar path
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { avatarUrl: true }
  });

  if (!user || !user.avatarUrl) {
    return;
  }

  // Get user avatar directory
  const { directory } = getUserAvatarPath(userId);

  // Delete all files in directory
  try {
    const files = await readdir(directory);
    for (const file of files) {
      const filepath = path.join(directory, file);
      await deleteFile(filepath);
    }
  } catch (error) {
    console.error('Error deleting avatar files:', error);
  }

  // Update user in database
  await prisma.user.update({
    where: { id: userId },
    data: { avatarUrl: null }
  });
}
