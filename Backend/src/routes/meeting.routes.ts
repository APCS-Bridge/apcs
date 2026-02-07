/**
 * Meeting routes
 */
import { Router } from 'express';
import * as meetingController from '../controllers/meeting.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * @route   POST /api/spaces/:spaceId/meetings
 * @desc    Create a meeting (Scrum Master only)
 * @access  Private (Scrum Master)
 */
router.post('/spaces/:spaceId/meetings', meetingController.createMeeting);

/**
 * @route   GET /api/spaces/:spaceId/meetings
 * @desc    Get all meetings for a space
 * @access  Private (Space members)
 */
router.get('/spaces/:spaceId/meetings', meetingController.getSpaceMeetings);

/**
 * @route   GET /api/meetings/:id
 * @desc    Get meeting by ID
 * @access  Private (Space members)
 */
router.get('/meetings/:id', meetingController.getMeetingById);

/**
 * @route   PATCH /api/meetings/:id
 * @desc    Update meeting (Scrum Master only)
 * @access  Private (Scrum Master)
 */
router.patch('/meetings/:id', meetingController.updateMeeting);

/**
 * @route   DELETE /api/meetings/:id
 * @desc    Delete meeting (Scrum Master only)
 * @access  Private (Scrum Master)
 */
router.delete('/meetings/:id', meetingController.deleteMeeting);

export default router;
