"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Trash2,
  Edit3,
  Hash,
  GripVertical,
  ClipboardList,
  ChevronDown,
  ChevronUp,
  ShieldAlert,
  Loader2,
  Filter,
  CheckCircle,
  Clock,
} from "lucide-react";
import type { SpaceMember } from "@/lib/api";
import { api, type ApiBacklogItem } from "@/lib/api";
import { reorderBacklogItem, type BacklogItem } from "@/lib/backlog";

// ═══════════════════════════════════════════════════════════════
// Props
// ═══════════════════════════════════════════════════════════════

interface ProductBacklogProps {
  spaceId: string;
  members: SpaceMember[];
  currentUserId: string;
  currentUserName: string;
  currentUserScrumRole?: string | null;
  sprints?: Array<{ id: string; status: string }>;
}

const ProductBacklog: React.FC<ProductBacklogProps> = ({
  spaceId,
  members,
  currentUserId,
  currentUserName,
  currentUserScrumRole,
  sprints = [],
}) => {
  const [items, setItems] = useState<ApiBacklogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filter state: "all" | "active" | "terminated"
  const [filter, setFilter] = useState<"all" | "active" | "terminated">("all");
  
  // Track which backlog items are in completed sprints
  const [completedBacklogItemIds, setCompletedBacklogItemIds] = useState<Set<string>>(new Set());

  const fetchBacklog = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getSpaceBacklog(spaceId);
      if (res.success && res.data) setItems(res.data);
      else setItems([]);
    } catch {
      setError("Failed to load backlog");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [spaceId]);

  useEffect(() => {
    fetchBacklog();
  }, [fetchBacklog]);

  // Fetch completed sprint boards to determine which backlog items are terminated
  useEffect(() => {
    if (sprints && sprints.length > 0) {
      const checkCompletedItems = async () => {
        const completedSprints = sprints.filter((s) => s.status === "COMPLETED");
        if (completedSprints.length === 0) {
          setCompletedBacklogItemIds(new Set());
          return;
        }

        const completedIds = new Set<string>();
        
        // For each completed sprint, check the board cards
        for (const sprint of completedSprints) {
          try {
            const boardRes = await api.getBoard(spaceId, sprint.id);
            if (boardRes.success && boardRes.data) {
              // Get all card titles from the board
              const cardTitles = boardRes.data.columns
                .flatMap((col) => col.cards)
                .map((card) => card.title.toLowerCase().trim());
              
              // Match backlog items by title
              items.forEach((item) => {
                if (cardTitles.includes(item.title.toLowerCase().trim())) {
                  completedIds.add(item.id);
                }
              });
            }
          } catch {
            // Ignore errors for individual sprints
          }
        }
        
        setCompletedBacklogItemIds(completedIds);
      };

      checkCompletedItems();
    }
  }, [sprints, items, spaceId]);

  // Filter items based on selected filter
  const filteredItems = React.useMemo(() => {
    if (filter === "all") return items;
    if (filter === "terminated") {
      return items.filter((item) => completedBacklogItemIds.has(item.id));
    }
    if (filter === "active") {
      return items.filter((item) => !completedBacklogItemIds.has(item.id));
    }
    return items;
  }, [items, filter, completedBacklogItemIds]);

  const isProductOwner = currentUserScrumRole === "PRODUCT_OWNER";

  // Add item state
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newAssignee, setNewAssignee] = useState("");
  const addInputRef = useRef<HTMLInputElement>(null);

  // Edit item state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editAssignee, setEditAssignee] = useState("");

  // Expanded description
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Drag reorder
  const [dragItemId, setDragItemId] = useState<string | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  useEffect(() => {
    if (showAddForm && addInputRef.current) {
      addInputRef.current.focus();
    }
  }, [showAddForm]);

  // ─── Handlers ────────────────────────────────────────────

  const handleAdd = async () => {
    if (!newTitle.trim()) return;
    try {
      const res = await api.createBacklogItem(spaceId, {
        title: newTitle.trim(),
        description: newDesc.trim() || undefined,
        assigneeId: newAssignee || undefined,
      });
      if (res.success && res.data) {
        setItems((prev) => [...prev, res.data!]);
        setNewTitle("");
        setNewDesc("");
        setNewAssignee("");
        setShowAddForm(false);
      }
    } catch {
      setError("Failed to create item");
    }
  };

  const handleDelete = async (itemId: string) => {
    if (!confirm("Delete this backlog item?")) return;
    try {
      const res = await api.deleteBacklogItem(spaceId, itemId);
      if (res.success) setItems((prev) => prev.filter((i) => i.id !== itemId));
    } catch {
      setError("Failed to delete item");
    }
  };

  const openEdit = (item: ApiBacklogItem) => {
    setEditingId(item.id);
    setEditTitle(item.title);
    setEditDesc(item.description || "");
    setEditAssignee(item.assigneeId || "");
  };

  const handleEditSave = async () => {
    if (!editingId || !editTitle.trim()) return;
    try {
      const res = await api.updateBacklogItem(spaceId, editingId, {
        title: editTitle.trim(),
        description: editDesc.trim() || undefined,
        assigneeId: editAssignee || undefined,
      });
      if (res.success && res.data) {
        setItems((prev) =>
          prev.map((i) => (i.id === editingId ? res.data! : i))
        );
        setEditingId(null);
      }
    } catch {
      setError("Failed to update item");
    }
  };

  // Drag reorder
  const handleDragStart = (e: React.DragEvent, itemId: string) => {
    setDragItemId(itemId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverIdx(idx);
  };

  const handleDrop = async (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (!dragItemId) {
      setDragItemId(null);
      setDragOverIdx(null);
      return;
    }
    const reordered = reorderBacklogItem(
      { items: items as BacklogItem[], nextSequence: 0 },
      dragItemId,
      idx
    );
    const itemIds = reordered.items.map((i) => i.id);
    try {
      const res = await api.reorderBacklog(spaceId, itemIds);
      if (res.success && res.data) setItems(res.data);
    } catch {
      setError("Failed to reorder");
    }
    setDragItemId(null);
    setDragOverIdx(null);
  };

  const handleDragEnd = () => {
    setDragItemId(null);
    setDragOverIdx(null);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  // ─── Render ──────────────────────────────────────────────

  return (
    <div>
      {error && (
        <div className="mb-4 px-4 py-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
            Product Backlog
          </h3>
          <span className="text-xs font-bold text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2.5 py-1 rounded-lg">
            {filteredItems.length} item{filteredItems.length !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 bg-zinc-100 dark:bg-zinc-900/50 p-1 rounded-xl border border-zinc-200 dark:border-zinc-800">
          <Filter size={14} className="text-zinc-500 ml-2" />
          <button
            onClick={() => setFilter("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              filter === "all"
                ? "bg-white dark:bg-zinc-800 text-indigo-600 dark:text-indigo-400 shadow-sm"
                : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
            }`}
          >
            All ({items.length})
          </button>
          <button
            onClick={() => setFilter("active")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors inline-flex items-center gap-1.5 ${
              filter === "active"
                ? "bg-white dark:bg-zinc-800 text-indigo-600 dark:text-indigo-400 shadow-sm"
                : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
            }`}
          >
            <Clock size={12} />
            Not Yet ({items.filter((item) => !completedBacklogItemIds.has(item.id)).length})
          </button>
          <button
            onClick={() => setFilter("terminated")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors inline-flex items-center gap-1.5 ${
              filter === "terminated"
                ? "bg-white dark:bg-zinc-800 text-indigo-600 dark:text-indigo-400 shadow-sm"
                : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
            }`}
          >
            <CheckCircle size={12} />
            Terminated ({completedBacklogItemIds.size})
          </button>
        </div>

        {isProductOwner ? (
          <button
            onClick={() => setShowAddForm(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold transition-colors shadow-lg shadow-indigo-200 dark:shadow-indigo-900/30"
          >
            <Plus size={18} />
            New Backlog Item
          </button>
        ) : (
          <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-xl">
            <ShieldAlert size={14} className="text-amber-500" />
            <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">
              Only Product Owners can create backlog items
            </span>
          </div>
        )}
      </div>

      {/* Add Form */}
      <AnimatePresence>
        {showAddForm && isProductOwner && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden mb-4"
          >
            <div className="bg-white dark:bg-zinc-900 border border-indigo-200 dark:border-indigo-800 rounded-2xl p-5 shadow-md">
              <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 mb-4">
                New Backlog Item
              </h4>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1 block">
                    Title *
                  </label>
                  <input
                    ref={addInputRef}
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && newTitle.trim()) handleAdd();
                      if (e.key === "Escape") setShowAddForm(false);
                    }}
                    placeholder="As a user, I want to..."
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1 block">
                    Description
                  </label>
                  <textarea
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                    placeholder="Acceptance criteria, details..."
                    rows={3}
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500 resize-none transition-all"
                  />
                </div>
                {members.length > 0 && (
                  <div>
                    <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1 block">
                      Assignee
                    </label>
                    <select
                      value={newAssignee}
                      onChange={(e) => setNewAssignee(e.target.value)}
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
              <div className="flex items-center gap-3 mt-4">
                <button
                  onClick={handleAdd}
                  disabled={!newTitle.trim()}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-xl text-sm font-bold transition-colors"
                >
                  Create Item
                </button>
                <button
                  onClick={() => {
                    setShowAddForm(false);
                    setNewTitle("");
                    setNewDesc("");
                    setNewAssignee("");
                  }}
                  className="px-4 py-2.5 text-sm font-bold text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Backlog List */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-zinc-900 rounded-3xl border border-dashed border-zinc-200 dark:border-zinc-800">
          <ClipboardList size={40} className="mx-auto text-zinc-300 mb-3" />
          <p className="text-zinc-500 font-medium">
            {filter === "all"
              ? "Product backlog is empty."
              : filter === "active"
              ? "No active backlog items."
              : "No terminated backlog items."}
          </p>
          {isProductOwner && filter === "all" && (
            <p className="text-xs text-zinc-400 mt-1">
              Click &quot;New Backlog Item&quot; to add your first user story.
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredItems.map((item, idx) => (
            <motion.div
              key={item.id}
              layout
              draggable={isProductOwner}
              onDragStart={(e) =>
                handleDragStart(e as unknown as React.DragEvent, item.id)
              }
              onDragOver={(e) =>
                handleDragOver(e as unknown as React.DragEvent, idx)
              }
              onDrop={(e) => handleDrop(e as unknown as React.DragEvent, idx)}
              onDragEnd={handleDragEnd}
              className={`bg-white dark:bg-zinc-900 border rounded-2xl transition-all ${
                dragItemId === item.id
                  ? "opacity-40 border-indigo-300 dark:border-indigo-700"
                  : dragOverIdx === idx
                  ? "border-indigo-300 dark:border-indigo-700 ring-2 ring-indigo-200 dark:ring-indigo-800"
                  : "border-zinc-200 dark:border-zinc-800 hover:shadow-md"
              }`}
            >
              {/* Edit mode */}
              {editingId === item.id ? (
                <div className="p-5">
                  <div className="space-y-3">
                    <input
                      autoFocus
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleEditSave();
                        if (e.key === "Escape") setEditingId(null);
                      }}
                      className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2 text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <textarea
                      value={editDesc}
                      onChange={(e) => setEditDesc(e.target.value)}
                      rows={2}
                      className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                    />
                    {members.length > 0 && (
                      <select
                        value={editAssignee}
                        onChange={(e) => setEditAssignee(e.target.value)}
                        className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="">Unassigned</option>
                        {members.map((m) => (
                          <option key={m.userId} value={m.userId}>
                            {m.user?.name || m.user?.email || m.userId}
                          </option>
                        ))}
                      </select>
                    )}
                    <div className="flex gap-2">
                      <button
                        onClick={handleEditSave}
                        disabled={!editTitle.trim()}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-xl text-xs font-bold"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="px-4 py-2 text-xs font-bold text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                /* View mode */
                <div className="flex items-start gap-3 p-4">
                  {/* Drag handle */}
                  {isProductOwner && (
                    <div className="mt-1 cursor-grab active:cursor-grabbing text-zinc-300 hover:text-zinc-400">
                      <GripVertical size={16} />
                    </div>
                  )}

                  {/* Priority position */}
                  <div className={`mt-0.5 w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-bold shrink-0 ${
                    completedBacklogItemIds.has(item.id)
                      ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400"
                      : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500"
                  }`}>
                    {filter === "all" ? idx + 1 : filteredItems.indexOf(item) + 1}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[10px] font-bold text-zinc-400 flex items-center gap-0.5">
                        <Hash size={9} />
                        {item.sequenceNumber}
                      </span>
                      {completedBacklogItemIds.has(item.id) && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-full text-[9px] font-bold">
                          <CheckCircle size={8} />
                          Terminated
                        </span>
                      )}
                    </div>
                    <p className={`text-sm font-semibold leading-snug ${
                      completedBacklogItemIds.has(item.id)
                        ? "text-zinc-500 dark:text-zinc-400 line-through"
                        : "text-zinc-900 dark:text-zinc-100"
                    }`}>
                      {item.title}
                    </p>
                    {item.description && (
                      <button
                        onClick={() =>
                          setExpandedId(expandedId === item.id ? null : item.id)
                        }
                        className="text-xs text-indigo-500 hover:text-indigo-600 font-medium mt-1 flex items-center gap-1"
                      >
                        {expandedId === item.id ? (
                          <ChevronUp size={12} />
                        ) : (
                          <ChevronDown size={12} />
                        )}
                        {expandedId === item.id
                          ? "Hide details"
                          : "Show details"}
                      </button>
                    )}
                    <AnimatePresence>
                      {expandedId === item.id && item.description && (
                        <motion.p
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="text-xs text-zinc-500 dark:text-zinc-400 mt-2 whitespace-pre-wrap overflow-hidden"
                        >
                          {item.description}
                        </motion.p>
                      )}
                    </AnimatePresence>

                    {/* Meta row */}
                    <div className="flex items-center gap-3 mt-2 flex-wrap">
                      {item.assigneeName && (
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-zinc-500">
                          <div className="w-4 h-4 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 text-[8px] font-bold">
                            {item.assigneeName.charAt(0).toUpperCase()}
                          </div>
                          {item.assigneeName}
                        </span>
                      )}
                      <span className="text-[10px] text-zinc-400">
                        {formatDate(item.createdAt)}
                      </span>
                      <span className="text-[10px] text-zinc-400">
                        by {item.createdByName}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  {isProductOwner && (
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => openEdit(item)}
                        className="p-2 rounded-xl text-zinc-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
                      >
                        <Edit3 size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="p-2 rounded-xl text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProductBacklog;
