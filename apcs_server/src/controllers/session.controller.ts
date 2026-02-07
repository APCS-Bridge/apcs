/**
 * Session controller - Manage user context
 */
import type { Request, Response } from 'express';
import * as sessionService from '../services/session.service';

/**
 * Get current user session context
 * GET /api/session
 */
export async function getSession(req: Request, res: Response) {
  try {
    const userId = req.user!.userId;
    const session = await sessionService.getUserSession(userId);

    return res.status(200).json({
      success: true,
      data: session || {
        userId,
        spaceId: null,
        sprintId: null
      }
    });
  } catch (error) {
    console.error('Get session error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}

/**
 * Set current workspace
 * POST /api/session/workspace
 * Body: { spaceId: string }
 */
export async function setWorkspace(req: Request, res: Response) {
  try {
    const userId = req.user!.userId;
    const { spaceId } = req.body;

    if (!spaceId) {
      return res.status(400).json({
        success: false,
        message: 'spaceId is required'
      });
    }

    const session = await sessionService.setSessionWorkspace(userId, spaceId);

    return res.status(200).json({
      success: true,
      message: 'Workspace context updated',
      data: session
    });
  } catch (error) {
    console.error('Set workspace error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}

/**
 * Set current sprint
 * POST /api/session/sprint
 * Body: { sprintId: string }
 */
export async function setSprint(req: Request, res: Response) {
  try {
    const userId = req.user!.userId;
    const { sprintId } = req.body;

    const session = await sessionService.setSessionSprint(userId, sprintId);

    return res.status(200).json({
      success: true,
      message: 'Sprint context updated',
      data: session
    });
  } catch (error) {
    console.error('Set sprint error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}

/**
 * Clear user session
 * DELETE /api/session
 */
export async function clearSession(req: Request, res: Response) {
  try {
    const userId = req.user!.userId;
    await sessionService.clearSession(userId);

    return res.status(200).json({
      success: true,
      message: 'Session cleared'
    });
  } catch (error) {
    console.error('Clear session error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}