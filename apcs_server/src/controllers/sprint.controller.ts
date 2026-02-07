/**
 * Sprint controller - handles sprint management for Scrum Masters
 */
import type { Request, Response } from 'express';
import * as sprintService from '../services/sprint.service';
import { SprintStatus } from '@prisma/client';

/**
 * Create a sprint
 * POST /api/spaces/:spaceId/sprints
 * Auth: Required (Scrum Master only)
 */
export async function createSprint(req: Request, res: Response) {
  try {
    const { spaceId } = req.params;
    const { name, goal, startDate, endDate } = req.body;

    if (!spaceId) {
      return res.status(400).json({
        success: false,
        message: 'Space ID is required'
      });
    }

    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Sprint name is required'
      });
    }

    const sprintData: any = { name };
    if (goal !== undefined) sprintData.goal = goal;
    if (startDate) sprintData.startDate = new Date(startDate);
    if (endDate) sprintData.endDate = new Date(endDate);

    const sprint = await sprintService.createSprint(
      spaceId,
      req.user!.userId,
      sprintData
    );

    return res.status(201).json({
      success: true,
      message: 'Sprint created successfully',
      data: sprint
    });

  } catch (error) {
    console.error('Create sprint error:', error);
    
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
 * Get all sprints for a space
 * GET /api/spaces/:spaceId/sprints
 * Auth: Required (Space member)
 */
export async function getSpaceSprints(req: Request, res: Response) {
  try {
    const { spaceId } = req.params;

    if (!spaceId) {
      return res.status(400).json({
        success: false,
        message: 'Space ID is required'
      });
    }

    const sprints = await sprintService.getSpaceSprints(
      spaceId,
      req.user!.userId
    );

    return res.status(200).json({
      success: true,
      data: sprints
    });

  } catch (error) {
    console.error('Get sprints error:', error);
    
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
 * Get active sprint for a space
 * GET /api/spaces/:spaceId/sprints/active
 * Auth: Required (Space member)
 */
export async function getActiveSprint(req: Request, res: Response) {
  try {
    const { spaceId } = req.params;

    if (!spaceId) {
      return res.status(400).json({
        success: false,
        message: 'Space ID is required'
      });
    }

    const sprint = await sprintService.getActiveSprint(
      spaceId,
      req.user!.userId
    );

    if (!sprint) {
      return res.status(404).json({
        success: false,
        message: 'No active sprint found'
      });
    }

    return res.status(200).json({
      success: true,
      data: sprint
    });

  } catch (error) {
    console.error('Get active sprint error:', error);
    
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
 * Get sprint by ID
 * GET /api/sprints/:id
 * Auth: Required (Space member)
 */
export async function getSprintById(req: Request, res: Response) {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Sprint ID is required'
      });
    }

    const sprint = await sprintService.getSprintById(
      id,
      req.user!.userId
    );

    return res.status(200).json({
      success: true,
      data: sprint
    });

  } catch (error) {
    console.error('Get sprint error:', error);
    
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
 * Update sprint
 * PATCH /api/sprints/:id
 * Auth: Required (Scrum Master only)
 */
export async function updateSprint(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { name, goal, startDate, endDate } = req.body;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Sprint ID is required'
      });
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (goal !== undefined) updateData.goal = goal;
    if (startDate !== undefined) updateData.startDate = new Date(startDate);
    if (endDate !== undefined) updateData.endDate = new Date(endDate);

    const sprint = await sprintService.updateSprint(
      id,
      req.user!.userId,
      updateData
    );

    return res.status(200).json({
      success: true,
      message: 'Sprint updated successfully',
      data: sprint
    });

  } catch (error) {
    console.error('Update sprint error:', error);
    
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
 * Update sprint status
 * PATCH /api/sprints/:id/status
 * Auth: Required (Scrum Master only)
 */
export async function updateSprintStatus(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Sprint ID is required'
      });
    }

    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Status is required'
      });
    }

    if (!Object.values(SprintStatus).includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be PLANNING, ACTIVE, or COMPLETED'
      });
    }

    const sprint = await sprintService.updateSprintStatus(
      id,
      req.user!.userId,
      status
    );

    return res.status(200).json({
      success: true,
      message: 'Sprint status updated successfully',
      data: sprint
    });

  } catch (error) {
    console.error('Update sprint status error:', error);
    
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
 * Delete sprint
 * DELETE /api/sprints/:id
 * Auth: Required (Scrum Master only)
 */
export async function deleteSprint(req: Request, res: Response) {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Sprint ID is required'
      });
    }

    await sprintService.deleteSprint(id, req.user!.userId);

    return res.status(200).json({
      success: true,
      message: 'Sprint deleted successfully'
    });

  } catch (error) {
    console.error('Delete sprint error:', error);
    
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
