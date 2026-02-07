/**
 * Board service - Kanban/Scrum board (columns + cards) in DB.
 * KANBAN: space-level columns (spaceId); cards = BacklogItem + Task + ColumnTask.
 * SCRUM: sprint-level columns (sprintId); cards = BacklogItem + SprintBacklogItem + Task + ColumnTask.
 */
import prisma from '../lib/prisma';

const DEFAULT_COLUMN_SPECS = [
  { name: 'Backlog', position: 0, wipLimit: null as number | null },
  { name: 'To Do', position: 1, wipLimit: null },
  { name: 'In Progress', position: 2, wipLimit: 5 },
  { name: 'In Review', position: 3, wipLimit: 3 },
  { name: 'Done', position: 4, wipLimit: null },
];

export interface BoardCardResponse {
  id: string; // taskId
  title: string;
  description: string | null;
  assigneeId: string | null;
  assigneeName: string | null;
  sequenceNumber: number;
  position: number;
  createdAt: string;
}

export interface BoardColumnResponse {
  id: string;
  name: string;
  wipLimit: number | null;
  position: number;
  cards: BoardCardResponse[];
}

export interface BoardResponse {
  columns: BoardColumnResponse[];
  nextSequence: number;
}

function cardFromTask(
  task: {
    id: string;
    assigneeId?: string | null;
    position: number;
    backlogItem?: {
      title: string;
      description: string | null;
      sequenceNumber: number;
      assigneeId: string | null;
      createdAt: Date;
      assignee: { name: string } | null;
    } | null;
    sprintBacklogItem?: {
      backlogItem: {
        title: string;
        description: string | null;
        sequenceNumber: number;
        assigneeId: string | null;
        createdAt: Date;
        assignee: { name: string } | null;
      };
    } | null;
    assignee: { name: string } | null;
  }
): BoardCardResponse {
  const item = task.backlogItem ?? task.sprintBacklogItem?.backlogItem;
  const assigneeName = task.assignee?.name ?? item?.assignee?.name ?? null;
  const assigneeId = item?.assigneeId ?? (task as { assigneeId?: string | null }).assigneeId ?? null;
  return {
    id: task.id,
    title: item?.title ?? '',
    description: item?.description ?? null,
    assigneeId,
    assigneeName,
    sequenceNumber: item?.sequenceNumber ?? 0,
    position: task.position,
    createdAt: (item?.createdAt ?? new Date()).toISOString(),
  };
}

/**
 * Get or create columns for a space (KANBAN) or sprint (SCRUM).
 */
async function getOrCreateColumns(spaceId: string, sprintId?: string | null): Promise<{ id: string; name: string; wipLimit: number | null; position: number }[]> {
  const where = sprintId ? { sprintId } : { spaceId };
  let cols = await prisma.column.findMany({
    where: { ...where, ...(sprintId ? { spaceId: null } : { sprintId: null }) },
    orderBy: { position: 'asc' },
  });
  if (cols.length === 0) {
    const createData = DEFAULT_COLUMN_SPECS.map((spec) =>
      sprintId
        ? { sprintId, spaceId: null as string | null, name: spec.name, wipLimit: spec.wipLimit, position: spec.position }
        : { spaceId, sprintId: null as string | null, name: spec.name, wipLimit: spec.wipLimit, position: spec.position }
    );
    await prisma.column.createMany({ data: createData });
    cols = await prisma.column.findMany({
      where: { ...where, ...(sprintId ? { spaceId: null } : { sprintId: null }) },
      orderBy: { position: 'asc' },
    });
  }
  return cols.map((c) => ({ id: c.id, name: c.name, wipLimit: c.wipLimit, position: c.position }));
}

/**
 * Get full board state (columns + cards). Creates default columns if none exist.
 */
