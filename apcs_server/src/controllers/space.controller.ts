/**
 * Space controller - HTTP handlers for workspace management
 */
import type { Request, Response } from 'express';
import * as spaceService from '../services/space.service';
import type { Methodology } from '@prisma/client';

/**
 * Create a new workspace
 * POST /api/spaces
 * Body: { name: string, methodology: 'KANBAN' | 'SCRUM', ownerId?: string }
 * Auth: Required (Any authenticated user)
 */
export async function createSpace(req: Request, res: Response) {
  try {
    const { name, methodology, ownerId } = req.body;

    // Validate input
    if (!name || !methodology) {
      return res.status(400).json({
        success: false,
        message: 'Name and methodology are required'
      });
    }

    // Validate methodology
    if (!['KANBAN', 'SCRUM'].includes(methodology)) {
      return res.status(400).json({
        success: false,
        message: 'Methodology must be either KANBAN or SCRUM'
      });
    }

    // Use current user as owner (users create their own spaces)
    const finalOwnerId = req.user!.userId;

    // Create space
    const space = await spaceService.createSpace({
      name,
      methodology: methodology as Methodology,
      ownerId: finalOwnerId
    });

    return res.status(201).json({
      success: true,
      message: 'Space created successfully',
      data: space
    });

  } catch (error) {
    console.error('Create space error:', error);
    
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
 * Get all spaces
 * GET /api/spaces
 * Query: page, limit
 * Auth: Required (SUPERADMIN or ADMIN)
 */
export async function getAllSpaces(req: Request, res: Response) {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    const result = await spaceService.getAllSpaces(page, limit);

    return res.status(200).json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Get spaces error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}

/**
 * Get space by ID
 * GET /api/spaces/:id
 * Auth: Required (SUPERADMIN, ADMIN, or space member)
 */
export async function getSpaceById(req: Request, res: Response) {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Space ID is required'
      });
    }

    const space = await spaceService.getSpaceById(id);

    if (!space) {
      return res.status(404).json({
        success: false,
        message: 'Space not found'
      });
    }

    return res.status(200).json({
      success: true,
      data: space
    });

  } catch (error) {
    console.error('Get space error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}

/**
 * Get current user's spaces
 * GET /api/spaces/my
 * Auth: Required (Any authenticated user)
 */
export async function getMySpaces(req: Request, res: Response) {
  try {
    const spaces = await spaceService.getUserSpaces(req.user!.userId);

    return res.status(200).json({
      success: true,
      data: spaces
    });

  } catch (error) {
    console.error('Get my spaces error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}

const GITHUB_REPO_URL_REGEX =
  /^https:\/\/(?:www\.)?github\.com\/[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+(?:\/)?(?:\.git)?$/i;

function isValidGitHubRepoUrl(url: string): boolean {
  return GITHUB_REPO_URL_REGEX.test(url.trim());
}

/**
 * Update space
 * PATCH /api/spaces/:id
 * Body: { name?: string, methodology?: 'KANBAN' | 'SCRUM', gitRepoUrl?: string | null }
 * Auth: Required (SUPERADMIN, ADMIN, or space owner)
 */
export async function updateSpace(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { name, methodology, gitRepoUrl } = req.body;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Space ID is required'
      });
    }

    if (name === undefined && methodology === undefined && gitRepoUrl === undefined) {
      return res.status(400).json({
        success: false,
        message: 'At least one field (name, methodology, or gitRepoUrl) is required'
      });
    }

    // Validate methodology if provided
    if (methodology && !['KANBAN', 'SCRUM'].includes(methodology)) {
      return res.status(400).json({
        success: false,
        message: 'Methodology must be either KANBAN or SCRUM'
      });
    }

    // Validate gitRepoUrl if provided (null or empty string = unlink)
    if (gitRepoUrl !== undefined && gitRepoUrl !== null && gitRepoUrl !== '') {
      if (typeof gitRepoUrl !== 'string' || !isValidGitHubRepoUrl(gitRepoUrl)) {
        return res.status(400).json({
          success: false,
          message: 'gitRepoUrl must be a valid GitHub repo URL (e.g. https://github.com/owner/repo)'
        });
      }
    }

    // Check if space exists and user has permission
    const existingSpace = await spaceService.getSpaceById(id);
    if (!existingSpace) {
      return res.status(404).json({
        success: false,
        message: 'Space not found'
      });
    }

    // Only space owner, ADMIN (if owner), or SUPERADMIN can update
    if (
      req.user!.role !== 'SUPERADMIN' &&
      existingSpace.ownerId !== req.user!.userId
    ) {
      return res.status(403).json({
        success: false,
        message: 'Only space owner or SUPERADMIN can update this space'
      });
    }

    const updateData: {
      name?: string;
      methodology?: Methodology;
      gitRepoUrl?: string | null;
    } = {};
    if (name !== undefined) updateData.name = name;
    if (methodology !== undefined) updateData.methodology = methodology as Methodology;
    if (gitRepoUrl !== undefined) updateData.gitRepoUrl = gitRepoUrl === '' ? null : gitRepoUrl;

    const space = await spaceService.updateSpace(id, updateData);

    return res.status(200).json({
      success: true,
      message: 'Space updated successfully',
      data: space
    });

  } catch (error) {
    console.error('Update space error:', error);
    
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
 * Delete space
 * DELETE /api/spaces/:id
 * Auth: Required (SUPERADMIN or space owner)
 */
export async function deleteSpace(req: Request, res: Response) {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Space ID is required'
      });
    }

    // Check if space exists and user has permission
    const existingSpace = await spaceService.getSpaceById(id);
    if (!existingSpace) {
      return res.status(404).json({
        success: false,
        message: 'Space not found'
      });
    }

    // Only space owner or SUPERADMIN can delete
    if (
      req.user!.role !== 'SUPERADMIN' &&
      existingSpace.ownerId !== req.user!.userId
    ) {
      return res.status(403).json({
        success: false,
        message: 'Only space owner or SUPERADMIN can delete this space'
      });
    }

    await spaceService.deleteSpace(id);

    return res.status(200).json({
      success: true,
      message: 'Space deleted successfully'
    });

  } catch (error) {
    console.error('Delete space error:', error);
    
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
