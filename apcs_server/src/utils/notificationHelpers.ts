/**
 * Notification Helper Functions
 * Provides utilities for sending notifications to users and space members
 */

import { sendNotification, sendBulkNotifications } from '../services/notification.service';
import { NotificationType, NotificationMessages } from '../types/notifications';
import type { NotificationPayload } from '../types/notifications';
import prisma from '../lib/prisma';
import type { ScrumRole } from '@prisma/client';

/**
 * Get all members of a space
 */
export async function getSpaceMembers(spaceId: string) {
  return await prisma.spaceMember.findMany({
    where: { spaceId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });
}

/**
 * Get space members by specific role
 */
export async function getSpaceMembersByRole(spaceId: string, role: ScrumRole) {
  return await prisma.spaceMember.findMany({
    where: { 
      spaceId,
      scrumRole: role,
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });
}

/**
 * Get space members excluding specific roles
 */
export async function getSpaceMembersExcludingRoles(spaceId: string, excludeRoles: ScrumRole[]) {
  return await prisma.spaceMember.findMany({
    where: { 
      spaceId,
      scrumRole: {
        notIn: excludeRoles,
      },
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });
}

/**
 * Send notification to a single user
 */
export async function notifyUser(
  userId: string,
  type: NotificationType,
  title: string,
  body: string,
  data: Record<string, string> = {}
) {
  try {
    await sendNotification({
      userId,
      title,
      body,
      data: {
        type,
        timestamp: new Date().toISOString(),
        ...data,
      },
    });
  } catch (error) {
    console.error(`Failed to notify user ${userId}:`, error);
  }
}

/**
 * Send notification to multiple users
 */
export async function notifyUsers(
  userIds: string[],
  type: NotificationType,
  title: string,
  body: string,
  data: Record<string, string> = {}
) {
  if (userIds.length === 0) return;
  
  try {
    await sendBulkNotifications(
      userIds,
      title,
      body,
      {
        type,
        timestamp: new Date().toISOString(),
        ...data,
      }
    );
  } catch (error) {
    console.error(`Failed to notify users:`, error);
  }
}

/**
 * Notify all space members
 */
export async function notifySpaceMembers(
  spaceId: string,
  type: NotificationType,
  title: string,
  body: string,
  data: Record<string, string> = {},
  excludeUserId?: string
) {
  const members = await getSpaceMembers(spaceId);
  const userIds = members
    .map(m => m.user.id)
    .filter(id => id !== excludeUserId);
  
  await notifyUsers(userIds, type, title, body, data);
}

/**
 * Notify space members by role
 */
export async function notifySpaceMembersByRole(
  spaceId: string,
  role: ScrumRole,
  type: NotificationType,
  title: string,
  body: string,
  data: Record<string, string> = {}
) {
  const members = await getSpaceMembersByRole(spaceId, role);
  const userIds = members.map(m => m.user.id);
  
  await notifyUsers(userIds, type, title, body, data);
}

/**
 * Notify developers (all members except Product Owner)
 */
export async function notifyDevelopers(
  spaceId: string,
  type: NotificationType,
  title: string,
  body: string,
  data: Record<string, string> = {}
) {
  const members = await getSpaceMembersExcludingRoles(spaceId, ['PRODUCT_OWNER']);
  const userIds = members.map(m => m.user.id);
  
  await notifyUsers(userIds, type, title, body, data);
}

/**
 * Notify Product Owner and Scrum Master
 */
export async function notifyManagement(
  spaceId: string,
  type: NotificationType,
  title: string,
  body: string,
  data: Record<string, string> = {}
) {
  const po = await getSpaceMembersByRole(spaceId, 'PRODUCT_OWNER');
  const sm = await getSpaceMembersByRole(spaceId, 'SCRUM_MASTER');
  
  const userIds = [...po, ...sm].map(m => m.user.id);
  
  await notifyUsers(userIds, type, title, body, data);
}

/**
 * Notify Scrum Master
 */
export async function notifyScrumMaster(
  spaceId: string,
  type: NotificationType,
  title: string,
  body: string,
  data: Record<string, string> = {}
) {
  await notifySpaceMembersByRole(spaceId, 'SCRUM_MASTER', type, title, body, data);
}

/**
 * Notify all members except Product Owner (Scrum Master + Developers)
 */
export async function notifyTeamMembers(
  spaceId: string,
  type: NotificationType,
  title: string,
  body: string,
  data: Record<string, string> = {}
) {
  const members = await getSpaceMembersExcludingRoles(spaceId, ['PRODUCT_OWNER']);
  const userIds = members.map(m => m.user.id);
  
  await notifyUsers(userIds, type, title, body, data);
}
