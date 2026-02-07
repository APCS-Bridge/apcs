/**
 * Backlog controller - Product Backlog HTTP handlers
 */
import type { Request, Response } from 'express';
import * as backlogService from '../services/backlog.service';
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
 * GET /api/spaces/:spaceId/backlog
 */
export async function getBacklog(req: Request, res: Response) {
  try {
    const spaceId = getSpaceId(req);
    if (!spaceId) {
      return res.status(400).json({ success: false, message: 'Space ID is required' });
    }
    const allowed = await ensureUserCanAccessSpace(req, res, spaceId);
    if (!allowed) return;

    const items = await backlogService.getBacklogItems(spaceId);
    return res.status(200).json({ success: true, data: items });
  } catch (error) {
    console.error('Get backlog error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

/**
 * POST /api/spaces/:spaceId/backlog
 * Body: { title: string, description?: string, assigneeId?: string }
 */
export async function createBacklogItem(req: Request, res: Response) {
  try {
    const spaceId = getSpaceId(req);
    if (!spaceId) {
      return res.status(400).json({ success: false, message: 'Space ID is required' });
    }
    const allowed = await ensureUserCanAccessSpace(req, res, spaceId);
    if (!allowed) return;

    const { title, description, assigneeId } = req.body;
    if (!title || typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({ success: false, message: 'Title is required' });
    }

    const item = await backlogService.createBacklogItem(
      spaceId,
      { title: title.trim(), description: description ?? null, assigneeId: assigneeId ?? null },
      req.user!.userId
    );
    return res.status(201).json({ success: true, data: item });
  } catch (error) {
    console.error('Create backlog item error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

/**
 * PATCH /api/spaces/:spaceId/backlog/:itemId
 * Body: { title?: string, description?: string, assigneeId?: string }
 */
export async function updateBacklogItem(req: Request, res: Response) {
  try {
    const spaceId = getSpaceId(req);
    const itemId = param(req, 'itemId');
    if (!spaceId || !itemId) {
      return res.status(400).json({ success: false, message: 'Space ID and item ID are required' });
    }
    const allowed = await ensureUserCanAccessSpace(req, res, spaceId);
    if (!allowed) return;

    const { title, description, assigneeId } = req.body;
    const data: { title?: string; description?: string | null; assigneeId?: string | null } = {};
    if (typeof title === 'string') data.title = title.trim();
    if (description !== undefined) data.description = description ?? null;
    if (assigneeId !== undefined) data.assigneeId = assigneeId ?? null;

    const item = await backlogService.updateBacklogItem(spaceId, itemId, data);
    return res.status(200).json({ success: true, data: item });
  } catch (error) {
    if (error instanceof Error && error.message === 'Backlog item not found') {
      return res.status(404).json({ success: false, message: error.message });
    }
    console.error('Update backlog item error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

/**
 * DELETE /api/spaces/:spaceId/backlog/:itemId
 */
export async function deleteBacklogItem(req: Request, res: Response) {
  try {
    const spaceId = getSpaceId(req);
    const itemId = param(req, 'itemId');
    if (!spaceId || !itemId) {
      return res.status(400).json({ success: false, message: 'Space ID and item ID are required' });
    }
    const allowed = await ensureUserCanAccessSpace(req, res, spaceId);
    if (!allowed) return;

    await backlogService.deleteBacklogItem(spaceId, itemId);
    return res.status(200).json({ success: true, message: 'Deleted' });
  } catch (error) {
    if (error instanceof Error && error.message === 'Backlog item not found') {
      return res.status(404).json({ success: false, message: error.message });
    }
    console.error('Delete backlog item error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

/**
 * PATCH /api/spaces/:spaceId/backlog/reorder
 * Body: { itemIds: string[] } — ordered list of backlog item ids
 */
export async function reorderBacklog(req: Request, res: Response) {
  try {
    const spaceId = getSpaceId(req);
    if (!spaceId) {
      return res.status(400).json({ success: false, message: 'Space ID is required' });
    }
    const allowed = await ensureUserCanAccessSpace(req, res, spaceId);
    if (!allowed) return;

    const { itemIds } = req.body;
    if (!Array.isArray(itemIds) || itemIds.some((id: unknown) => typeof id !== 'string')) {
      return res.status(400).json({ success: false, message: 'itemIds must be an array of strings' });
    }

    const items = await backlogService.reorderBacklogItems(spaceId, itemIds);
    return res.status(200).json({ success: true, data: items });
  } catch (error) {
    if (error instanceof Error && error.message.includes('Reorder must include')) {
      return res.status(400).json({ success: false, message: error.message });
    }
    console.error('Reorder backlog error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

