import prisma from '../lib/prisma';
import { SprintStatus } from '@prisma/client';
import { notifyDevelopers, notifyScrumMaster } from '../utils/notificationHelpers';
import { NotificationType, NotificationMessages } from '../types/notifications';

interface SprintResponse {
  id: string;
  spaceId: string;
  name: string;
  goal?: string | null;
  status: SprintStatus;
  startDate?: Date | null;
  endDate?: Date | null;
  createdAt: Date;
}

/**
 * Create a new sprint (Scrum Master only in SCRUM spaces)
 */
export async function createSprint(
  spaceId: string,
  userId: string,
  data: {
    name: string;
    goal?: string;
    startDate?: Date;
    endDate?: Date;
  }
): Promise<SprintResponse> {
  // Check if space exists and is SCRUM
  const space = await prisma.space.findUnique({
    where: { id: spaceId },
    include: {
      members: {
        where: { userId }
      }
    }
  });

  if (!space) {
    throw new Error('Space not found');
  }

  if (space.methodology !== 'SCRUM') {
    throw new Error('Sprints can only be created in SCRUM spaces');
  }

  // Check if user is a member with SCRUM_MASTER role
  const member = space.members[0];
  if (!member || member.scrumRole !== 'SCRUM_MASTER') {
    throw new Error('Only Scrum Master can create sprints');
  }

  // Check if there's already an active sprint
  const activeSprint = await prisma.sprint.findFirst({
    where: {
      spaceId,
      status: {
        in: ['PLANNING', 'ACTIVE']
      }
    }
  });

  if (activeSprint) {
    throw new Error('Cannot create new sprint while another sprint is PLANNING or ACTIVE');
  }

  // Validate dates if provided
  if (data.startDate && data.endDate && data.startDate >= data.endDate) {
    throw new Error('End date must be after start date');
  }

  const sprint = await prisma.sprint.create({
    data: {
      spaceId,
      name: data.name,
      goal: data.goal || null,
      startDate: data.startDate || null,
      endDate: data.endDate || null,
      status: 'PLANNING'
    }
  });

  // 🔔 Notification #3: Notify developers when sprint is created
  const creator = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
  const message = NotificationMessages.SPRINT_CREATED(sprint.name, creator?.name || 'Scrum Master');
  notifyDevelopers(
    spaceId,
    NotificationType.SPRINT_CREATED,
    message.title,
    message.body,
    {
      sprintId: sprint.id,
      sprintName: sprint.name,
      spaceId: spaceId,
      url: `/spaces/${spaceId}/sprints/${sprint.id}`,
    }
  ).catch(err => console.error('Failed to send sprint created notification:', err));

  return sprint;
}

/**
 * Get all sprints for a space
 */
export async function getSpaceSprints(
  spaceId: string,
  userId: string
): Promise<SprintResponse[]> {
  // Check if user is a member of the space
  const member = await prisma.spaceMember.findFirst({
    where: {
      spaceId,
      userId
    }
  });

  if (!member) {
    throw new Error('Not a member of this space');
  }

  const sprints = await prisma.sprint.findMany({
    where: { spaceId },
    orderBy: {
      createdAt: 'desc'
    }
  });

  return sprints;
}

/**
 * Get sprint by ID
 */
export async function getSprintById(
  sprintId: string,
  userId: string
): Promise<SprintResponse> {
  const sprint = await prisma.sprint.findUnique({
    where: { id: sprintId }
  });

  if (!sprint) {
    throw new Error('Sprint not found');
  }

  // Check if user is a member of the space
  const member = await prisma.spaceMember.findFirst({
    where: {
      spaceId: sprint.spaceId,
      userId
    }
  });

  if (!member) {
    throw new Error('Not a member of this space');
  }

  return sprint;
}

/**
 * Update sprint status (Scrum Master only)
 */
