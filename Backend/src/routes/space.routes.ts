/**
 * Space (Workspace) routes
 */
import { Router } from 'express';
import * as spaceController from '../controllers/space.controller';
import * as spaceMemberController from '../controllers/spaceMember.controller';
import * as gitController from '../controllers/git.controller';
import * as backlogController from '../controllers/backlog.controller';
import * as boardController from '../controllers/board.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();

// All space routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/spaces/my
 * @desc    Get current user's spaces (owned or member of)
 * @access  Private (Any authenticated user)
 */
router.get('/my', spaceController.getMySpaces);

/**
 * @route   POST /api/spaces
 * @desc    Create a new workspace
 * @access  Private (Any authenticated user)
 */
router.post('/', spaceController.createSpace);

/**
 * @route   GET /api/spaces
 * @desc    Get all spaces (with pagination)
 * @access  Private (SUPERADMIN or ADMIN)
 */
router.get('/', authorize('SUPERADMIN', 'ADMIN'), spaceController.getAllSpaces);

/**
 * @route   GET /api/spaces/:id
 * @desc    Get space by ID
 * @access  Private (SUPERADMIN, ADMIN, or space member)
 */
router.get('/:id', spaceController.getSpaceById);

/**
 * @route   PATCH /api/spaces/:id
 * @desc    Update space
 * @access  Private (SUPERADMIN or space owner)
 */
router.patch('/:id', spaceController.updateSpace);

/**
 * @route   DELETE /api/spaces/:id
 * @desc    Delete space
 * @access  Private (SUPERADMIN or space owner)
 */
router.delete('/:id', spaceController.deleteSpace);

// ═══════════════════════════════════════════════════════════════
// Space Member Routes
// ═══════════════════════════════════════════════════════════════

/**
 * @route   POST /api/spaces/:spaceId/members
 * @desc    Add member to space
 * @access  Private (SUPERADMIN, ADMIN, or space owner)
 */
router.post('/:spaceId/members', spaceMemberController.addMember);

/**
 * @route   GET /api/spaces/:spaceId/members
 * @desc    Get all members of a space
 * @access  Private (Any authenticated user)
 */
router.get('/:spaceId/members', spaceMemberController.getMembers);

/**
 * @route   PATCH /api/spaces/:spaceId/members/:userId
 * @desc    Update member's Scrum role
 * @access  Private (SUPERADMIN, ADMIN, or space owner)
 */
router.patch('/:spaceId/members/:userId', spaceMemberController.updateMemberRole);

/**
 * @route   DELETE /api/spaces/:spaceId/members/:userId
 * @desc    Remove member from space
 * @access  Private (SUPERADMIN, ADMIN, or space owner)
 */
router.delete('/:spaceId/members/:userId', spaceMemberController.removeMember);

// ═══════════════════════════════════════════════════════════════
// Product Backlog
// ═══════════════════════════════════════════════════════════════

/**
 * @route   GET /api/spaces/:spaceId/backlog
 * @desc    Get all backlog items for the space
 * @access  Private (Space member)
 */
router.get('/:spaceId/backlog', backlogController.getBacklog);

/**
 * @route   POST /api/spaces/:spaceId/backlog
 * @desc    Create a backlog item
 * @access  Private (Space member)
 */
router.post('/:spaceId/backlog', backlogController.createBacklogItem);

/**
 * @route   PATCH /api/spaces/:spaceId/backlog/reorder
 * @desc    Reorder backlog items (body: { itemIds: string[] })
 * @access  Private (Space member)
 */
router.patch('/:spaceId/backlog/reorder', backlogController.reorderBacklog);

/**
 * @route   PATCH /api/spaces/:spaceId/backlog/:itemId
 * @desc    Update a backlog item
 * @access  Private (Space member)
 */
router.patch('/:spaceId/backlog/:itemId', backlogController.updateBacklogItem);

/**
 * @route   DELETE /api/spaces/:spaceId/backlog/:itemId
 * @desc    Delete a backlog item
 * @access  Private (Space member)
 */
