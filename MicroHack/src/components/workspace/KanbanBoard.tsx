"use client";
//
import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Trash2,
  GripVertical,
  MoreHorizontal,
  X,
  Hash,
  Edit3,
  AlertCircle,
  Check,
  Target,
  Play,
  Clock,
  CheckCircle,
  Loader2,
  User,
  UserPlus,
  FileText,
  LayoutDashboard,
} from "lucide-react";
import type { SpaceMember, Sprint } from "@/lib/api";
import {
  api,
  type ApiBoardResponse,
  type ApiBoardColumn,
  type ApiBoardCard,
} from "@/lib/api";

// ═══════════════════════════════════════════════════════════════
// Props
// ═══════════════════════════════════════════════════════════════

interface KanbanBoardProps {
  spaceId: string;
  methodology: "KANBAN" | "SCRUM";
  members: SpaceMember[];
  sprints?: Sprint[];
  triggerAddToFirstColumn?: boolean;
  onAddTriggered?: () => void;
  isScrumMaster?: boolean;
  currentUserId?: string;
}

// ═══════════════════════════════════════════════════════════════
// Column color map
// ═══════════════════════════════════════════════════════════════

const COLUMN_COLORS: Record<
  string,
  { header: string; dot: string; badge: string }
> = {
  zinc: {
    header: "text-zinc-600 dark:text-zinc-400",
    dot: "bg-zinc-400",
    badge: "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400",
  },
  amber: {
    header: "text-amber-600 dark:text-amber-400",
    dot: "bg-amber-400",
    badge:
      "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400",
  },
  blue: {
    header: "text-blue-600 dark:text-blue-400",
    dot: "bg-blue-400",
    badge: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400",
  },
  purple: {
    header: "text-purple-600 dark:text-purple-400",
    dot: "bg-purple-400",
    badge:
      "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400",
  },
  emerald: {
    header: "text-emerald-600 dark:text-emerald-400",
    dot: "bg-emerald-400",
    badge:
      "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400",
  },
};

const COLUMN_NAME_TO_COLOR: Record<string, string> = {
  Backlog: "zinc",
  "To Do": "amber",
  "In Progress": "blue",
  "In Review": "purple",
  Done: "emerald",
};

function getColors(color: string) {
  return COLUMN_COLORS[color] || COLUMN_COLORS.zinc;
}

function columnColor(col: ApiBoardColumn): string {
  return COLUMN_NAME_TO_COLOR[col.name] || "zinc";
}

// ═══════════════════════════════════════════════════════════════
// Main Board
// ═══════════════════════════════════════════════════════════════