export async function getBoard(spaceId: string, sprintId?: string | null): Promise<BoardResponse> {
  const columnsMeta = await getOrCreateColumns(spaceId, sprintId);
  const columnIds = columnsMeta.map((c) => c.id);

  const columnTasks = await prisma.columnTask.findMany({
    where: { columnId: { in: columnIds } },
    orderBy: [{ columnId: 'asc' }, { position: 'asc' }],
    include: {
      task: {
        include: {
          backlogItem: {
            select: {
              title: true,
              description: true,
              sequenceNumber: true,
              assigneeId: true,
              createdAt: true,
              assignee: { select: { name: true } },
            },
          },
          sprintBacklogItem: {
            select: {
              backlogItem: {
                select: {
                  title: true,
                  description: true,
                  sequenceNumber: true,
                  assigneeId: true,
                  createdAt: true,
                  assignee: { select: { name: true } },
                },
              },
            },
          },
          assignee: { select: { name: true } },
        },
      },
    },
  });

  const taskToPosition: Record<string, number> = {};
  const taskToCard: Record<string, BoardCardResponse> = {};
  columnTasks.forEach((ct) => {
    taskToPosition[ct.taskId] = ct.position;
    const t = ct.task as unknown as {
      id: string;
      position: number;
      backlogItem?: { title: string; description: string | null; sequenceNumber: number; assigneeId: string | null; createdAt: Date; assignee: { name: string } | null };
      sprintBacklogItem?: { backlogItem: { title: string; description: string | null; sequenceNumber: number; assigneeId: string | null; createdAt: Date; assignee: { name: string } | null } };
      assignee: { name: string } | null;
    };
    t.position = ct.position;
    taskToCard[ct.taskId] = cardFromTask(t);
  });

  const colIdToTaskIds: Record<string, string[]> = {};
  columnTasks.forEach((ct) => {
    const arr = colIdToTaskIds[ct.columnId];
    if (!arr) colIdToTaskIds[ct.columnId] = [ct.taskId];
    else arr.push(ct.taskId);
  });
  columnsMeta.forEach((c) => {
    const arr = colIdToTaskIds[c.id];
    if (!arr) colIdToTaskIds[c.id] = [];
    else arr.sort((a, b) => (taskToPosition[a] ?? 0) - (taskToPosition[b] ?? 0));
  });

  let nextSequence = 1;
  if (sprintId) {
    const maxSeq = await prisma.sprintBacklogItem.findFirst({
      where: { sprintId },
      include: { backlogItem: { select: { sequenceNumber: true } } },
      orderBy: { backlogItem: { sequenceNumber: 'desc' } },
    });
    if (maxSeq?.backlogItem?.sequenceNumber != null) nextSequence = maxSeq.backlogItem.sequenceNumber + 1;
  } else {
    const maxSeq = await prisma.backlogItem.findFirst({
      where: { spaceId },
      orderBy: { sequenceNumber: 'desc' },
      select: { sequenceNumber: true },
    });
    if (maxSeq) nextSequence = maxSeq.sequenceNumber + 1;
  }

  const columns: BoardColumnResponse[] = columnsMeta.map((col) => ({
    id: col.id,
    name: col.name,
    wipLimit: col.wipLimit,
    position: col.position,
    cards: (colIdToTaskIds[col.id] ?? []).map((taskId) => taskToCard[taskId]).filter((c): c is BoardCardResponse => c != null),
  }));

  return { columns, nextSequence };
}

/**
 * Create a card in a column. Creates BacklogItem (+ SprintBacklogItem for SCRUM), Task, ColumnTask.
 * Column is found by id and must belong to this space (either column.spaceId or column.sprint.spaceId).
 */
