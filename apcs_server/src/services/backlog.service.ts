/**
 * Backlog service - Product Backlog (BacklogItem) CRUD for a space
 */
import prisma from '../lib/prisma';

export interface BacklogItemResponse {
  id: string;
  spaceId: string;
  title: string;
  description: string | null;
  sequenceNumber: number;
  position: number;
  assigneeId: string | null;
  assigneeName: string | null;
  createdById: string;
  createdByName: string;
  createdAt: Date;
}

function toResponse(item: {
  id: string;
  spaceId: string;
  title: string;
  description: string | null;
  sequenceNumber: number;
  position: number;
  assigneeId: string | null;
  createdById: string;
  createdAt: Date;
  assignee: { name: string } | null;
  createdBy: { name: string };
}): BacklogItemResponse {
  return {
    id: item.id,
    spaceId: item.spaceId,
    title: item.title,
    description: item.description,
    sequenceNumber: item.sequenceNumber,
    position: item.position,
    assigneeId: item.assigneeId,
    assigneeName: item.assignee?.name ?? null,
    createdById: item.createdById,
    createdByName: item.createdBy.name,
    createdAt: item.createdAt,
  };
}

/**
 * Get all backlog items for a space (ordered by position)
 */
export async function getBacklogItems(spaceId: string): Promise<BacklogItemResponse[]> {
  const items = await prisma.backlogItem.findMany({
    where: { spaceId },
    orderBy: { position: 'asc' },
    include: {
      assignee: { select: { name: true } },
      createdBy: { select: { name: true } },
    },
  });
  return items.map(toResponse);
}

/**
 * Create a backlog item. Only space members can create; createdById = current user.
 */
export async function createBacklogItem(
  spaceId: string,
  data: { title: string; description?: string | null; assigneeId?: string | null },
  createdById: string
): Promise<BacklogItemResponse> {
  const maxPosition = await prisma.backlogItem.aggregate({
    where: { spaceId },
    _max: { position: true },
  });
  const position = (maxPosition._max.position ?? -1) + 1;

  const item = await prisma.backlogItem.create({
    data: {
      spaceId,
      title: data.title,
      description: data.description ?? null,
      assigneeId: data.assigneeId ?? null,
      createdById,
      position,
    },
    include: {
      assignee: { select: { name: true } },
      createdBy: { select: { name: true } },
    },
  });
  return toResponse(item);
}

/**
 * Update a backlog item (title, description, assigneeId). Item must belong to space.
 */
export async function updateBacklogItem(
  spaceId: string,
  itemId: string,
  data: { title?: string; description?: string | null; assigneeId?: string | null }
): Promise<BacklogItemResponse> {
  const item = await prisma.backlogItem.findFirst({
    where: { id: itemId, spaceId },
    include: {
      assignee: { select: { name: true } },
      createdBy: { select: { name: true } },
    },
  });
  if (!item) throw new Error('Backlog item not found');

  const updated = await prisma.backlogItem.update({
    where: { id: itemId },
    data: {
      ...(data.title !== undefined && { title: data.title }),
      ...(data.description !== undefined && { description: data.description ?? null }),
      ...(data.assigneeId !== undefined && { assigneeId: data.assigneeId ?? null }),
    },
    include: {
      assignee: { select: { name: true } },
      createdBy: { select: { name: true } },
    },
  });
  return toResponse(updated);
}

/**
 * Delete a backlog item. Item must belong to space.
 */
export async function deleteBacklogItem(spaceId: string, itemId: string): Promise<void> {
  const item = await prisma.backlogItem.findFirst({
    where: { id: itemId, spaceId },
  });
  if (!item) throw new Error('Backlog item not found');
  await prisma.backlogItem.delete({ where: { id: itemId } });
}

/**
 * Reorder backlog items. Body is ordered array of item ids; positions are set 0, 1, 2, ...
 */
export async function reorderBacklogItems(
  spaceId: string,
  itemIds: string[]
): Promise<BacklogItemResponse[]> {
  const count = await prisma.backlogItem.count({ where: { spaceId } });
  if (itemIds.length !== count) {
    throw new Error('Reorder must include all backlog items for this space');
  }
  const updates = itemIds.map((id, position) =>
    prisma.backlogItem.updateMany({
      where: { id, spaceId },
      data: { position },
    })
  );
  await prisma.$transaction(updates);
  return getBacklogItems(spaceId);
}

