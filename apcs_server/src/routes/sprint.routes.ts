/**
 * Sprint routes
 */
import { Router } from 'express';
import * as sprintController from '../controllers/sprint.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * @route   POST /api/spaces/:spaceId/sprints
 * @desc    Create a sprint (Scrum Master only)
 * @access  Private (Scrum Master)
 */
router.post('/spaces/:spaceId/sprints', sprintController.createSprint);

/**
 * @route   GET /api/spaces/:spaceId/sprints
 * @desc    Get all sprints for a space
 * @access  Private (Space members)
 */
router.get('/spaces/:spaceId/sprints', sprintController.getSpaceSprints);

/**
 * @route   GET /api/spaces/:spaceId/sprints/active
 * @desc    Get active sprint for a space
 * @access  Private (Space members)
 */
router.get('/spaces/:spaceId/sprints/active', sprintController.getActiveSprint);

/**
 * @route   GET /api/sprints/:id
 * @desc    Get sprint by ID
 * @access  Private (Space members)
 */
router.get('/sprints/:id', sprintController.getSprintById);

/**
 * @route   PATCH /api/sprints/:id
 * @desc    Update sprint details (Scrum Master only)
 * @access  Private (Scrum Master)
 */
router.patch('/sprints/:id', sprintController.updateSprint);

/**
 * @route   PATCH /api/sprints/:id/status
 * @desc    Update sprint status (Scrum Master only)
 * @access  Private (Scrum Master)
 */
router.patch('/sprints/:id/status', sprintController.updateSprintStatus);

/**
 * @route   DELETE /api/sprints/:id
 * @desc    Delete sprint (Scrum Master only - PLANNING only)
 * @access  Private (Scrum Master)
 */
router.delete('/sprints/:id', sprintController.deleteSprint);

export default router;
