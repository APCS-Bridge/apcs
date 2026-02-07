import prisma from '../lib/prisma';
import { UserRole } from '@prisma/client';
import { hashPassword } from '../lib/auth';

interface InvitationResponse {
  id: string;
  email: string;
  role: UserRole;
  status: string;
  senderId: string;
  senderName: string;
  senderEmail: string;
  receiverId?: string;
  createdAt: Date;
  respondedAt?: Date;
}

/**
 * Create an invitation
 * Only SUPERADMIN and ADMIN can create invitations
 */
export async function createInvitation(
  email: string,
  role: UserRole,
  senderId: string,
  senderRole: UserRole
): Promise<InvitationResponse> {
  // Only SUPERADMIN and ADMIN can send invitations
  if (senderRole !== 'SUPERADMIN' && senderRole !== 'ADMIN') {
    throw new Error('Only SUPERADMIN or ADMIN can send invitations');
  }

  // ADMIN cannot invite ADMIN or SUPERADMIN
  if (senderRole === 'ADMIN' && (role === 'ADMIN' || role === 'SUPERADMIN')) {
    throw new Error('ADMIN can only invite USER accounts');
  }

  // Cannot invite SUPERADMIN
  if (role === 'SUPERADMIN') {
    throw new Error('Cannot invite SUPERADMIN accounts');
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new Error('Invalid email format');
  }

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email }
  });

  if (existingUser) {
    throw new Error('User with this email already exists');
  }

  // Check if there's already a pending invitation for this email
  const existingInvitation = await prisma.invitation.findFirst({
    where: {
      email,
      status: 'PENDING'
    }
  });

  if (existingInvitation) {
    throw new Error('Pending invitation already exists for this email');
  }

  // Create invitation
  const invitation = await prisma.invitation.create({
    data: {
      email,
      role,
      senderId
    },
    include: {
      sender: {
        select: {
          id: true,
          name: true,
          email: true
        }
      }
    }
  });

  return {
    id: invitation.id,
    email: invitation.email,
    role: invitation.role,
    status: invitation.status,
    senderId: invitation.senderId,
    senderName: invitation.sender.name,
    senderEmail: invitation.sender.email,
    createdAt: invitation.createdAt
  };
}

/**
 * Get all invitations
 * SUPERADMIN can see all, ADMIN can see their own
 */