router.delete('/:spaceId/backlog/:itemId', backlogController.deleteBacklogItem);

// ═══════════════════════════════════════════════════════════════
// Board (Kanban / Scrum)
// ═══════════════════════════════════════════════════════════════

/**
 * @route   GET /api/spaces/:spaceId/board
 * @desc    Get board (columns + cards). Query: sprintId (optional, for SCRUM)
 * @access  Private (Space member)
 */
router.get('/:spaceId/board', boardController.getBoard);

/**
 * @route   POST /api/spaces/:spaceId/board/cards
 * @desc    Create a card. Body: { columnId, title, description?, assigneeId?, sprintId? }
 * @access  Private (Space member)
 */
router.post('/:spaceId/board/cards', boardController.createCard);

/**
 * @route   PATCH /api/spaces/:spaceId/board/cards/:taskId
 * @desc    Update card. Body: { title?, description?, assigneeId? }
 * @access  Private (Space member)
 */
router.patch('/:spaceId/board/cards/:taskId', boardController.updateCard);

/**
 * @route   PATCH /api/spaces/:spaceId/board/cards/:taskId/move
 * @desc    Move card. Body: { columnId, position }
 * @access  Private (Space member)
 */
router.patch('/:spaceId/board/cards/:taskId/move', boardController.moveCard);

/**
 * @route   DELETE /api/spaces/:spaceId/board/cards/:taskId
 * @desc    Delete card
 * @access  Private (Space member)
 */
router.delete('/:spaceId/board/cards/:taskId', boardController.deleteCard);

/**
 * @route   POST /api/spaces/:spaceId/board/columns
 * @desc    Add column. Body: { name, wipLimit?, sprintId? }
 * @access  Private (Space member)
 */
router.post('/:spaceId/board/columns', boardController.addColumn);

/**
 * @route   PATCH /api/spaces/:spaceId/board/columns/:columnId
 * @desc    Rename column. Body: { name, sprintId? }
 * @access  Private (Space member)
 */
router.patch('/:spaceId/board/columns/:columnId', boardController.renameColumn);

/**
 * @route   DELETE /api/spaces/:spaceId/board/columns/:columnId
 * @desc    Remove column. Query: sprintId? (for SCRUM)
 * @access  Private (Space member)
 */
router.delete('/:spaceId/board/columns/:columnId', boardController.removeColumn);

// ═══════════════════════════════════════════════════════════════
// Git (GitHub) integration - read-only
// ═══════════════════════════════════════════════════════════════

/**
 * @route   GET /api/spaces/:spaceId/git/branches
 * @desc    List branches for linked repo
 * @access  Private (Space member)
 */
router.get('/:spaceId/git/branches', gitController.getBranches);

/**
 * @route   GET /api/spaces/:spaceId/git/commits/:sha
 * @desc    Get single commit with file patches
 * @access  Private (Space member)
 */
router.get('/:spaceId/git/commits/:sha', gitController.getCommitDetail);

/**
 * @route   GET /api/spaces/:spaceId/git/commits
 * @desc    List recent commits (query: branch, per_page)
 * @access  Private (Space member)
 */
router.get('/:spaceId/git/commits', gitController.getCommits);

/**
 * @route   GET /api/spaces/:spaceId/git/pulls
 * @desc    List open PRs
 * @access  Private (Space member)
 */
router.get('/:spaceId/git/pulls', gitController.getPulls);

/**
 * @route   GET /api/spaces/:spaceId/git
 * @desc    Get Git link info (gitRepoUrl, owner, repo)
 * @access  Private (Space member)
 */
router.get('/:spaceId/git', gitController.getGitInfo);

/**
 * @route   PATCH /api/spaces/:spaceId/git
 * @desc    Set or clear Git repo link (body: { gitRepoUrl })
 * @access  Private (Space owner or SUPERADMIN)
 */
router.patch('/:spaceId/git', gitController.updateGitLink);

export default router;
