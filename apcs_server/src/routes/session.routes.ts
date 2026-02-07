/**
 * Session routes
 */
import { Router } from 'express';
import * as sessionController from '../controllers/session.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// All session routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/session
 * @desc    Get current user session context (spaceId, sprintId)
 * @access  Private
 */
router.get('/', sessionController.getSession);

/**
 * @route   POST /api/session/workspace
 * @desc    Set current workspace context
 * @access  Private
 */
router.post('/workspace', sessionController.setWorkspace);

/**
 * @route   POST /api/session/sprint
 * @desc    Set current sprint context
 * @access  Private
 */
router.post('/sprint', sessionController.setSprint);

/**
 * @route   DELETE /api/session
 * @desc    Clear user session
 * @access  Private
 */
router.delete('/', sessionController.clearSession);

export default router;