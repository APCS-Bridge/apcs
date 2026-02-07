/**
 * Session service - Manage user session context
 */
import prisma from '../lib/prisma';

/**
 * Create or update user session
 */
export async function upsertSession(userId: string, data: { spaceId?: string | null; sprintId?: string | null }) {
  return await prisma.session.upsert({
    where: { userId },
    update: {
      ...data,
      updatedAt: new Date()
    },
    create: {
      userId,
      ...data
    }
  });
}

/**
 * Get user session
 */
export async function getUserSession(userId: string) {
  return await prisma.session.findUnique({
    where: { userId }
  });
}

/**
 * Update session workspace (space_id)
 */
export async function setSessionWorkspace(userId: string, spaceId: string | null) {
  return await upsertSession(userId, { spaceId });
}

/**
 * Update session sprint (sprint_id)
 */
export async function setSessionSprint(userId: string, sprintId: string | null) {
  return await upsertSession(userId, { sprintId });
}

/**
 * Clear user session
 */
export async function clearSession(userId: string) {
  return await prisma.session.delete({
    where: { userId }
  }).catch(() => null); // Ignore if session doesn't exist
}
