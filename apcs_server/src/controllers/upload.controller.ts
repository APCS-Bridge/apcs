/**
 * Upload controller - HTTP handlers for file uploads
 */
import type { Request, Response } from 'express';
import * as uploadService from '../services/upload.service';
import fs from 'fs';

/**
 * Upload user avatar
 * PUT /api/users/:id/avatar
 * Auth: Required (user can upload their own avatar, admins can upload for others)
 */
export async function uploadUserAvatar(req: Request, res: Response) {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    // Check if user is uploading their own avatar or is an admin
    const isOwnAvatar = req.user!.userId === id;
    const isAdmin = ['SUPERADMIN', 'ADMIN'].includes(req.user!.role);

    if (!isOwnAvatar && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'You can only upload your own avatar'
      });
    }

    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    // Upload avatar
    const result = await uploadService.uploadUserAvatar(id, req.file);

    return res.status(200).json({
      success: true,
      message: 'Avatar uploaded successfully',
      data: result
    });

  } catch (error) {
    console.error('Upload avatar error:', error);
    
    // Clean up temp file if it exists
    if (req.file?.path) {
      try {
        await fs.promises.unlink(req.file.path);
      } catch (err) {
        console.error('Error cleaning up temp file:', err);
      }
    }

    if (error instanceof Error) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}

/**
 * Delete user avatar
 * DELETE /api/users/:id/avatar
 * Auth: Required (user can delete their own avatar, admins can delete others)
 */
export async function deleteUserAvatar(req: Request, res: Response) {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    // Check if user is deleting their own avatar or is an admin
    const isOwnAvatar = req.user!.userId === id;
    const isAdmin = ['SUPERADMIN', 'ADMIN'].includes(req.user!.role);

    if (!isOwnAvatar && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'You can only delete your own avatar'
      });
    }

    // Delete avatar
    await uploadService.deleteUserAvatar(id);

    return res.status(200).json({
      success: true,
      message: 'Avatar deleted successfully'
    });

  } catch (error) {
    console.error('Delete avatar error:', error);
    
    if (error instanceof Error) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}
