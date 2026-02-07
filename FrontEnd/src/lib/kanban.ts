/**
 * Kanban board local state management and persistence.
 * Mirrors the DB schema (Column, Task, ColumnTask) so it can be
 * wired to real API endpoints when they're added to the server.
 */

// ═══════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════

export interface BoardCard {
  id: string;
  title: string;
  description?: string;
  assigneeId?: string;
  assigneeName?: string;
  sequenceNumber: number;
  position: number;
  createdAt: string;
}

export interface BoardColumn {
  id: string;
  name: string;
  wipLimit?: number;
  position: number;
  color: string; // tailwind color key
  cards: BoardCard[];
}

export interface BoardState {
  columns: BoardColumn[];
  nextSequence: number;
}

// ═══════════════════════════════════════════════════════════════
// Default columns
// ═══════════════════════════════════════════════════════════════

const DEFAULT_COLUMNS: Omit<BoardColumn, "cards">[] = [
  { id: "col-backlog", name: "Backlog", position: 0, color: "zinc" },
  { id: "col-todo", name: "To Do", position: 1, color: "amber" },
  {
    id: "col-in-progress",
    name: "In Progress",
    position: 2,
    color: "blue",
    wipLimit: 5,
  },
  {
    id: "col-review",
    name: "In Review",
    position: 3,
    color: "purple",
    wipLimit: 3,
  },
  { id: "col-done", name: "Done", position: 4, color: "emerald" },
];

// ═══════════════════════════════════════════════════════════════
// Persistence helpers
// ═══════════════════════════════════════════════════════════════

function getStorageKey(spaceId: string, sprintId?: string | null): string {
  if (sprintId) {
    return `kanban-board-${spaceId}-sprint-${sprintId}`;
  }
  return `kanban-board-${spaceId}`;
}

export function loadBoard(
  spaceId: string,
  sprintId?: string | null
): BoardState {
  if (typeof window === "undefined") {
    return createDefaultBoard();
  }
  const key = getStorageKey(spaceId, sprintId);
  const stored = localStorage.getItem(key);
  if (stored) {
    try {
      return JSON.parse(stored) as BoardState;
    } catch {
      // corrupted — reset
    }
  }
  return createDefaultBoard();
}

export function saveBoard(
  spaceId: string,
  board: BoardState,
  sprintId?: string | null
): void {
  if (typeof window === "undefined") return;
  const key = getStorageKey(spaceId, sprintId);
  localStorage.setItem(key, JSON.stringify(board));
}

export function createDefaultBoard(): BoardState {
  return {
    columns: DEFAULT_COLUMNS.map((col) => ({ ...col, cards: [] })),
    nextSequence: 1,
  };
}

// ═══════════════════════════════════════════════════════════════
// Board operations (pure functions)
// ═══════════════════════════════════════════════════════════════

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

export function addCard(
  board: BoardState,
  columnId: string,
  title: string,
  description?: string,
  assigneeId?: string,
  assigneeName?: string
): BoardState {
  const columns = board.columns.map((col) => {
    if (col.id !== columnId) return col;
    const newCard: BoardCard = {
      id: generateId(),
      title,
      description,
      assigneeId,
      assigneeName,
      sequenceNumber: board.nextSequence,
      position: col.cards.length,
      createdAt: new Date().toISOString(),
    };
    return { ...col, cards: [...col.cards, newCard] };
  });
  return { columns, nextSequence: board.nextSequence + 1 };
}

export function removeCard(
  board: BoardState,
  columnId: string,
  cardId: string
): BoardState {
  const columns = board.columns.map((col) => {
    if (col.id !== columnId) return col;
    return {
      ...col,
      cards: col.cards
        .filter((c) => c.id !== cardId)
        .map((c, i) => ({ ...c, position: i })),
    };
  });
  return { ...board, columns };
}

export function moveCard(
  board: BoardState,
  fromColumnId: string,
  toColumnId: string,
  cardId: string,
  toPosition?: number
): BoardState {
  // Find the card
  let movedCard: BoardCard | null = null;
  let columns = board.columns.map((col) => {
    if (col.id !== fromColumnId) return col;
    const card = col.cards.find((c) => c.id === cardId);
    if (card) movedCard = { ...card };
    return {
      ...col,
      cards: col.cards
        .filter((c) => c.id !== cardId)
        .map((c, i) => ({ ...c, position: i })),
    };
  });

  if (!movedCard) return board;

  // Insert into target column
  columns = columns.map((col) => {
    if (col.id !== toColumnId) return col;
    const cards = [...col.cards];
    const pos =
      toPosition !== undefined
        ? Math.min(toPosition, cards.length)
        : cards.length;
    cards.splice(pos, 0, movedCard!);
    return {
      ...col,
      cards: cards.map((c, i) => ({ ...c, position: i })),
    };
  });

  return { ...board, columns };
}

export function updateCard(
  board: BoardState,
  columnId: string,
  cardId: string,
  updates: Partial<
    Pick<BoardCard, "title" | "description" | "assigneeId" | "assigneeName">
  >
): BoardState {
  const columns = board.columns.map((col) => {
    if (col.id !== columnId) return col;
    return {
      ...col,
      cards: col.cards.map((c) => (c.id === cardId ? { ...c, ...updates } : c)),
    };
  });
  return { ...board, columns };
}

export function addColumn(
  board: BoardState,
  name: string,
  wipLimit?: number
): BoardState {
  const newCol: BoardColumn = {
    id: generateId(),
    name,
    wipLimit,
    position: board.columns.length,
    color: "zinc",
    cards: [],
  };
  return { ...board, columns: [...board.columns, newCol] };
}

export function removeColumn(board: BoardState, columnId: string): BoardState {
  return {
    ...board,
    columns: board.columns
      .filter((c) => c.id !== columnId)
      .map((c, i) => ({ ...c, position: i })),
  };
}

export function renameColumn(
  board: BoardState,
  columnId: string,
  name: string
): BoardState {
  return {
    ...board,
    columns: board.columns.map((c) => (c.id === columnId ? { ...c, name } : c)),
  };
}