export async function getAllInvitations(
  userId: string,
  userRole: UserRole
): Promise<InvitationResponse[]> {
  const where = userRole === 'SUPERADMIN' 
    ? {} 
    : { senderId: userId };

  const invitations = await prisma.invitation.findMany({
    where,
    include: {
      sender: {
        select: {
          id: true,
          name: true,
          email: true
        }
      },
      receiver: {
        select: {
          id: true,
          name: true,
          email: true
        }
      }
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  return invitations.map(inv => ({
    id: inv.id,
    email: inv.email,
    role: inv.role,
    status: inv.status,
    senderId: inv.senderId,
    senderName: inv.sender.name,
    senderEmail: inv.sender.email,
    ...(inv.receiverId && { receiverId: inv.receiverId }),
    createdAt: inv.createdAt,
    ...(inv.respondedAt && { respondedAt: inv.respondedAt })
  }));
}

/**
 * Get invitations by email (for users to see their invitations)
 */
export async function getInvitationsByEmail(
  email: string
): Promise<InvitationResponse[]> {
  const invitations = await prisma.invitation.findMany({
    where: {
      email,
      status: 'PENDING'
    },
    include: {
      sender: {
        select: {
          id: true,
          name: true,
          email: true
        }
      }
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  return invitations.map(inv => ({
    id: inv.id,
    email: inv.email,
    role: inv.role,
    status: inv.status,
    senderId: inv.senderId,
    senderName: inv.sender.name,
    senderEmail: inv.sender.email,
    createdAt: inv.createdAt
  }));
}

/**
 * Accept an invitation and create user account
 */
export async function acceptInvitation(
  invitationId: string,
  email: string,
  password: string,
  name: string
): Promise<{ user: any; invitation: InvitationResponse }> {
  // Get invitation
  const invitation = await prisma.invitation.findUnique({
    where: { id: invitationId },
    include: {
      sender: {
        select: {
          id: true,
          name: true,
          email: true
        }
      }
    }
  });

  if (!invitation) {
    throw new Error('Invitation not found');
  }

  if (invitation.status !== 'PENDING') {
    throw new Error('Invitation already responded to');
  }

  if (invitation.email !== email) {
    throw new Error('Email does not match invitation');
  }

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email }
  });

  if (existingUser) {
    throw new Error('User with this email already exists');
  }

  // Validate password
  if (password.length < 6) {
    throw new Error('Password must be at least 6 characters');
  }

  // Hash password
  const passwordHash = await hashPassword(password);

  // Create user and update invitation in a transaction
  const result = await prisma.$transaction(async (tx) => {
    // Create user
    const user = await tx.user.create({
      data: {
        email,
        passwordHash,
        name,
        role: invitation.role
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true
      }
    });

    // Update invitation
    const updatedInvitation = await tx.invitation.update({
      where: { id: invitationId },
      data: {
        status: 'ACCEPTED',
        receiverId: user.id,
        respondedAt: new Date()
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    return { user, invitation: updatedInvitation };
  });

  return {
    user: result.user,
    invitation: {
      id: result.invitation.id,
      email: result.invitation.email,
      role: result.invitation.role,
      status: result.invitation.status,
      senderId: result.invitation.senderId,
      senderName: result.invitation.sender.name,
      senderEmail: result.invitation.sender.email,
      ...(result.invitation.receiverId && { receiverId: result.invitation.receiverId }),
      createdAt: result.invitation.createdAt,
      ...(result.invitation.respondedAt && { respondedAt: result.invitation.respondedAt })
    }
  };
}

/**
 * Deny an invitation
 */
export async function denyInvitation(
  invitationId: string,
  email: string
): Promise<InvitationResponse> {
  // Get invitation
  const invitation = await prisma.invitation.findUnique({
    where: { id: invitationId },
    include: {
      sender: {
        select: {
          id: true,
          name: true,
          email: true
        }
      }
    }
  });

  if (!invitation) {
    throw new Error('Invitation not found');
  }

  if (invitation.status !== 'PENDING') {
    throw new Error('Invitation already responded to');
  }

  if (invitation.email !== email) {
    throw new Error('Email does not match invitation');
  }

  // Update invitation
  const updatedInvitation = await prisma.invitation.update({
    where: { id: invitationId },
    data: {
      status: 'DENIED',
      respondedAt: new Date()
    },
    include: {
      sender: {
        select: {
          id: true,
          name: true,
          email: true
        }
      }
    }
  });

  return {
    id: updatedInvitation.id,
    email: updatedInvitation.email,
    role: updatedInvitation.role,
    status: updatedInvitation.status,
    senderId: updatedInvitation.senderId,
    senderName: updatedInvitation.sender.name,
    senderEmail: updatedInvitation.sender.email,
    createdAt: updatedInvitation.createdAt,
    ...(updatedInvitation.respondedAt && { respondedAt: updatedInvitation.respondedAt })
  };
}

/**
 * Cancel an invitation (by sender or SUPERADMIN)
 */
export async function cancelInvitation(
  invitationId: string,
  userId: string,
  userRole: UserRole
): Promise<void> {
  const invitation = await prisma.invitation.findUnique({
    where: { id: invitationId }
  });

  if (!invitation) {
    throw new Error('Invitation not found');
  }

  // Only sender or SUPERADMIN can cancel
  if (invitation.senderId !== userId && userRole !== 'SUPERADMIN') {
    throw new Error('Only the sender or SUPERADMIN can cancel this invitation');
  }

  if (invitation.status !== 'PENDING') {
    throw new Error('Can only cancel pending invitations');
  }

  await prisma.invitation.delete({
    where: { id: invitationId }
  });
}
