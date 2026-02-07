"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, MessageCircle, Clock, User, FileText } from "lucide-react";
import { Validator, ValidationComment, getInitials, getStatusColor } from "@/lib/documentWorkflow";

interface CommentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  validator: Validator;
  currentUserId: string;
  currentUserName: string;
  onAddComment: (content: string) => void;
  onUpdateNote?: (note: string) => void;
  canEditNote?: boolean;
}

const CommentsModal: React.FC<CommentsModalProps> = ({
  isOpen,
  onClose,
  validator,
  currentUserId,
  currentUserName,
  onAddComment,
  onUpdateNote,
  canEditNote = false,
}) => {
  const [newComment, setNewComment] = useState("");
  const [note, setNote] = useState(validator.note || "");
  const [isEditingNote, setIsEditingNote] = useState(false);
  const commentsEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const statusColors = getStatusColor(validator.status);

  useEffect(() => {
    if (isOpen) {
      setNote(validator.note || "");
      setTimeout(() => {
        commentsEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  }, [isOpen, validator.note]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    onAddComment(newComment.trim());
    setNewComment("");
    setTimeout(() => {
      commentsEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  const handleSaveNote = () => {
    if (onUpdateNote) {
      onUpdateNote(note.trim());
    }
    setIsEditingNote(false);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-zinc-950/60 backdrop-blur-sm z-[60]"
          />

          {/* Modal */}
          <div className="fixed inset-0 flex items-center justify-center z-[70] p-4 pointer-events-none">
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-3xl shadow-2xl pointer-events-auto border border-zinc-200 dark:border-zinc-800 max-h-[85vh] flex flex-col"
            >
              {/* Header */}
              <div className="relative p-6 pb-4 border-b border-zinc-200 dark:border-zinc-800">
                <button
                  onClick={onClose}
                  className="absolute right-4 top-4 p-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 transition-colors"
                >
                  <X size={20} />
                </button>

                <div className="flex items-center gap-4">
                  {/* Validator Avatar */}
                  <div
                    className={`
                      w-12 h-12 rounded-full border-2 flex items-center justify-center
                      ${statusColors.border} ${statusColors.bg}
                    `}
                  >
                    {validator.avatarUrl ? (
                      <img
                        src={validator.avatarUrl}
                        alt={validator.userName}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <span className={`font-bold text-sm ${statusColors.text}`}>
                        {getInitials(validator.userName)}
                      </span>
                    )}
                  </div>

                  <div className="flex-1">
                    <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                      {validator.userName}
                    </h2>
                    <div className="flex items-center gap-2 text-sm">
                      <span
                        className={`
                          px-2 py-0.5 rounded-full text-xs font-medium capitalize
                          ${statusColors.bg} ${statusColors.text}
                        `}
                      >
                        {validator.status}
                      </span>
                      {validator.userEmail && (
                        <span className="text-zinc-500 dark:text-zinc-400 text-xs">
                          {validator.userEmail}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Note Section - Instructions from document owner */}
              {(validator.note || canEditNote) && (
                <div className="px-6 py-3 bg-amber-50 dark:bg-amber-950/20 border-b border-amber-200 dark:border-amber-900/30">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-1">
                      <FileText size={12} />
                      Note from document owner
                    </span>
                    {canEditNote && (
                      <button
                        onClick={() => setIsEditingNote(!isEditingNote)}
                        className="text-xs text-amber-600 dark:text-amber-400 hover:underline"
                      >
                        {isEditingNote ? "Cancel" : "Edit"}
                      </button>
                    )}
                  </div>

                  {isEditingNote ? (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="Add a note for this validator..."
                        className="flex-1 bg-white dark:bg-zinc-900 border border-amber-300 dark:border-amber-800 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-amber-500 outline-none text-zinc-900 dark:text-zinc-100"
                      />
                      <button
                        onClick={handleSaveNote}
                        className="px-3 py-1.5 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600 transition-colors"
                      >
                        Save
                      </button>
                    </div>
                  ) : (
                    <p className="text-sm text-amber-800 dark:text-amber-300">
                      {validator.note || "No note added yet."}
                    </p>
                  )}
                </div>
              )}

              {/* Comments List */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4 min-h-[200px]">
                {validator.comments.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center py-8">
                    <div className="w-16 h-16 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mb-3">
                      <MessageCircle className="text-zinc-400" size={24} />
                    </div>
                    <p className="text-zinc-500 dark:text-zinc-400 text-sm">
                      No comments yet
                    </p>
                    <p className="text-zinc-400 dark:text-zinc-500 text-xs mt-1">
                      Start the conversation
                    </p>
                  </div>
                ) : (
                  validator.comments.map((comment) => (
                    <CommentItem
                      key={comment.id}
                      comment={comment}
                      isCurrentUser={comment.authorId === currentUserId}
                    />
                  ))
                )}
                <div ref={commentsEndRef} />
              </div>

              {/* Add Comment Form */}
              <form
                onSubmit={handleSubmit}
                className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 rounded-b-3xl"
              >
                <div className="flex items-end gap-2">
                  <div className="flex-1 relative">
                    <textarea
                      ref={inputRef}
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleSubmit(e);
                        }
                      }}
                      placeholder="Write a comment..."
                      rows={1}
                      className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-2xl py-3 px-4 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none text-zinc-900 dark:text-zinc-100 resize-none"
                    />
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    type="submit"
                    disabled={!newComment.trim()}
                    className="
                      p-3 rounded-2xl bg-indigo-600 text-white
                      hover:bg-indigo-700 disabled:bg-zinc-300 disabled:dark:bg-zinc-700
                      transition-colors
                    "
                  >
                    <Send size={18} />
                  </motion.button>
                </div>
              </form>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};

// Comment Item Component
interface CommentItemProps {
  comment: ValidationComment;
  isCurrentUser: boolean;
}

const CommentItem: React.FC<CommentItemProps> = ({ comment, isCurrentUser }) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex gap-3 ${isCurrentUser ? "flex-row-reverse" : ""}`}
    >
      <div
        className={`
          w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0
          ${isCurrentUser 
            ? "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400" 
            : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400"
          }
        `}
      >
        <span className="text-xs font-bold">{getInitials(comment.authorName)}</span>
      </div>

      <div className={`flex-1 max-w-[80%] ${isCurrentUser ? "text-right" : ""}`}>
        <div className="flex items-center gap-2 mb-1">
          {isCurrentUser && (
            <span className="text-[10px] text-zinc-400 flex items-center gap-1">
              <Clock size={10} />
              {formatDate(comment.createdAt)}
            </span>
          )}
          <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
            {isCurrentUser ? "You" : comment.authorName}
          </span>
          {!isCurrentUser && (
            <span className="text-[10px] text-zinc-400 flex items-center gap-1">
              <Clock size={10} />
              {formatDate(comment.createdAt)}
            </span>
          )}
        </div>
        <div
          className={`
            px-4 py-2.5 rounded-2xl text-sm inline-block text-left
            ${isCurrentUser 
              ? "bg-indigo-600 text-white rounded-tr-md" 
              : "bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 rounded-tl-md"
            }
          `}
        >
          {comment.content}
        </div>
      </div>
    </motion.div>
  );
};

export default CommentsModal;
