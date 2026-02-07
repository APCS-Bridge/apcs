/**
 * Git controller - GitHub repo proxy for workspace (read-only)
 */
import type { Request, Response } from 'express';
import * as gitService from '../services/git.service';
import * as spaceService from '../services/space.service';
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

/**
 * GET /api/spaces/:spaceId/git
 * Return git link info (gitRepoUrl, owner, repo).
 */
function getSpaceId(req: Request): string {
  const p = req.params.spaceId;
  return Array.isArray(p) ? p[0] ?? '' : p ?? '';
}

export async function getGitInfo(req: Request, res: Response) {
  try {
    const spaceId = getSpaceId(req);
    if (!spaceId) {
      return res.status(400).json({ success: false, message: 'Space ID is required' });
    }
    const allowed = await ensureUserCanAccessSpace(req, res, spaceId);
    if (!allowed) return;

    const info = await gitService.getGitInfo(spaceId);
    return res.status(200).json({ success: true, data: info });
  } catch (error) {
    console.error('Get git info error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

/**
 * PATCH /api/spaces/:spaceId/git
 * Body: { gitRepoUrl: string | null }
 * Update workspace Git link (validates GitHub URL). Only SUPERADMIN or ADMIN.
 */
export async function updateGitLink(req: Request, res: Response) {
  try {
    const spaceId = getSpaceId(req);
    const { gitRepoUrl } = req.body;
    if (!spaceId) {
      return res.status(400).json({ success: false, message: 'Space ID is required' });
    }

    const space = await spaceService.getSpaceById(spaceId);
    if (!space) {
      return res.status(404).json({ success: false, message: 'Space not found' });
    }
    if (req.user!.role !== 'SUPERADMIN' && req.user!.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Only admins (SUPERADMIN or ADMIN) can link or unlink the GitHub repository',
      });
    }

    const value =
      gitRepoUrl === undefined
        ? undefined
        : gitRepoUrl === null || gitRepoUrl === ''
          ? null
          : gitRepoUrl;
    if (value !== undefined && value !== null && typeof value === 'string') {
      if (!gitService.parseGitHubRepoUrl(value)) {
        return res.status(400).json({
          success: false,
          message: 'gitRepoUrl must be a valid GitHub repo URL (e.g. https://github.com/owner/repo)',
        });
      }
    }

    const updated = await spaceService.updateSpace(spaceId, {
      gitRepoUrl: value === undefined ? undefined : value,
    });
    return res.status(200).json({
      success: true,
      message: 'Git link updated',
      data: {
        gitRepoUrl: updated.gitRepoUrl,
        owner: updated.gitRepoUrl ? (gitService.parseGitHubRepoUrl(updated.gitRepoUrl)?.owner ?? null) : null,
        repo: updated.gitRepoUrl ? (gitService.parseGitHubRepoUrl(updated.gitRepoUrl)?.repo ?? null) : null,
      },
    });
  } catch (error) {
    console.error('Update git link error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

/**
 * GET /api/spaces/:spaceId/git/branches
 */
export async function getBranches(req: Request, res: Response) {
  try {
    const spaceId = getSpaceId(req);
    if (!spaceId) {
      return res.status(400).json({ success: false, message: 'Space ID is required' });
    }
    const allowed = await ensureUserCanAccessSpace(req, res, spaceId);
    if (!allowed) return;

    const branches = await gitService.getBranches(spaceId);
    return res.status(200).json({ success: true, data: branches });
  } catch (error) {
    console.error('Get branches error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

/**
 * GET /api/spaces/:spaceId/git/commits?branch=main&per_page=20
 */
export async function getCommits(req: Request, res: Response) {
  try {
    const spaceId = getSpaceId(req);
    const branch = (req.query.branch as string) || undefined;
    const perPage = Math.min(parseInt((req.query.per_page as string) || '20', 10) || 20, 100);
    if (!spaceId) {
      return res.status(400).json({ success: false, message: 'Space ID is required' });
    }
    const allowed = await ensureUserCanAccessSpace(req, res, spaceId);
    if (!allowed) return;

    const commits = await gitService.getCommits(spaceId, branch, perPage);
    return res.status(200).json({ success: true, data: commits });
  } catch (error) {
    console.error('Get commits error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

/**
 * GET /api/spaces/:spaceId/git/commits/:sha
 * Single commit with file patches.
 */
export async function getCommitDetail(req: Request, res: Response) {
  try {
    const spaceId = getSpaceId(req);
    const sha = (req.params as { sha?: string }).sha;
    if (!spaceId || !sha) {
      return res.status(400).json({ success: false, message: 'Space ID and commit SHA are required' });
    }
    const allowed = await ensureUserCanAccessSpace(req, res, spaceId);
    if (!allowed) return;

    const detail = await gitService.getCommitDetail(spaceId, sha);
    if (!detail) {
      return res.status(404).json({ success: false, message: 'Commit not found' });
    }
    return res.status(200).json({ success: true, data: detail });
  } catch (error) {
    console.error('Get commit detail error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

/**
 * GET /api/spaces/:spaceId/git/pulls
 */
export async function getPulls(req: Request, res: Response) {
  try {
    const spaceId = getSpaceId(req);
    if (!spaceId) {
      return res.status(400).json({ success: false, message: 'Space ID is required' });
    }
    const allowed = await ensureUserCanAccessSpace(req, res, spaceId);
    if (!allowed) return;

    const pulls = await gitService.getPulls(spaceId);
    return res.status(200).json({ success: true, data: pulls });
  } catch (error) {
    console.error('Get pulls error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

