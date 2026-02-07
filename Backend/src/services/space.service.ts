/**
 * Space service - Business logic for workspace management
 */
import prisma from '../lib/prisma';
import type { Methodology, ScrumRole } from '@prisma/client';
import { notifyUser } from '../utils/notificationHelpers';
import { NotificationType, NotificationMessages } from '../types/notifications';

export interface CreateSpaceInput {
  name: string;
  methodology: Methodology;
  ownerId: string;
}

export interface SpaceResponse {
  id: string;
  name: string;
  methodology: Methodology;
  ownerId: string;
  gitRepoUrl: string | null;
  createdAt: Date;
  owner: {
    id: string;
    name: string;
    email: string;
  };
}

export interface SpaceMemberResponse {
  id: string;
  spaceId: string;
  userId: string;
  scrumRole: ScrumRole | null;
  joinedAt: Date;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}

/**
 * Create a new workspace
 */
export async function createSpace(input: CreateSpaceInput): Promise<SpaceResponse> {
  // Validate methodology
  if (!['KANBAN', 'SCRUM'].includes(input.methodology)) {
    throw new Error('Methodology must be either KANBAN or SCRUM');
  }

  // Verify owner exists
  const owner = await prisma.user.findUnique({
    where: { id: input.ownerId }
  });

  if (!owner) {
    throw new Error('Owner user not found');
  }

  // Create space
  const space = await prisma.space.create({
    data: {
      name: input.name,
      methodology: input.methodology,
      ownerId: input.ownerId
    },
    include: {
      owner: {
        select: {
          id: true,
          name: true,
          email: true
        }
      }
    }
  });

  return space;
}

/**
 * Get all spaces with pagination
 */
