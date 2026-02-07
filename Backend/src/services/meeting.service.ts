import prisma from '../lib/prisma';
import { MeetingType } from '@prisma/client';

interface MeetingResponse {
  id: string;
  spaceId: string;
  sprintId?: string | null;
  title: string;
  description?: string | null;
  type: MeetingType;
  scheduledAt: Date;
  duration: number;
  createdById: string;
  createdBy: {
    id: string;
    name: string;
    email: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Create a meeting (Scrum Master only in SCRUM spaces)
 */
export async function createMeeting(
  spaceId: string,
  userId: string,
  data: {
    title: string;
    description?: string;
    type: MeetingType;
    scheduledAt: Date;
    duration: number;
    sprintId?: string;
  }
): Promise<MeetingResponse> {
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
    throw new Error('Meetings can only be created in SCRUM spaces');
  }

  // Check if user is a member with SCRUM_MASTER role
  const member = space.members[0];
  if (!member || member.scrumRole !== 'SCRUM_MASTER') {
    throw new Error('Only Scrum Master can create meetings');
  }

  // Validate sprint if provided
  if (data.sprintId) {
    const sprint = await prisma.sprint.findUnique({
      where: { id: data.sprintId }
    });

    if (!sprint || sprint.spaceId !== spaceId) {
      throw new Error('Sprint not found in this space');
    }
  }

  // Validate duration
  if (data.duration < 5 || data.duration > 480) {
    throw new Error('Duration must be between 5 and 480 minutes');
  }

  // Create meeting
  const meeting = await prisma.meeting.create({
    data: {
      spaceId,
      sprintId: data.sprintId || null,
      title: data.title,
      description: data.description || null,
      type: data.type,
      scheduledAt: data.scheduledAt,
      duration: data.duration,
      createdById: userId
    },
    include: {
      createdBy: {
        select: {
          id: true,
          name: true,
          email: true
        }
      }
    }
  });

  return {
    ...meeting,
    ...(meeting.sprintId && { sprintId: meeting.sprintId }),
    ...(meeting.description && { description: meeting.description })
  };
}

/**
 * Get all meetings for a space
 */
export async function getSpaceMeetings(
  spaceId: string,
  userId: string
): Promise<MeetingResponse[]> {
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

  const meetings = await prisma.meeting.findMany({
    where: { spaceId },
    include: {
      createdBy: {
        select: {
          id: true,
          name: true,
          email: true
        }
      }
    },
    orderBy: {
      scheduledAt: 'asc'
    }
  });

  return meetings;
}

/**
 * Get meeting by ID
 */
export async function getMeetingById(
  meetingId: string,
  userId: string
): Promise<MeetingResponse> {
  const meeting = await prisma.meeting.findUnique({
    where: { id: meetingId },
    include: {
      createdBy: {
        select: {
          id: true,
          name: true,
          email: true
        }
      }
    }
  });

  if (!meeting) {
    throw new Error('Meeting not found');
  }

  // Check if user is a member of the space
  const member = await prisma.spaceMember.findFirst({
    where: {
      spaceId: meeting.spaceId,
      userId
    }
  });

  if (!member) {
    throw new Error('Not a member of this space');
  }

  return meeting;
}

/**
 * Update meeting (Scrum Master only)
 */
export async function updateMeeting(
  meetingId: string,
  userId: string,
  data: {
    title?: string;
    description?: string;
    type?: MeetingType;
    scheduledAt?: Date;
    duration?: number;
  }
): Promise<MeetingResponse> {
  const meeting = await prisma.meeting.findUnique({
    where: { id: meetingId },
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

  if (!meeting) {
    throw new Error('Meeting not found');
  }

  // Check if user is Scrum Master
  const member = meeting.space.members[0];
  if (!member || member.scrumRole !== 'SCRUM_MASTER') {
    throw new Error('Only Scrum Master can update meetings');
  }

  // Validate duration if provided
  if (data.duration !== undefined && (data.duration < 5 || data.duration > 480)) {
    throw new Error('Duration must be between 5 and 480 minutes');
  }

  const updatedMeeting = await prisma.meeting.update({
    where: { id: meetingId },
    data,
    include: {
      createdBy: {
        select: {
          id: true,
          name: true,
          email: true
        }
      }
    }
  });

  return updatedMeeting;
}

/**
 * Delete meeting (Scrum Master only)
 */
export async function deleteMeeting(
  meetingId: string,
  userId: string
): Promise<void> {
  const meeting = await prisma.meeting.findUnique({
    where: { id: meetingId },
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

  if (!meeting) {
    throw new Error('Meeting not found');
  }

  // Check if user is Scrum Master
  const member = meeting.space.members[0];
  if (!member || member.scrumRole !== 'SCRUM_MASTER') {
    throw new Error('Only Scrum Master can delete meetings');
  }

  await prisma.meeting.delete({
    where: { id: meetingId }
  });
}