export async function createCard(
  spaceId: string,
  columnId: string,
  data: { title: string; description?: string | null; assigneeId?: string | null },
  createdById: string,
  _sprintId?: string | null
): Promise<BoardCardResponse> {
  const column = await prisma.column.findUnique({
    where: { id: columnId },
    include: { sprint: { select: { id: true, spaceId: true } } },
  });
  if (!column) throw new Error('Column not found');
  const columnSpaceId = column.spaceId ?? column.sprint?.spaceId;
  if (columnSpaceId !== spaceId) throw new Error('Column not found');
  const sprintId = column.sprintId;

  const maxPos = await prisma.columnTask.aggregate({
    where: { columnId },
    _max: { position: true },
  });
  const position = (maxPos._max.position ?? -1) + 1;

  if (sprintId) {
    const backlogItem = await prisma.backlogItem.create({
      data: {
        spaceId,
        title: data.title,
        description: data.description ?? null,
        assigneeId: data.assigneeId ?? null,
        createdById,
      },
    });
    const sprintBacklogItem = await prisma.sprintBacklogItem.create({
      data: { sprintId, backlogItemId: backlogItem.id },
    });
    const task = await prisma.task.create({
      data: {
        sprintBacklogItemId: sprintBacklogItem.id,
        assigneeId: data.assigneeId ?? null,
      },
      include: {
        sprintBacklogItem: {
          include: {
            backlogItem: {
              include: { assignee: { select: { name: true } } },
            },
          },
        },
        assignee: { select: { name: true } },
      },
    });
    await prisma.columnTask.create({
      data: { columnId, taskId: task.id, position },
    });
    const item = task.sprintBacklogItem!.backlogItem;
    return {
      id: task.id,
      title: item.title,
      description: item.description,
      assigneeId: item.assigneeId,
      assigneeName: item.assignee?.name ?? null,
      sequenceNumber: item.sequenceNumber,
      position,
      createdAt: item.createdAt.toISOString(),
    };
  } else {
    const backlogItem = await prisma.backlogItem.create({
      data: {
        spaceId,
        title: data.title,
        description: data.description ?? null,
        assigneeId: data.assigneeId ?? null,
        createdById,
      },
      include: { assignee: { select: { name: true } } },
    });
    const task = await prisma.task.create({
      data: {
        backlogItemId: backlogItem.id,
        assigneeId: data.assigneeId ?? null,
      },
    });
    await prisma.columnTask.create({
      data: { columnId, taskId: task.id, position },
    });
    return {
      id: task.id,
      title: backlogItem.title,
      description: backlogItem.description,
      assigneeId: backlogItem.assigneeId,
      assigneeName: backlogItem.assignee?.name ?? null,
      sequenceNumber: backlogItem.sequenceNumber,
      position,
      createdAt: backlogItem.createdAt.toISOString(),
    };
  }
}

/**
 * Update card (title, description, assignee). Updates BacklogItem.
 */
export async function updateCard(
  spaceId: string,
  taskId: string,
  data: { title?: string; description?: string | null; assigneeId?: string | null }
): Promise<BoardCardResponse> {
  const task = await prisma.task.findFirst({
    where: { id: taskId },
    include: {
      backlogItem: true,
      sprintBacklogItem: { include: { backlogItem: true } },
    },
  });
  if (!task) throw new Error('Task not found');
  const backlogItemId = task.backlogItemId ?? task.sprintBacklogItem?.backlogItemId;
  if (!backlogItemId) throw new Error('Task has no backlog item');

  const backlogItem = await prisma.backlogItem.findFirst({
    where: { id: backlogItemId, spaceId },
  });
  if (!backlogItem) throw new Error('Backlog item not found');

  await prisma.backlogItem.update({
    where: { id: backlogItemId },
    data: {
      ...(data.title !== undefined && { title: data.title }),
      ...(data.description !== undefined && { description: data.description ?? null }),
      ...(data.assigneeId !== undefined && { assigneeId: data.assigneeId ?? null }),
    },
  });

  const updated = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      backlogItem: { include: { assignee: { select: { name: true } } } },
      sprintBacklogItem: { include: { backlogItem: { include: { assignee: { select: { name: true } } } } } },
      assignee: { select: { name: true } },
      columnTask: true,
    },
  });
  if (!updated) throw new Error('Task not found');
  const item = updated.backlogItem ?? updated.sprintBacklogItem?.backlogItem;
  const ct = updated.columnTask;
  return {
    id: updated.id,
    title: item?.title ?? '',
    description: item?.description ?? null,
    assigneeId: item?.assigneeId ?? null,
    assigneeName: item?.assignee?.name ?? updated.assignee?.name ?? null,
    sequenceNumber: item?.sequenceNumber ?? 0,
    position: ct?.position ?? 0,
    createdAt: (item?.createdAt ?? new Date()).toISOString(),
  };
}

/**
 * Move card to another column (and optional position).
 */
