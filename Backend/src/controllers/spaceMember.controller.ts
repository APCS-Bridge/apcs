/**
 * Space Member controller - HTTP handlers for space member management
 */
import type { Request, Response } from 'express';
import * as spaceService from '../services/space.service';
import type { ScrumRole } from '@prisma/client';

/**
 * Add member to space
 * POST /api/spaces/:spaceId/members
 * Body: { userId: string, scrumRole?: 'PRODUCT_OWNER' | 'SCRUM_MASTER' | 'DEVELOPER' }
 * Auth: Required (SUPERADMIN, ADMIN, or space owner)
 */
export async function addMember(req: Request, res: Response) {
  try {
    const { spaceId } = req.params;
    const { userId, scrumRole } = req.body;

    if (!spaceId) {
      return res.status(400).json({
        success: false,
        message: 'Space ID is required'
      });
    }

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    // Validate scrumRole if provided
    if (scrumRole && !['PRODUCT_OWNER', 'SCRUM_MASTER', 'DEVELOPER'].includes(scrumRole)) {
      return res.status(400).json({
        success: false,
        message: 'Scrum role must be PRODUCT_OWNER, SCRUM_MASTER, or DEVELOPER'
      });
    }

    // Check if user has permission (space owner, ADMIN, or SUPERADMIN)
    const space = await spaceService.getSpaceById(spaceId);
    if (!space) {
      return res.status(404).json({
        success: false,
        message: 'Space not found'
      });
    }

    if (
      req.user!.role !== 'SUPERADMIN' &&
      req.user!.role !== 'ADMIN' &&
      space.ownerId !== req.user!.userId
    ) {
      return res.status(403).json({
        success: false,
        message: 'Only space owner, ADMIN, or SUPERADMIN can add members'
      });
    }

    const member = await spaceService.addSpaceMember(
      spaceId,
      userId,
      scrumRole as ScrumRole | undefined
    );

    return res.status(201).json({
      success: true,
      message: 'Member added successfully',
      data: member
    });

  } catch (error) {
    console.error('Add member error:', error);
    
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
 * Get all members of a space
 * GET /api/spaces/:spaceId/members
 * Auth: Required (Any authenticated user)
 */
export async function getMembers(req: Request, res: Response) {
  try {
    const { spaceId } = req.params;

    if (!spaceId) {
      return res.status(400).json({
        success: false,
        message: 'Space ID is required'
      });
    }

    const members = await spaceService.getSpaceMembers(spaceId);

    return res.status(200).json({
      success: true,
      data: members
    });

  } catch (error) {
    console.error('Get members error:', error);
    
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
 * Remove member from space
 * DELETE /api/spaces/:spaceId/members/:userId
 * Auth: Required (SUPERADMIN, ADMIN, or space owner)
 */
export async function removeMember(req: Request, res: Response) {
  try {
    const { spaceId, userId } = req.params;

    if (!spaceId || !userId) {
      return res.status(400).json({
        success: false,
        message: 'Space ID and User ID are required'
      });
    }

    // Check if user has permission
    const space = await spaceService.getSpaceById(spaceId);
    if (!space) {
      return res.status(404).json({
        success: false,
        message: 'Space not found'
      });
    }

    if (
      req.user!.role !== 'SUPERADMIN' &&
      req.user!.role !== 'ADMIN' &&
      space.ownerId !== req.user!.userId
    ) {
      return res.status(403).json({
        success: false,
        message: 'Only space owner, ADMIN, or SUPERADMIN can remove members'
      });
    }

    await spaceService.removeSpaceMember(spaceId, userId);

    return res.status(200).json({
      success: true,
      message: 'Member removed successfully'
    });

  } catch (error) {
    console.error('Remove member error:', error);
    
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
 * Update member's Scrum role
 * PATCH /api/spaces/:spaceId/members/:userId
 * Body: { scrumRole: 'PRODUCT_OWNER' | 'SCRUM_MASTER' | 'DEVELOPER' }
 * Auth: Required (SUPERADMIN, ADMIN, or space owner)
 */
export async function updateMemberRole(req: Request, res: Response) {
  try {
    const { spaceId, userId } = req.params;
    const { scrumRole } = req.body;

    if (!spaceId || !userId) {
      return res.status(400).json({
        success: false,
        message: 'Space ID and User ID are required'
      });
    }

    if (!scrumRole || !['PRODUCT_OWNER', 'SCRUM_MASTER', 'DEVELOPER'].includes(scrumRole)) {
      return res.status(400).json({
        success: false,
        message: 'Valid Scrum role is required (PRODUCT_OWNER, SCRUM_MASTER, or DEVELOPER)'
      });
    }

    // Check if user has permission
    const space = await spaceService.getSpaceById(spaceId);
    if (!space) {
      return res.status(404).json({
        success: false,
        message: 'Space not found'
      });
    }

    if (
      req.user!.role !== 'SUPERADMIN' &&
      req.user!.role !== 'ADMIN' &&
      space.ownerId !== req.user!.userId
    ) {
      return res.status(403).json({
        success: false,
        message: 'Only space owner, ADMIN, or SUPERADMIN can update member roles'
      });
    }

    const member = await spaceService.updateMemberRole(
      spaceId,
      userId,
      scrumRole as ScrumRole
    );

    return res.status(200).json({
      success: true,
      message: 'Member role updated successfully',
      data: member
    });

  } catch (error) {
    console.error('Update member role error:', error);
    
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
