/**
 * Board controller - Kanban/Scrum board HTTP handlers
 */
import type { Request, Response } from 'express';
import * as boardService from '../services/board.service';
import prisma from '../lib/prisma';

async function ensureUserCanAccessSpace(
  req: Request,
  res: Response,
  spaceId: string
): Promise<boolean> {
  if (req.user!.role === 'SUPERADMIN' || req.user!.role === 'ADMIN') {
    return true;
  }
  const space = await prisma.space.findUnique({
    where: { id: spaceId },
    select: { ownerId: true, members: { where: { userId: req.user!.userId }, select: { id: true } } },
  });
  if (!space) {
    res.status(404).json({ success: false, message: 'Space not found' });
    return false;
  }
  if (space.ownerId === req.user!.userId || space.members.length > 0) {
    return true;
  }
  res.status(403).json({ success: false, message: 'You do not have access to this space' });
  return false;
}

function getSpaceId(req: Request): string {
  const p = req.params.spaceId;
  return Array.isArray(p) ? p[0] ?? '' : p ?? '';
}

function param(req: Request, key: string): string {
  const p = req.params[key];
  return Array.isArray(p) ? p[0] ?? '' : (p ?? '');
}

/**
 * GET /api/spaces/:spaceId/board?sprintId=xxx (optional, for SCRUM)
 */
