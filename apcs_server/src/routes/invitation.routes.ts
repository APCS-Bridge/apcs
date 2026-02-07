/**
 * Invitation routes
 */
import { Router } from 'express';
import * as invitationController from '../controllers/invitation.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();

/**
 * @route   POST /api/invitations
 * @desc    Create an invitation
 * @access  Private (SUPERADMIN or ADMIN)
 */
router.post('/', authenticate, authorize('SUPERADMIN', 'ADMIN'), invitationController.createInvitation);

/**
 * @route   GET /api/invitations
 * @desc    Get all invitations
 * @access  Private (SUPERADMIN or ADMIN)
 */
router.get('/', authenticate, authorize('SUPERADMIN', 'ADMIN'), invitationController.getAllInvitations);

/**
 * @route   GET /api/invitations/check/:email
 * @desc    Get invitations by email
 * @access  Public
 */
router.get('/check/:email', invitationController.getInvitationsByEmail);

/**
 * @route   POST /api/invitations/:id/accept
 * @desc    Accept an invitation and create account
 * @access  Public
 */
router.post('/:id/accept', invitationController.acceptInvitation);

/**
 * @route   POST /api/invitations/:id/deny
 * @desc    Deny an invitation
 * @access  Public
 */
router.post('/:id/deny', invitationController.denyInvitation);

/**
 * @route   DELETE /api/invitations/:id
 * @desc    Cancel an invitation
 * @access  Private (Sender or SUPERADMIN)
 */
router.delete('/:id', authenticate, authorize('SUPERADMIN', 'ADMIN'), invitationController.cancelInvitation);

export default router;