export async function updateSprintStatus(
  sprintId: string,
  userId: string,
  newStatus: SprintStatus
): Promise<SprintResponse> {
  const sprint = await prisma.sprint.findUnique({
    where: { id: sprintId },
    include: {
      space: {
        include: {
          members: {
            where: { userId }
          }
        }
      }
    }
  });

  if (!sprint) {
    throw new Error('Sprint not found');
  }

  // Check if user is Scrum Master
  const member = sprint.space.members[0];
  if (!member || member.scrumRole !== 'SCRUM_MASTER') {
    throw new Error('Only Scrum Master can update sprint status');
  }

  // Validate status transitions
  const validTransitions: Record<SprintStatus, SprintStatus[]> = {
    PLANNING: ['ACTIVE'],
    ACTIVE: ['COMPLETED'],
    COMPLETED: [] // Cannot transition from COMPLETED
  };

  if (!validTransitions[sprint.status].includes(newStatus)) {
    throw new Error(`Cannot transition from ${sprint.status} to ${newStatus}`);
  }

  const updatedSprint = await prisma.sprint.update({
    where: { id: sprintId },
    data: { status: newStatus }
  });

  // 🔔 Notification #4: Notify developers when sprint starts
  if (newStatus === 'ACTIVE') {
    const message = NotificationMessages.SPRINT_STARTED(updatedSprint.name);
    notifyDevelopers(
      sprint.spaceId,
      NotificationType.SPRINT_STARTED,
      message.title,
      message.body,
      {
        sprintId: updatedSprint.id,
        sprintName: updatedSprint.name,
        spaceId: sprint.spaceId,
        url: `/spaces/${sprint.spaceId}/sprints/${updatedSprint.id}`,
      }
    ).catch(err => console.error('Failed to send sprint started notification:', err));
  }

  // 🔔 Notification: Notify developers when sprint completes
  if (newStatus === 'COMPLETED') {
    const message = NotificationMessages.SPRINT_COMPLETED(updatedSprint.name);
    notifyDevelopers(
      sprint.spaceId,
      NotificationType.SPRINT_COMPLETED,
      message.title,
      message.body,
      {
        sprintId: updatedSprint.id,
        sprintName: updatedSprint.name,
        spaceId: sprint.spaceId,
        url: `/spaces/${sprint.spaceId}/sprints/${updatedSprint.id}`,
      }
    ).catch(err => console.error('Failed to send sprint completed notification:', err));
  }

  return updatedSprint;
}

/**
 * Update sprint details (Scrum Master only)
 */
export async function updateSprint(
  sprintId: string,
  userId: string,
  data: {
    name?: string;
    goal?: string;
    startDate?: Date;
    endDate?: Date;
  }
): Promise<SprintResponse> {
  const sprint = await prisma.sprint.findUnique({
    where: { id: sprintId },
    include: {
      space: {
        include: {
          members: {
            where: { userId }
          }
        }
      }
    }
  });

  if (!sprint) {
    throw new Error('Sprint not found');
  }

  // Check if user is Scrum Master
  const member = sprint.space.members[0];
  if (!member || member.scrumRole !== 'SCRUM_MASTER') {
    throw new Error('Only Scrum Master can update sprint');
  }

  // Cannot update completed sprints
  if (sprint.status === 'COMPLETED') {
    throw new Error('Cannot update completed sprint');
  }

  // Validate dates if provided
  const newStartDate = data.startDate || sprint.startDate;
  const newEndDate = data.endDate || sprint.endDate;
  
  if (newStartDate && newEndDate && newStartDate >= newEndDate) {
    throw new Error('End date must be after start date');
  }

  const updatedSprint = await prisma.sprint.update({
    where: { id: sprintId },
    data
  });

  return updatedSprint;
}

/**
 * Delete sprint (Scrum Master only - only if PLANNING status)
 */
export async function deleteSprint(
  sprintId: string,
  userId: string
): Promise<void> {
  const sprint = await prisma.sprint.findUnique({
    where: { id: sprintId },
    include: {
      space: {
        include: {
          members: {
            where: { userId }
          }
        }
      }
    }
  });

  if (!sprint) {
    throw new Error('Sprint not found');
  }

  // Check if user is Scrum Master
  const member = sprint.space.members[0];
  if (!member || member.scrumRole !== 'SCRUM_MASTER') {
    throw new Error('Only Scrum Master can delete sprint');
  }

  // Can only delete sprints in PLANNING status
  if (sprint.status !== 'PLANNING') {
    throw new Error('Can only delete sprints in PLANNING status');
  }

  await prisma.sprint.delete({
    where: { id: sprintId }
  });
}

/**
 * Get active sprint for a space
 */
export async function getActiveSprint(
  spaceId: string,
  userId: string
): Promise<SprintResponse | null> {
  // Check if user is a member of the space
  const member = await prisma.spaceMember.findFirst({
    where: {
      spaceId,
      userId
    }
  });

  if (!member) {
    throw new Error('Not a member of this space');
  }

  const sprint = await prisma.sprint.findFirst({
    where: {
      spaceId,
      status: 'ACTIVE'
    }
  });

  return sprint;
}
