/**
 * Invitation controller - handles invitation creation and responses
 */
import type { Request, Response } from 'express';
import * as invitationService from '../services/invitation.service';
import { UserRole } from '@prisma/client';

/**
 * Create an invitation
 * POST /api/invitations
 * Body: { email: string, role: 'USER' | 'ADMIN' }
 * Auth: Required (SUPERADMIN or ADMIN)
 */
export async function createInvitation(req: Request, res: Response) {
  try {
    const { email, role } = req.body;

    // Validate input
    if (!email || !role) {
      return res.status(400).json({
        success: false,
        message: 'Email and role are required'
      });
    }

    // Validate role
    if (!['USER', 'ADMIN', 'SUPERADMIN'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role. Must be USER or ADMIN'
      });
    }

    const invitation = await invitationService.createInvitation(
      email,
      role as UserRole,
      req.user!.userId,
      req.user!.role
    );

    return res.status(201).json({
      success: true,
      message: 'Invitation created successfully',
      data: invitation
    });

  } catch (error) {
    console.error('Create invitation error:', error);
    
    if (error instanceof Error) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}

/**
 * Get all invitations
 * GET /api/invitations
 * Auth: Required (SUPERADMIN or ADMIN)
 */
export async function getAllInvitations(req: Request, res: Response) {
  try {
    const invitations = await invitationService.getAllInvitations(
      req.user!.userId,
      req.user!.role
    );

    return res.status(200).json({
      success: true,
      data: invitations
    });

  } catch (error) {
    console.error('Get invitations error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}

/**
 * Get invitations by email (public endpoint for checking invitations)
 * GET /api/invitations/check/:email
 * Auth: Not required
 */
export async function getInvitationsByEmail(req: Request, res: Response) {
  try {
    const { email } = req.params;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    const invitations = await invitationService.getInvitationsByEmail(email);

    return res.status(200).json({
      success: true,
      data: invitations
    });

  } catch (error) {
    console.error('Get invitations by email error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}

/**
 * Accept an invitation
 * POST /api/invitations/:id/accept
 * Body: { email: string, password: string, name: string }
 * Auth: Not required
 */
export async function acceptInvitation(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { email, password, name } = req.body;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Invitation ID is required'
      });
    }

    // Validate input
    if (!email || !password || !name) {
      return res.status(400).json({
        success: false,
        message: 'Email, password, and name are required'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format'
      });
    }

    // Validate password length
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters'
      });
    }

    const result = await invitationService.acceptInvitation(
      id,
      email,
      password,
      name
    );

    return res.status(200).json({
      success: true,
      message: 'Invitation accepted and account created successfully',
      data: result
    });

  } catch (error) {
    console.error('Accept invitation error:', error);
    
    if (error instanceof Error) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}

/**
 * Deny an invitation
 * POST /api/invitations/:id/deny
 * Body: { email: string }
 * Auth: Not required
 */
export async function denyInvitation(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { email } = req.body;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Invitation ID is required'
      });
    }

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    const invitation = await invitationService.denyInvitation(id, email);

    return res.status(200).json({
      success: true,
      message: 'Invitation denied successfully',
      data: invitation
    });

  } catch (error) {
    console.error('Deny invitation error:', error);
    
    if (error instanceof Error) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}

/**
 * Cancel an invitation
 * DELETE /api/invitations/:id
 * Auth: Required (Sender or SUPERADMIN)
 */
export async function cancelInvitation(req: Request, res: Response) {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Invitation ID is required'
      });
    }

    await invitationService.cancelInvitation(
      id,
      req.user!.userId,
      req.user!.role
    );

    return res.status(200).json({
      success: true,
      message: 'Invitation cancelled successfully'
    });

  } catch (error) {
    console.error('Cancel invitation error:', error);
    
    if (error instanceof Error) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}
