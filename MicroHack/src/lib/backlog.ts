/**
 * Product Backlog local state management and persistence.
 * Mirrors the DB schema (BacklogItem) so it can be
 * wired to real API endpoints when they're added to the server.
 */

// ═══════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════

export interface BacklogItem {
  id: string;
  title: string;
  description?: string;
  sequenceNumber: number;
  position: number;
  assigneeId?: string;
  assigneeName?: string;
  createdById: string;
  createdByName: string;
  createdAt: string;
}

export interface BacklogState {
  items: BacklogItem[];
  nextSequence: number;
}

// ═══════════════════════════════════════════════════════════════
// Persistence
// ═══════════════════════════════════════════════════════════════

function getStorageKey(spaceId: string): string {
  return `product-backlog-${spaceId}`;
}

export function loadBacklog(spaceId: string): BacklogState {
  if (typeof window === "undefined") {
    return { items: [], nextSequence: 1 };
  }
  const key = getStorageKey(spaceId);
  const stored = localStorage.getItem(key);
  if (stored) {
    try {
      return JSON.parse(stored) as BacklogState;
    } catch {
      // corrupted — reset
    }
  }
  return { items: [], nextSequence: 1 };
}

export function saveBacklog(spaceId: string, state: BacklogState): void {
  if (typeof window === "undefined") return;
  const key = getStorageKey(spaceId);
  localStorage.setItem(key, JSON.stringify(state));
}

// ═══════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

// ═══════════════════════════════════════════════════════════════
// Operations (pure functions)
// ═══════════════════════════════════════════════════════════════

export function addBacklogItem(
  state: BacklogState,
  title: string,
  createdById: string,
  createdByName: string,
  description?: string,
  assigneeId?: string,
  assigneeName?: string
): BacklogState {
  const newItem: BacklogItem = {
    id: generateId(),
    title,
    description,
    sequenceNumber: state.nextSequence,
    position: state.items.length,
    assigneeId,
    assigneeName,
    createdById,
    createdByName,
    createdAt: new Date().toISOString(),
  };
  return {
    items: [...state.items, newItem],
    nextSequence: state.nextSequence + 1,
  };
}

export function removeBacklogItem(
  state: BacklogState,
  itemId: string
): BacklogState {
  return {
    ...state,
    items: state.items
      .filter((i) => i.id !== itemId)
      .map((i, idx) => ({ ...i, position: idx })),
  };
}

export function updateBacklogItem(
  state: BacklogState,
  itemId: string,
  updates: Partial<
    Pick<BacklogItem, "title" | "description" | "assigneeId" | "assigneeName">
  >
): BacklogState {
  return {
    ...state,
    items: state.items.map((i) => (i.id === itemId ? { ...i, ...updates } : i)),
  };
}

export function reorderBacklogItem(
  state: BacklogState,
  itemId: string,
  newPosition: number
): BacklogState {
  const item = state.items.find((i) => i.id === itemId);
  if (!item) return state;

  const without = state.items.filter((i) => i.id !== itemId);
  const pos = Math.min(newPosition, without.length);
  without.splice(pos, 0, item);

  return {
    ...state,
    items: without.map((i, idx) => ({ ...i, position: idx })),
  };
}
