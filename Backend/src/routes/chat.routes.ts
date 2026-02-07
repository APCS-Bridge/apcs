/**
 * Chat routes
 */
import { Router } from 'express';
import * as chatController from '../controllers/chat.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// All chat routes require authentication
router.use(authenticate);

/**
 * @route   POST /api/chat/rooms
 * @desc    Create a new chat room (direct or group)
 * @access  Private (Authenticated users)
 */
router.post('/rooms', chatController.createRoom);

/**
 * @route   GET /api/chat/rooms
 * @desc    Get all chat rooms for current user
 * @access  Private (Authenticated users)
 */
router.get('/rooms', chatController.getUserRooms);

/**
 * @route   GET /api/chat/rooms/:roomId
 * @desc    Get room details by ID
 * @access  Private (Room members only)
 */
router.get('/rooms/:roomId', chatController.getRoomById);

/**
 * @route   GET /api/chat/rooms/:roomId/messages
 * @desc    Get messages in a room (with pagination)
 * @access  Private (Room members only)
 */
router.get('/rooms/:roomId/messages', chatController.getRoomMessages);

/**
 * @route   POST /api/chat/rooms/:roomId/messages
 * @desc    Send a message in a room
 * @access  Private (Room members only)
 */
router.post('/rooms/:roomId/messages', chatController.sendMessage);

/**
 * @route   POST /api/chat/rooms/:roomId/members
 * @desc    Add members to a group chat room
 * @access  Private (Room members only)
 */
router.post('/rooms/:roomId/members', chatController.addRoomMembers);

/**
 * @route   DELETE /api/chat/rooms/:roomId/leave
 * @desc    Leave a room
 * @access  Private (Room members only)
 */
router.delete('/rooms/:roomId/leave', chatController.leaveRoom);

export default router;