export async function moveCard(
  spaceId: string,
  taskId: string,
  columnId: string,
  position: number
): Promise<void> {
  const task = await prisma.task.findFirst({
    where: { id: taskId },
    include: { backlogItem: { where: { spaceId } }, sprintBacklogItem: true },
  });
  if (!task) throw new Error('Task not found');
  const column = await prisma.column.findFirst({
    where: { id: columnId },
  });
  if (!column) throw new Error('Column not found');
  if (column.spaceId && column.spaceId !== spaceId) throw new Error('Column not in this space');
  if (column.sprintId) {
    const sprint = await prisma.sprint.findFirst({ where: { id: column.sprintId }, select: { spaceId: true } });
    if (!sprint || sprint.spaceId !== spaceId) throw new Error('Column not in this space');
  }

  const existing = await prisma.columnTask.findUnique({
    where: { taskId },
  });
  if (!existing) throw new Error('Card not found on board');

  await prisma.columnTask.update({
    where: { taskId },
    data: { columnId, position },
  });
  const allInColumn = await prisma.columnTask.findMany({
    where: { columnId },
    orderBy: { position: 'asc' },
  });
  const others = allInColumn.filter((ct) => ct.taskId !== taskId);
  const orderedIds = others.map((ct) => ct.taskId);
  orderedIds.splice(Math.min(position, orderedIds.length), 0, taskId);
  await prisma.$transaction(
    orderedIds.map((tid, i) =>
      prisma.columnTask.updateMany({
        where: { taskId: tid, columnId },
        data: { position: i },
      })
    )
  );
}

/**
 * Delete card: delete Task (cascade ColumnTask). For KANBAN delete BacklogItem; for SCRUM delete SprintBacklogItem.
 */
export async function deleteCard(spaceId: string, taskId: string): Promise<void> {
  const task = await prisma.task.findFirst({
    where: { id: taskId },
    include: { backlogItem: true, sprintBacklogItem: true },
  });
  if (!task) throw new Error('Task not found');

  if (task.backlogItemId) {
    if (task.backlogItem?.spaceId !== spaceId) throw new Error('Task not in this space');
    await prisma.task.delete({ where: { id: taskId } });
    await prisma.backlogItem.delete({ where: { id: task.backlogItemId } });
  } else if (task.sprintBacklogItemId) {
    const sprint = await prisma.sprint.findFirst({
      where: { id: task.sprintBacklogItem!.sprintId },
      select: { spaceId: true },
    });
    if (!sprint || sprint.spaceId !== spaceId) throw new Error('Task not in this space');
    await prisma.task.delete({ where: { id: taskId } });
    await prisma.sprintBacklogItem.delete({ where: { id: task.sprintBacklogItemId } });
  } else {
    throw new Error('Task has no backlog item');
  }
}

/**
 * Add a new column (space or sprint).
 */
export async function addColumn(
  spaceId: string,
  name: string,
  wipLimit?: number | null,
  sprintId?: string | null
): Promise<BoardColumnResponse> {
  const columns = await getOrCreateColumns(spaceId, sprintId);
  const maxPos = columns.length > 0 ? Math.max(...columns.map((c) => c.position)) + 1 : 0;
  const col = await prisma.column.create({
    data: sprintId
      ? { sprintId, spaceId: null, name, wipLimit: wipLimit ?? null, position: maxPos }
      : { spaceId, sprintId: null, name, wipLimit: wipLimit ?? null, position: maxPos },
  });
  return { id: col.id, name: col.name, wipLimit: col.wipLimit, position: col.position, cards: [] };
}

/**
 * Remove a column (and delete all cards in it).
 */
export async function removeColumn(spaceId: string, columnId: string, sprintId?: string | null): Promise<void> {
  const column = await prisma.column.findFirst({
    where: { id: columnId, ...(sprintId ? { sprintId } : { spaceId }) },
    include: { columnTasks: { include: { task: true } } },
  });
  if (!column) throw new Error('Column not found');

  for (const ct of column.columnTasks) {
    await deleteCard(spaceId, ct.taskId);
  }
  await prisma.column.delete({ where: { id: columnId } });
}

/**
 * Rename a column.
 */
export async function renameColumn(
  spaceId: string,
  columnId: string,
  name: string,
  sprintId?: string | null
): Promise<void> {
  const column = await prisma.column.findFirst({
    where: { id: columnId, ...(sprintId ? { sprintId } : { spaceId }) },
  });
  if (!column) throw new Error('Column not found');
  await prisma.column.update({ where: { id: columnId }, data: { name } });
}