export async function getAllSpaces(
  page: number = 1,
  limit: number = 10
): Promise<{ spaces: SpaceResponse[]; total: number; page: number; totalPages: number }> {
  const skip = (page - 1) * limit;

  const [spaces, total] = await Promise.all([
    prisma.space.findMany({
      skip,
      take: limit,
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        _count: {
          select: {
            members: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    }),
    prisma.space.count()
  ]);

  return {
    spaces,
    total,
    page,
    totalPages: Math.ceil(total / limit)
  };
}

/**
 * Get space by ID
 */
export async function getSpaceById(spaceId: string): Promise<SpaceResponse | null> {
  const space = await prisma.space.findUnique({
    where: { id: spaceId },
    include: {
      owner: {
        select: {
          id: true,
          name: true,
          email: true
        }
      }
    }
  });

  return space;
}

/**
 * Get spaces owned by or accessible to a user
 */
export async function getUserSpaces(userId: string): Promise<SpaceResponse[]> {
  const spaces = await prisma.space.findMany({
    where: {
      OR: [
        { ownerId: userId },
        {
          members: {
            some: {
              userId: userId
            }
          }
        }
      ]
    },
    include: {
      owner: {
        select: {
          id: true,
          name: true,
          email: true
        }
      },
      _count: {
        select: {
          members: true
        }
      }
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  return spaces;
}

/**
 * Update space
 */
export async function updateSpace(
  spaceId: string,
  data: { name?: string; methodology?: Methodology; gitRepoUrl?: string | null }
): Promise<SpaceResponse> {
  const space = await prisma.space.findUnique({
    where: { id: spaceId }
  });

  if (!space) {
    throw new Error('Space not found');
  }

  const updatedSpace = await prisma.space.update({
    where: { id: spaceId },
    data,
    include: {
      owner: {
        select: {
          id: true,
          name: true,
          email: true
        }
      }
    }
  });

  return updatedSpace;
}

/**
 * Delete space
 */
export async function deleteSpace(spaceId: string): Promise<void> {
  const space = await prisma.space.findUnique({
    where: { id: spaceId }
  });

  if (!space) {
    throw new Error('Space not found');
  }

  await prisma.space.delete({
    where: { id: spaceId }
  });
}

/**
 * Add member to space
 */
export async function addSpaceMember(
  spaceId: string,
  userId: string,
  scrumRole?: ScrumRole
): Promise<SpaceMemberResponse> {
  // Verify space exists
  const space = await prisma.space.findUnique({
    where: { id: spaceId }
  });

  if (!space) {
    throw new Error('Space not found');
  }

  // Verify user exists
  const user = await prisma.user.findUnique({
    where: { id: userId }
  });

  if (!user) {
    throw new Error('User not found');
  }

  // Check if user is already a member
  const existingMember = await prisma.spaceMember.findUnique({
    where: {
      spaceId_userId: {
        spaceId,
        userId
      }
    }
  });

  if (existingMember) {
    throw new Error('User is already a member of this space');
  }

  // Validate scrumRole based on methodology
  if (space.methodology === 'KANBAN' && scrumRole) {
    throw new Error('KANBAN spaces do not support Scrum roles');
  }

  if (space.methodology === 'SCRUM' && !scrumRole) {
    throw new Error('SCRUM spaces require a Scrum role for members');
  }

  // Add member
  const member = await prisma.spaceMember.create({
    data: {
      spaceId,
      userId,
      scrumRole: scrumRole || null
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true
        }
      }
    }
  });

  // 🔔 Notification #1: Notify the invited user about being added to the space
  const message = NotificationMessages.SPACE_INVITATION_RECEIVED(space.name, 'Space Owner');
  notifyUser(
    userId,
    NotificationType.SPACE_INVITATION_RECEIVED,
    message.title,
    message.body,
    {
      spaceId: space.id,
      spaceName: space.name,
      scrumRole: scrumRole || 'MEMBER',
      url: `/spaces/${space.id}`,
    }
  ).catch(err => console.error('Failed to send member added notification:', err));

  return {
    id: member.id,
    userId: member.userId,
    spaceId: member.spaceId,
    scrumRole: member.scrumRole,
    joinedAt: member.joinedAt,
    user: {
      id: member.user.id,
      name: member.user.name,
      email: member.user.email,
      role: member.user.role
    }
  };
}

/**
 * Get all members of a space
 */
export async function getSpaceMembers(spaceId: string): Promise<SpaceMemberResponse[]> {
  const space = await prisma.space.findUnique({
    where: { id: spaceId }
  });

  if (!space) {
    throw new Error('Space not found');
  }

  const members = await prisma.spaceMember.findMany({
    where: { spaceId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true
        }
      }
    },
    orderBy: {
      joinedAt: 'asc'
    }
  });

  return members;
}

/**
 * Remove member from space
 */
export async function removeSpaceMember(spaceId: string, userId: string): Promise<void> {
  const space = await prisma.space.findUnique({
    where: { id: spaceId }
  });

  if (!space) {
    throw new Error('Space not found');
  }

  // Cannot remove the owner
  if (space.ownerId === userId) {
    throw new Error('Cannot remove space owner from members');
  }

  const member = await prisma.spaceMember.findUnique({
    where: {
      spaceId_userId: {
        spaceId,
        userId
      }
    }
  });

  if (!member) {
    throw new Error('User is not a member of this space');
  }

  await prisma.spaceMember.delete({
    where: {
      spaceId_userId: {
        spaceId,
        userId
      }
    }
  });
}

/**
 * Update member's Scrum role
 */
export async function updateMemberRole(
  spaceId: string,
  userId: string,
  scrumRole: ScrumRole
): Promise<SpaceMemberResponse> {
  const space = await prisma.space.findUnique({
    where: { id: spaceId }
  });

  if (!space) {
    throw new Error('Space not found');
  }

  if (space.methodology === 'KANBAN') {
    throw new Error('KANBAN spaces do not support Scrum roles');
  }

  const member = await prisma.spaceMember.findUnique({
    where: {
      spaceId_userId: {
        spaceId,
        userId
      }
    }
  });

  if (!member) {
    throw new Error('User is not a member of this space');
  }

  const updatedMember = await prisma.spaceMember.update({
    where: {
      spaceId_userId: {
        spaceId,
        userId
      }
    },
    data: {
      scrumRole
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true
        }
      }
    }
  });

  return updatedMember;
}