const KanbanBoard: React.FC<KanbanBoardProps> = ({
  spaceId,
  methodology,
  members,
  sprints,
  triggerAddToFirstColumn,
  onAddTriggered,
  isScrumMaster = false,
  currentUserId,
}) => {
  // SCRUM sprint selector
  const [selectedSprintId, setSelectedSprintId] = useState<string | null>(null);
  const activeSprint = sprints?.find((s) => s.status === "ACTIVE");

  useEffect(() => {
    if (methodology === "SCRUM" && activeSprint && !selectedSprintId) {
      setSelectedSprintId(activeSprint.id);
    }
  }, [methodology, activeSprint, selectedSprintId]);

  const boardKey = methodology === "SCRUM" ? selectedSprintId : null;

  const [board, setBoard] = useState<ApiBoardResponse>({
    columns: [],
    nextSequence: 0,
  });
  const [boardLoading, setBoardLoading] = useState(true);
  const [boardError, setBoardError] = useState<string | null>(null);

  const fetchBoard = useCallback(async () => {
    setBoardLoading(true);
    setBoardError(null);
    try {
      const res = await api.getBoard(spaceId, boardKey);
      if (res.success && res.data) setBoard(res.data);
      else setBoard({ columns: [], nextSequence: 0 });
    } catch {
      setBoardError("Failed to load board");
      setBoard({ columns: [], nextSequence: 0 });
    } finally {
      setBoardLoading(false);
    }
  }, [spaceId, boardKey]);

  useEffect(() => {
    fetchBoard();
  }, [fetchBoard]);

  // Drag state
  const [dragCardId, setDragCardId] = useState<string | null>(null);
  const [dragFromCol, setDragFromCol] = useState<string | null>(null);
  const [dropTargetCol, setDropTargetCol] = useState<string | null>(null);

  // Add card state
  const [addingToCol, setAddingToCol] = useState<string | null>(null);
  const [newCardTitle, setNewCardTitle] = useState("");
  const [newCardDesc, setNewCardDesc] = useState("");
  const [newCardAssignee, setNewCardAssignee] = useState("");
  const addInputRef = useRef<HTMLInputElement>(null);

  // Edit card state
  const [editingCard, setEditingCard] = useState<{
    columnId: string;
    card: ApiBoardCard;
  } | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editAssignee, setEditAssignee] = useState("");

  // Column menu
  const [columnMenu, setColumnMenu] = useState<string | null>(null);
  const [renamingCol, setRenamingCol] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  // Add column
  const [showAddColumn, setShowAddColumn] = useState(false);
  const [newColName, setNewColName] = useState("");

  // Quick assign state
  const [quickAssignCardId, setQuickAssignCardId] = useState<string | null>(null);

  // Detail modal state
  const [detailCard, setDetailCard] = useState<{
    columnId: string;
    card: ApiBoardCard;
  } | null>(null);

  // Get the selected sprint to check its status
  const selectedSprint = sprints?.find((s) => s.id === selectedSprintId);
  const isSprintActive = selectedSprint?.status === "ACTIVE";
  
  // Check if user can edit the board
  const canEditBoard = methodology === "KANBAN" || (methodology === "SCRUM" && isScrumMaster);
  // Board is "published" (viewable by team) when sprint is ACTIVE
  const canViewBoard = methodology === "KANBAN" || (methodology === "SCRUM" && isSprintActive);

  // Focus input when adding card
  useEffect(() => {
    if (addingToCol && addInputRef.current) {
      addInputRef.current.focus();
    }
  }, [addingToCol]);

  // Handle external trigger to add card to first column
  useEffect(() => {
    if (triggerAddToFirstColumn && board.columns.length > 0 && !addingToCol) {
      const firstColumn = board.columns[0];
      if (firstColumn) {
        setAddingToCol(firstColumn.id);
        onAddTriggered?.();
      }
    }
  }, [triggerAddToFirstColumn, board.columns, addingToCol, onAddTriggered]);

  // ─── Handlers ────────────────────────────────────────────

  const handleAddCard = async (columnId: string) => {
    if (!newCardTitle.trim()) return;
    try {
      const res = await api.createBoardCard(spaceId, {
        columnId,
        title: newCardTitle.trim(),
        description: newCardDesc.trim() || undefined,
        assigneeId: newCardAssignee || undefined,
        sprintId: boardKey,
      });
      if (res.success && res.data) {
        setBoard((prev) => ({
          ...prev,
          columns: prev.columns.map((col) =>
            col.id === columnId
              ? { ...col, cards: [...col.cards, res.data!] }
              : col
          ),
        }));
        setNewCardTitle("");
        setNewCardDesc("");
        setNewCardAssignee("");
        setAddingToCol(null);
      }
    } catch {
      setBoardError("Failed to add card");
    }
  };

  const handleRemoveCard = async (columnId: string, cardId: string) => {
    if (!confirm("Delete this card?")) return;
    try {
      const res = await api.deleteBoardCard(spaceId, cardId);
      if (res.success) {
        setBoard((prev) => ({
          ...prev,
          columns: prev.columns.map((col) =>
            col.id === columnId
              ? { ...col, cards: col.cards.filter((c) => c.id !== cardId) }
              : col
          ),
        }));
      }
    } catch {
      setBoardError("Failed to delete card");
    }
  };

  const handleEditSave = async () => {
    if (!editingCard || !editTitle.trim()) return;
    try {
      const res = await api.updateBoardCard(spaceId, editingCard.card.id, {
        title: editTitle.trim(),
        description: editDesc.trim() || undefined,
        assigneeId: editAssignee || undefined,
      });
      if (res.success && res.data) {
        setBoard((prev) => ({
          ...prev,
          columns: prev.columns.map((col) =>
            col.id === editingCard.columnId
              ? {
                ...col,
                cards: col.cards.map((c) =>
                  c.id === editingCard.card.id ? res.data! : c
                ),
              }
              : col
          ),
        }));
        setEditingCard(null);
      }
    } catch {
      setBoardError("Failed to update card");
    }
  };

  const openEdit = (columnId: string, card: ApiBoardCard) => {
    setEditingCard({ columnId, card });
    setEditTitle(card.title);
    setEditDesc(card.description || "");
    setEditAssignee(card.assigneeId || "");
  };

  const handleQuickAssign = async (cardId: string, columnId: string, assigneeId: string) => {
    try {
      const res = await api.updateBoardCard(spaceId, cardId, {
        assigneeId: assigneeId || undefined,
      });
      if (res.success && res.data) {
        setBoard((prev) => ({
          ...prev,
          columns: prev.columns.map((col) =>
            col.id === columnId
              ? {
                  ...col,
                  cards: col.cards.map((c) =>
                    c.id === cardId ? res.data! : c
                  ),
                }
              : col
          ),
        }));
        setQuickAssignCardId(null);
      }
    } catch {
      setBoardError("Failed to update assignment");
    }
  };

  // Drag & Drop
  const handleDragStart = (
    e: React.DragEvent,
    cardId: string,
    fromCol: string
  ) => {
    setDragCardId(cardId);
    setDragFromCol(fromCol);
    e.dataTransfer.effectAllowed = "move";
    const el = e.currentTarget as HTMLElement;
    e.dataTransfer.setDragImage(el, 20, 20);
  };

  const handleDragOver = (e: React.DragEvent, colId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDropTargetCol(colId);
  };

  const handleDragLeave = () => {
    setDropTargetCol(null);
  };

  const handleDrop = async (e: React.DragEvent, toColId: string) => {
    e.preventDefault();
    if (!dragCardId || !dragFromCol) {
      setDragCardId(null);
      setDragFromCol(null);
      setDropTargetCol(null);
      return;
    }
    const toCol = board.columns.find((c) => c.id === toColId);
    const position = toCol ? toCol.cards.length : 0;
    try {
      const res = await api.moveBoardCard(spaceId, dragCardId, toColId, position);
      if (res.success) {
        setBoard((prev) => {
          const fromCol = prev.columns.find((c) => c.id === dragFromCol);
          const card = fromCol?.cards.find((c) => c.id === dragCardId);
          if (!card || !fromCol) return prev;
          return {
            ...prev,
            columns: prev.columns.map((col) => {
              if (col.id === dragFromCol)
                return { ...col, cards: col.cards.filter((c) => c.id !== dragCardId) };
              if (col.id === toColId)
                return { ...col, cards: [...col.cards, { ...card, position }] };
              return col;
            }),
          };
        });
      }
    } catch {
      setBoardError("Failed to move card");
    }
    setDragCardId(null);
    setDragFromCol(null);
    setDropTargetCol(null);
  };

  const handleDragEnd = () => {
    setDragCardId(null);
    setDragFromCol(null);
    setDropTargetCol(null);
  };

  const handleAddColumn = async () => {
    if (!newColName.trim()) return;
    try {
      const res = await api.addBoardColumn(spaceId, {
        name: newColName.trim(),
        sprintId: boardKey,
      });
      if (res.success && res.data) {
        setBoard((prev) => ({
          ...prev,
          columns: [...prev.columns, res.data!],
        }));
        setNewColName("");
        setShowAddColumn(false);
      }
    } catch {
      setBoardError("Failed to add column");
    }
  };

  const handleRemoveColumn = async (colId: string) => {
    const col = board.columns.find((c) => c.id === colId);
    if (col && col.cards.length > 0) {
      if (!confirm(`Delete "${col.name}" and its ${col.cards.length} card(s)?`))
        return;
    }
    try {
      const res = await api.removeBoardColumn(spaceId, colId, boardKey);
      if (res.success) {
        setBoard((prev) => ({
          ...prev,
          columns: prev.columns.filter((c) => c.id !== colId),
        }));
        setColumnMenu(null);
      }
    } catch {
      setBoardError("Failed to delete column");
    }
  };

  const handleRenameColumn = async (colId: string) => {
    if (!renameValue.trim()) return;
    try {
      const res = await api.renameBoardColumn(spaceId, colId, renameValue.trim(), boardKey);
      if (res.success) {
        setBoard((prev) => ({
          ...prev,
          columns: prev.columns.map((c) =>
            c.id === colId ? { ...c, name: renameValue.trim() } : c
          ),
        }));
        setRenamingCol(null);
        setColumnMenu(null);
      }
    } catch {
      setBoardError("Failed to rename column");
    }
  };

  const getSprintStatusIcon = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return <Play size={12} />;
      case "PLANNING":
        return <Clock size={12} />;
      case "COMPLETED":
        return <CheckCircle size={12} />;
      default:
        return <Clock size={12} />;
    }
  };

  const getSprintStatusColor = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 dark:text-emerald-400";
      case "PLANNING":
        return "text-amber-600 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400";
      case "COMPLETED":
        return "text-zinc-500 bg-zinc-100 dark:bg-zinc-800 dark:text-zinc-400";
      default:
        return "text-zinc-500";
    }
  };

  // ─── Render ──────────────────────────────────────────────

  if (boardLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div>
      {boardError && (
        <div className="mb-4 px-4 py-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-700 dark:text-red-300">
          {boardError}
        </div>
      )}
      {/* SCRUM Sprint Selector */}
      {methodology === "SCRUM" && (
        <div className="mb-6 space-y-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Target size={18} className="text-indigo-500" />
              <span className="text-sm font-bold text-zinc-700 dark:text-zinc-300">
                Sprint Board:
              </span>
            </div>
            {sprints && sprints.length > 0 ? (
              <div className="flex gap-2 flex-wrap">
                {sprints.map((sprint) => (
                  <button
                    key={sprint.id}
                    onClick={() => setSelectedSprintId(sprint.id)}
                    className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all border ${selectedSprintId === sprint.id
                        ? "bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-200 dark:shadow-indigo-900/30"
                        : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:border-indigo-300"
                      }`}
                  >
                    {getSprintStatusIcon(sprint.status)}
                    {sprint.name}
                    <span
                      className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-md ${selectedSprintId === sprint.id
                          ? "bg-white/20 text-white"
                          : getSprintStatusColor(sprint.status)
                        }`}
                    >
                      {sprint.status}
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-sm text-zinc-400">
                No sprints created yet. Create a sprint to use the sprint board.
              </p>
            )}
          </div>
          {methodology === "SCRUM" && selectedSprint && !isSprintActive && (
            <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <AlertCircle size={18} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-amber-900 dark:text-amber-100 mb-1">
                    Board Not Available
                  </h4>
                  <p className="text-xs text-amber-700 dark:text-amber-300">
                    {isScrumMaster
                      ? "Organize tasks by priority and points. The board will be available to the team once the sprint is started."
                      : "The Scrum Master is organizing the board. It will be available once the sprint starts."}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Board */}
      {canViewBoard ? (
        <div className="flex gap-5 overflow-x-auto pb-6 min-h-[80vh]">
        {board.columns.map((column) => {
          const colors = getColors(columnColor(column));
          const isOverWip = column.wipLimit
            ? column.cards.length > column.wipLimit
            : false;
          const isDropTarget =
            dropTargetCol === column.id && dragFromCol !== column.id;

          return (
            <div
              key={column.id}
              className={`shrink-0 w-80 flex flex-col rounded-2xl transition-all duration-200 ${isDropTarget
                  ? "bg-indigo-50 dark:bg-indigo-900/10 ring-2 ring-indigo-300 dark:ring-indigo-700"
                  : "bg-zinc-100/60 dark:bg-zinc-900/40"
                }`}
              onDragOver={canEditBoard ? (e) => handleDragOver(e, column.id) : undefined}
              onDragLeave={canEditBoard ? handleDragLeave : undefined}
              onDrop={canEditBoard ? (e) => handleDrop(e, column.id) : undefined}
            >
              {/* Column Header */}
              <div className="px-4 pt-4 pb-2 flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <div className={`w-2.5 h-2.5 rounded-full ${colors.dot}`} />
                  {renamingCol === column.id ? (
                    <div className="flex items-center gap-1">
                      <input
                        autoFocus
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleRenameColumn(column.id);
                          if (e.key === "Escape") setRenamingCol(null);
                        }}
                        className="w-28 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg px-2 py-0.5 text-sm font-bold outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                      <button
                        onClick={() => handleRenameColumn(column.id)}
                        className="text-indigo-500 hover:text-indigo-600"
                      >
                        <Check size={14} />
                      </button>
                    </div>
                  ) : (
                    <h3
                      className={`text-sm font-bold uppercase tracking-wider truncate ${colors.header}`}
                    >
                      {column.name}
                    </h3>
                  )}
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${isOverWip
                        ? "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"
                        : colors.badge
                      }`}
                  >
                    {column.cards.length}
                    {column.wipLimit ? `/${column.wipLimit}` : ""}
                  </span>
                </div>

                {/* Column actions */}
                {canEditBoard && (
                  <div className="relative">
                    <button
                      onClick={() =>
                        setColumnMenu(columnMenu === column.id ? null : column.id)
                      }
                      className="p-1 rounded-lg text-zinc-400 hover:text-zinc-600 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors"
                    >
                      <MoreHorizontal size={16} />
                    </button>
                  <AnimatePresence>
                    {columnMenu === column.id && (
                      <>
                        <div
                          className="fixed inset-0 z-10"
                          onClick={() => setColumnMenu(null)}
                        />
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          className="absolute right-0 top-8 w-40 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl z-20 overflow-hidden"
                        >
                          <button
                            onClick={() => {
                              setRenamingCol(column.id);
                              setRenameValue(column.name);
                              setColumnMenu(null);
                            }}
                            className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                          >
                            <Edit3 size={14} /> Rename
                          </button>
                          <button
                            onClick={() => handleRemoveColumn(column.id)}
                            className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 border-t border-zinc-100 dark:border-zinc-800"
                          >
                            <Trash2 size={14} /> Delete
                          </button>
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                  </div>
                )}
              </div>

              {/* WIP Limit Warning */}
              {isOverWip && (
                <div className="mx-4 mb-2 flex items-center gap-1.5 px-2.5 py-1.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <AlertCircle size={12} className="text-red-500 shrink-0" />
                  <span className="text-[10px] font-semibold text-red-600 dark:text-red-400">
                    WIP limit exceeded
                  </span>
                </div>
              )}

              {/* Cards */}
              <div className="flex-1 px-3 pb-3 space-y-2.5 overflow-y-auto min-h-[400px]">
                {column.cards.map((card) => (
                  <motion.div
                    key={card.id}
                    layout
                    layoutId={card.id}
                    draggable={canEditBoard}
                    onDragStart={canEditBoard ? (e) =>
                      handleDragStart(
                        e as unknown as React.DragEvent,
                        card.id,
                        column.id
                      ) : undefined}
                    onDragEnd={canEditBoard ? handleDragEnd : undefined}
                    onDoubleClick={() => setDetailCard({ columnId: column.id, card })}
                    className={`group bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3.5 ${canEditBoard ? "cursor-grab active:cursor-grabbing" : "cursor-default"} shadow-sm hover:shadow-md hover:border-indigo-200 dark:hover:border-indigo-800 transition-all ${dragCardId === card.id ? "opacity-40 scale-95" : ""
                      }`}
                  >
                    {/* Card top bar */}
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-bold text-zinc-400 flex items-center gap-1">
                        <Hash size={10} />
                        {card.sequenceNumber}
                      </span>
                      {canEditBoard && (
                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => openEdit(column.id, card)}
                            className="p-1 rounded-md text-zinc-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
                          >
                            <Edit3 size={12} />
                          </button>
                          <button
                            onClick={() => handleRemoveCard(column.id, card.id)}
                            className="p-1 rounded-md text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Title */}
                    <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 leading-snug mb-1">
                      {card.title}
                    </p>

                    {/* Description */}
                    {card.description && (
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2 mb-2">
                        {card.description}
                      </p>
                    )}

                    {/* Assignee Section */}
                    <div className="flex items-center justify-between mt-2">
                      {card.assigneeName ? (
                        <div className="flex items-center gap-1.5 flex-1 min-w-0">
                          <div className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 text-[10px] font-bold shrink-0">
                            {card.assigneeName.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-[11px] text-zinc-600 dark:text-zinc-400 font-medium truncate">
                            {card.assigneeName}
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 flex-1 min-w-0">
                          <div className="w-6 h-6 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400 shrink-0">
                            <User size={12} />
                          </div>
                          <span className="text-[11px] text-zinc-400 italic">
                            Unassigned
                          </span>
                        </div>
                      )}
                      {canEditBoard && (
                        <div className="relative shrink-0">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setQuickAssignCardId(quickAssignCardId === card.id ? null : card.id);
                            }}
                            className="p-1 rounded-md text-zinc-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors opacity-0 group-hover:opacity-100"
                            title="Assign task"
                          >
                            {card.assigneeName ? (
                              <Edit3 size={12} />
                            ) : (
                              <UserPlus size={12} />
                            )}
                          </button>
                        {quickAssignCardId === card.id && (
                          <>
                            <div
                              className="fixed inset-0 z-10"
                              onClick={() => setQuickAssignCardId(null)}
                            />
                            <motion.div
                              initial={{ opacity: 0, scale: 0.95, y: -10 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              className="absolute right-0 top-8 w-48 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl z-20 overflow-hidden"
                            >
                              <div className="p-2">
                                <div className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 px-2 py-1 mb-1">
                                  Assign to:
                                </div>
                                <button
                                  onClick={() => handleQuickAssign(card.id, column.id, "")}
                                  className={`w-full text-left px-2 py-1.5 text-xs rounded-lg transition-colors ${
                                    !card.assigneeId
                                      ? "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400"
                                      : "hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                                  }`}
                                >
                                  <div className="flex items-center gap-2">
                                    <User size={12} />
                                    <span>Unassigned</span>
                                  </div>
                                </button>
                                {members.map((m) => (
                                  <button
                                    key={m.userId}
                                    onClick={() => handleQuickAssign(card.id, column.id, m.userId)}
                                    className={`w-full text-left px-2 py-1.5 text-xs rounded-lg transition-colors ${
                                      card.assigneeId === m.userId
                                        ? "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400"
                                        : "hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                                    }`}
                                  >
                                    <div className="flex items-center gap-2">
                                      <div className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 text-[9px] font-bold shrink-0">
                                        {(m.user?.name || m.user?.email || m.userId).charAt(0).toUpperCase()}
                                      </div>
                                      <span className="truncate">
                                        {m.user?.name || m.user?.email || m.userId}
                                      </span>
                                      {card.assigneeId === m.userId && (
                                        <Check size={12} className="ml-auto shrink-0" />
                                      )}
                                    </div>
                                  </button>
                                ))}
                              </div>
                            </motion.div>
                          </>
                        )}
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}

                {/* Inline Add Card */}
                {canEditBoard && addingToCol === column.id ? (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white dark:bg-zinc-900 border border-indigo-200 dark:border-indigo-800 rounded-xl p-3.5 shadow-md"
                  >
                    <input
                      ref={addInputRef}
                      value={newCardTitle}
                      onChange={(e) => setNewCardTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && newCardTitle.trim())
                          handleAddCard(column.id);
                        if (e.key === "Escape") setAddingToCol(null);
                      }}
                      placeholder="Card title..."
                      className="w-full bg-transparent text-sm font-semibold text-zinc-900 dark:text-zinc-100 outline-none placeholder:text-zinc-400 mb-2"
                    />
                    <textarea
                      value={newCardDesc}
                      onChange={(e) => setNewCardDesc(e.target.value)}
                      placeholder="Description (optional)"
                      rows={2}
                      className="w-full bg-zinc-50 dark:bg-zinc-950 text-xs text-zinc-700 dark:text-zinc-300 rounded-lg p-2 outline-none border border-zinc-200 dark:border-zinc-800 resize-none mb-2"
                    />
                    {members.length > 0 && (
                      <select
                        value={newCardAssignee}
                        onChange={(e) => setNewCardAssignee(e.target.value)}
                        className="w-full bg-zinc-50 dark:bg-zinc-950 text-xs text-zinc-700 dark:text-zinc-300 rounded-lg p-2 outline-none border border-zinc-200 dark:border-zinc-800 mb-2"
                      >
                        <option value="">Unassigned</option>
                        {members.map((m) => (
                          <option key={m.userId} value={m.userId}>
                            {m.user?.name || m.user?.email || m.userId}
                          </option>
                        ))}
                      </select>
                    )}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleAddCard(column.id)}
                        disabled={!newCardTitle.trim()}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-lg text-xs font-bold transition-colors"
                      >
                        Add Card
                      </button>
                      <button
                        onClick={() => {
                          setAddingToCol(null);
                          setNewCardTitle("");
                          setNewCardDesc("");
                          setNewCardAssignee("");
                        }}
                        className="p-1.5 text-zinc-400 hover:text-zinc-600 rounded-lg"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </motion.div>
                ) : canEditBoard ? (
                  <button
                    onClick={() => setAddingToCol(column.id)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-zinc-400 hover:text-indigo-600 hover:bg-white dark:hover:bg-zinc-900/50 rounded-xl transition-colors"
                  >
                    <Plus size={14} />
                    Add a card
                  </button>
                ) : null}
              </div>
            </div>
          );
        })}

        {/* Add Column */}
        {canEditBoard && (
          <div className="shrink-0 w-80">
            {showAddColumn ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4"
            >
              <input
                autoFocus
                value={newColName}
                onChange={(e) => setNewColName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newColName.trim()) handleAddColumn();
                  if (e.key === "Escape") setShowAddColumn(false);
                }}
                placeholder="Column name..."
                className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-500 mb-3"
              />
              <div className="flex items-center gap-2">
                <button
                  onClick={handleAddColumn}
                  disabled={!newColName.trim()}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-xl text-xs font-bold transition-colors"
                >
                  Add Column
                </button>
                <button
                  onClick={() => {
                    setShowAddColumn(false);
                    setNewColName("");
                  }}
                  className="p-2 text-zinc-400 hover:text-zinc-600 rounded-xl"
                >
                  <X size={14} />
                </button>
              </div>
            </motion.div>
          ) : (
            <button
              onClick={() => setShowAddColumn(true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-4 bg-zinc-100/40 dark:bg-zinc-900/20 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl text-sm font-semibold text-zinc-400 hover:text-indigo-600 hover:border-indigo-300 dark:hover:border-indigo-700 transition-all"
            >
              <Plus size={18} />
              Add Column
            </button>
          )}
          </div>
        )}
        </div>
      ) : methodology === "SCRUM" && !isScrumMaster ? (
        <div className="flex items-center justify-center py-24 bg-zinc-50 dark:bg-zinc-950 rounded-2xl border border-zinc-200 dark:border-zinc-800">
          <div className="text-center max-w-md">
            <AlertCircle size={48} className="mx-auto text-amber-500 dark:text-amber-400 mb-4" />
            <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-2">
              Board Not Available
            </h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              The Scrum Master is organizing tasks by priority and points. The board will be available once published.
            </p>
          </div>
        </div>
      ) : null}

      {/* Edit Card Modal */}
      <AnimatePresence>
        {editingCard && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditingCard(null)}
              className="fixed inset-0 bg-zinc-950/60 backdrop-blur-sm z-60"
            />
            <div className="fixed inset-0 flex items-center justify-center z-70 p-4 pointer-events-none">
              <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-3xl shadow-2xl pointer-events-auto border border-zinc-200 dark:border-zinc-800"
              >
                <div className="p-6">
                  <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-zinc-400 flex items-center gap-1">
                        <Hash size={12} /> {editingCard.card.sequenceNumber}
                      </span>
                      <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                        Edit Card
                      </h3>
                    </div>
                    <button
                      onClick={() => setEditingCard(null)}
                      className="p-2 rounded-xl text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    >
                      <X size={18} />
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1 block">
                        Title
                      </label>
                      <input
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1 block">
                        Description
                      </label>
                      <textarea
                        value={editDesc}
                        onChange={(e) => setEditDesc(e.target.value)}
                        rows={3}
                        className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                      />
                    </div>
                    {members.length > 0 && (
                      <div>
                        <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1 block">
                          Assignee
                        </label>
                        <select
                          value={editAssignee}
                          onChange={(e) => setEditAssignee(e.target.value)}
                          className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                          <option value="">Unassigned</option>
                          {members.map((m) => (
                            <option key={m.userId} value={m.userId}>
                              {m.user?.name || m.user?.email || m.userId}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end gap-3 mt-6">
                    <button
                      onClick={() => setEditingCard(null)}
                      className="px-5 py-2.5 text-sm font-bold text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleEditSave}
                      disabled={!editTitle.trim()}
                      className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white text-sm font-bold rounded-xl transition-colors"
                    >
                      Save Changes
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>

      {/* Card Detail Modal */}
      <AnimatePresence>
        {detailCard && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDetailCard(null)}
              className="fixed inset-0 bg-zinc-950/60 backdrop-blur-sm z-60"
            />
            <div className="fixed inset-0 flex items-center justify-center z-70 p-4 pointer-events-none">
              <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white dark:bg-zinc-900 w-full max-w-2xl rounded-3xl shadow-2xl pointer-events-auto border border-zinc-200 dark:border-zinc-800 max-h-[90vh] overflow-hidden flex flex-col"
              >
                {/* Header */}
                <div className="p-6 border-b border-zinc-200 dark:border-zinc-800">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                        <Hash size={20} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
                            {detailCard.card.title}
                          </h3>
                          <span className="text-xs font-bold text-zinc-400">
                            #{detailCard.card.sequenceNumber}
                          </span>
                        </div>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400">
                          {board.columns.find((col) => col.id === detailCard.columnId)?.name || "Unknown Column"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setDetailCard(null);
                          openEdit(detailCard.columnId, detailCard.card);
                        }}
                        className="p-2 rounded-xl text-zinc-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
                        title="Edit card"
                      >
                        <Edit3 size={18} />
                      </button>
                      <button
                        onClick={() => setDetailCard(null)}
                        className="p-2 rounded-xl text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                      >
                        <X size={18} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                  {/* Description */}
                  <div>
                    <h4 className="text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-2 flex items-center gap-2">
                      <FileText size={16} />
                      Description
                    </h4>
                    {detailCard.card.description ? (
                      <p className="text-sm text-zinc-600 dark:text-zinc-400 whitespace-pre-wrap bg-zinc-50 dark:bg-zinc-950 rounded-xl p-4 border border-zinc-200 dark:border-zinc-800">
                        {detailCard.card.description}
                      </p>
                    ) : (
                      <p className="text-sm text-zinc-400 italic bg-zinc-50 dark:bg-zinc-950 rounded-xl p-4 border border-zinc-200 dark:border-zinc-800">
                        No description provided
                      </p>
                    )}
                  </div>

                  {/* Assignee */}
                  <div>
                    <h4 className="text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-2 flex items-center gap-2">
                      <User size={16} />
                      Assignee
                    </h4>
                    {detailCard.card.assigneeName ? (
                      <div className="flex items-center gap-3 bg-zinc-50 dark:bg-zinc-950 rounded-xl p-4 border border-zinc-200 dark:border-zinc-800">
                        <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold">
                          {detailCard.card.assigneeName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                            {detailCard.card.assigneeName}
                          </p>
                          {detailCard.card.assigneeId && (
                            <p className="text-xs text-zinc-500">
                              ID: {detailCard.card.assigneeId}
                            </p>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 bg-zinc-50 dark:bg-zinc-950 rounded-xl p-4 border border-zinc-200 dark:border-zinc-800">
                        <div className="w-10 h-10 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center text-zinc-400">
                          <User size={20} />
                        </div>
                        <p className="text-sm text-zinc-400 italic">Unassigned</p>
                      </div>
                    )}
                  </div>

                  {/* Column Info */}
                  <div>
                    <h4 className="text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-2 flex items-center gap-2">
                      <LayoutDashboard size={16} />
                      Column
                    </h4>
                    <div className="bg-zinc-50 dark:bg-zinc-950 rounded-xl p-4 border border-zinc-200 dark:border-zinc-800">
                      <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                        {board.columns.find((col) => col.id === detailCard.columnId)?.name || "Unknown Column"}
                      </p>
                      <p className="text-xs text-zinc-500 mt-1">
                        Position: {(board.columns.find((col) => col.id === detailCard.columnId)?.cards.findIndex((c) => c.id === detailCard.card.id) ?? -1) + 1} of {board.columns.find((col) => col.id === detailCard.columnId)?.cards.length ?? 0}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-zinc-200 dark:border-zinc-800 flex justify-end gap-3">
                  <button
                    onClick={() => setDetailCard(null)}
                    className="px-5 py-2.5 text-sm font-bold text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => {
                      setDetailCard(null);
                      openEdit(detailCard.columnId, detailCard.card);
                    }}
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl transition-colors inline-flex items-center gap-2"
                  >
                    <Edit3 size={16} />
                    Edit Card
                  </button>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default KanbanBoard;