export async function getBoard(req: Request, res: Response) {
  try {
    const spaceId = getSpaceId(req);
    const sprintId = (req.query.sprintId as string) || null;
    if (!spaceId) {
      return res.status(400).json({ success: false, message: 'Space ID is required' });
    }
    const allowed = await ensureUserCanAccessSpace(req, res, spaceId);
    if (!allowed) return;

    const board = await boardService.getBoard(spaceId, sprintId);
    return res.status(200).json({ success: true, data: board });
  } catch (error) {
    console.error('Get board error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

/**
 * POST /api/spaces/:spaceId/board/cards
 * Body: { columnId: string, title: string, description?: string, assigneeId?: string, sprintId?: string }
 */
export async function createCard(req: Request, res: Response) {
  try {
    const spaceId = getSpaceId(req);
    if (!spaceId) {
      return res.status(400).json({ success: false, message: 'Space ID is required' });
    }
    const allowed = await ensureUserCanAccessSpace(req, res, spaceId);
    if (!allowed) return;

    const { columnId, title, description, assigneeId, sprintId } = req.body;
    if (!columnId || !title || typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({ success: false, message: 'columnId and title are required' });
    }

    const card = await boardService.createCard(
      spaceId,
      columnId,
      { title: title.trim(), description: description ?? null, assigneeId: assigneeId ?? null },
      req.user!.userId,
      sprintId ?? null
    );
    return res.status(201).json({ success: true, data: card });
  } catch (error) {
    if (error instanceof Error && error.message === 'Column not found') {
      return res.status(404).json({ success: false, message: error.message });
    }
    console.error('Create card error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

/**
 * PATCH /api/spaces/:spaceId/board/cards/:taskId
 * Body: { title?: string, description?: string, assigneeId?: string }
 */
export async function updateCard(req: Request, res: Response) {
  try {
    const spaceId = getSpaceId(req);
    const taskId = param(req, 'taskId');
    if (!spaceId || !taskId) {
      return res.status(400).json({ success: false, message: 'Space ID and task ID are required' });
    }
    const allowed = await ensureUserCanAccessSpace(req, res, spaceId);
    if (!allowed) return;

    const { title, description, assigneeId } = req.body;
    const data: { title?: string; description?: string | null; assigneeId?: string | null } = {};
    if (typeof title === 'string') data.title = title.trim();
    if (description !== undefined) data.description = description ?? null;
    if (assigneeId !== undefined) data.assigneeId = assigneeId ?? null;

    const card = await boardService.updateCard(spaceId, taskId, data);
    return res.status(200).json({ success: true, data: card });
  } catch (error) {
    if (error instanceof Error && (error.message === 'Task not found' || error.message === 'Backlog item not found')) {
      return res.status(404).json({ success: false, message: error.message });
    }
    console.error('Update card error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

/**
 * PATCH /api/spaces/:spaceId/board/cards/:taskId/move
 * Body: { columnId: string, position: number }
 */
export async function moveCard(req: Request, res: Response) {
  try {
    const spaceId = getSpaceId(req);
    const taskId = param(req, 'taskId');
    const { columnId, position } = req.body;
    if (!spaceId || !taskId || !columnId || typeof position !== 'number') {
      return res.status(400).json({ success: false, message: 'Space ID, task ID, columnId and position are required' });
    }
    const allowed = await ensureUserCanAccessSpace(req, res, spaceId);
    if (!allowed) return;

    await boardService.moveCard(spaceId, taskId, columnId, position);
    return res.status(200).json({ success: true, message: 'Moved' });
  } catch (error) {
    if (error instanceof Error && (error.message === 'Task not found' || error.message === 'Column not found' || error.message === 'Card not found on board')) {
      return res.status(404).json({ success: false, message: error.message });
    }
    console.error('Move card error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

/**
 * DELETE /api/spaces/:spaceId/board/cards/:taskId
 */
export async function deleteCard(req: Request, res: Response) {
  try {
    const spaceId = getSpaceId(req);
    const taskId = param(req, 'taskId');
    if (!spaceId || !taskId) {
      return res.status(400).json({ success: false, message: 'Space ID and task ID are required' });
    }
    const allowed = await ensureUserCanAccessSpace(req, res, spaceId);
    if (!allowed) return;

    await boardService.deleteCard(spaceId, taskId);
    return res.status(200).json({ success: true, message: 'Deleted' });
  } catch (error) {
    if (error instanceof Error && error.message === 'Task not found') {
      return res.status(404).json({ success: false, message: error.message });
    }
    console.error('Delete card error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

/**
 * POST /api/spaces/:spaceId/board/columns
 * Body: { name: string, wipLimit?: number, sprintId?: string }
 */
export async function addColumn(req: Request, res: Response) {
  try {
    const spaceId = getSpaceId(req);
    if (!spaceId) {
      return res.status(400).json({ success: false, message: 'Space ID is required' });
    }
    const allowed = await ensureUserCanAccessSpace(req, res, spaceId);
    if (!allowed) return;

    const { name, wipLimit, sprintId } = req.body;
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ success: false, message: 'name is required' });
    }

    const column = await boardService.addColumn(spaceId, name.trim(), wipLimit ?? null, sprintId ?? null);
    return res.status(201).json({ success: true, data: column });
  } catch (error) {
    console.error('Add column error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

/**
 * PATCH /api/spaces/:spaceId/board/columns/:columnId
 * Body: { name: string, sprintId?: string }
 */
export async function renameColumn(req: Request, res: Response) {
  try {
    const spaceId = getSpaceId(req);
    const columnId = param(req, 'columnId');
    const { name, sprintId } = req.body;
    if (!spaceId || !columnId || !name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Space ID, column ID and name are required' });
    }
    const allowed = await ensureUserCanAccessSpace(req, res, spaceId);
    if (!allowed) return;

    await boardService.renameColumn(spaceId, columnId, name.trim(), sprintId ?? null);
    return res.status(200).json({ success: true, message: 'Renamed' });
  } catch (error) {
    if (error instanceof Error && error.message === 'Column not found') {
      return res.status(404).json({ success: false, message: error.message });
    }
    console.error('Rename column error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

/**
 * DELETE /api/spaces/:spaceId/board/columns/:columnId?sprintId=xxx (optional)
 */
export async function removeColumn(req: Request, res: Response) {
  try {
    const spaceId = getSpaceId(req);
    const columnId = param(req, 'columnId');
    const sprintId = (req.query.sprintId as string) || null;
    if (!spaceId || !columnId) {
      return res.status(400).json({ success: false, message: 'Space ID and column ID are required' });
    }
    const allowed = await ensureUserCanAccessSpace(req, res, spaceId);
    if (!allowed) return;

    await boardService.removeColumn(spaceId, columnId, sprintId);
    return res.status(200).json({ success: true, message: 'Deleted' });
  } catch (error) {
    if (error instanceof Error && error.message === 'Column not found') {
      return res.status(404).json({ success: false, message: error.message });
    }
    console.error('Remove column error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

