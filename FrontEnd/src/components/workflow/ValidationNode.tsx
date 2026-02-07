"use client";

import React from "react";
import { motion } from "framer-motion";
import {
  MessageCircle,
  Bell,
  X,
  Check,
  Clock,
  XCircle,
  FileText,
} from "lucide-react";
import { Validator, getInitials, getStatusColor } from "@/lib/documentWorkflow";

interface ValidationNodeProps {
  validator: Validator;
  onOpenComments: () => void;
  onResendNotification: () => void;
  onRemove: () => void;
  onApprove?: () => void;
  onReject?: () => void;
  isCurrentUserValidator?: boolean;
  canEdit?: boolean;
}

const ValidationNode: React.FC<ValidationNodeProps> = ({
  validator,
  onOpenComments,
  onResendNotification,
  onRemove,
  onApprove,
  onReject,
  isCurrentUserValidator = false,
  canEdit = true,
}) => {
  const statusColors = getStatusColor(validator.status);
  const initials = getInitials(validator.userName);

  const getStatusIcon = () => {
    switch (validator.status) {
      case "approved":
        return <Check className="text-emerald-500" size={14} />;
      case "rejected":
        return <XCircle className="text-red-500" size={14} />;
      default:
        return <Clock className="text-zinc-400" size={14} />;
    }
  };

  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
      className="relative group flex flex-col items-center"
    >
      {/* Main Circle with Avatar */}
      <div className="relative">
        {/* Outer ring for status */}
        <div
          className={`
            w-16 h-16 rounded-full border-[3px] flex items-center justify-center
            transition-all duration-300 ${statusColors.border}
            ${validator.status === "pending" ? "animate-pulse" : ""}
          `}
        >
          {/* Inner circle with avatar/initials */}
          <div
            className={`
              w-12 h-12 rounded-full flex items-center justify-center
              font-bold text-sm transition-all
              ${statusColors.bg} ${statusColors.text}
            `}
          >
            {validator.avatarUrl ? (
              <img
                src={validator.avatarUrl}
                alt={validator.userName}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              <span>{initials}</span>
            )}
          </div>
        </div>

        {/* Status Badge */}
        <div
          className={`
            absolute -bottom-1 -right-1 w-6 h-6 rounded-full 
            flex items-center justify-center bg-white dark:bg-zinc-900
            border-2 ${statusColors.border} shadow-sm
          `}
        >
          {getStatusIcon()}
        </div>

        {/* Remove Button (shown on hover for owners/admins) */}
        {canEdit && (
          <motion.button
            initial={{ opacity: 0 }}
            whileHover={{ scale: 1.1 }}
            onClick={onRemove}
            className="
              absolute -top-1 -right-1 w-5 h-5 rounded-full 
              bg-red-500 text-white flex items-center justify-center
              opacity-0 group-hover:opacity-100 transition-opacity
              hover:bg-red-600 shadow-sm
            "
          >
            <X size={12} />
          </motion.button>
        )}
      </div>

      {/* Validator Name */}
      <div className="mt-2 text-center max-w-[80px]">
        <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300 truncate">
          {validator.userName.split(" ")[0]}
        </p>
      </div>

      {/* Action Buttons Row */}
      <div className="flex items-center gap-1.5 mt-2">
        {/* Comments Button */}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          onClick={onOpenComments}
          className={`
            relative p-1.5 rounded-lg transition-colors
            ${validator.comments.length > 0 
              ? "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400" 
              : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"
            }
          `}
        >
          <MessageCircle size={14} />
          {validator.comments.length > 0 && (
            <span
              className="
                absolute -top-1 -right-1 w-4 h-4 rounded-full 
                bg-indigo-600 text-white text-[10px] font-bold
                flex items-center justify-center
              "
            >
              {validator.comments.length > 9 ? "9+" : validator.comments.length}
            </span>
          )}
        </motion.button>

        {/* Resend Notification Button (only for pending validators) */}
        {validator.status === "pending" && canEdit && (
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={onResendNotification}
            className="
              p-1.5 rounded-lg bg-amber-100 dark:bg-amber-900/30 
              text-amber-600 dark:text-amber-400
              hover:bg-amber-200 dark:hover:bg-amber-900/50 transition-colors
            "
            title="Resend notification"
          >
            <Bell size={14} />
          </motion.button>
        )}
      </div>

      {/* Validation Actions (only for the current user if they're a pending validator) */}
      {isCurrentUserValidator && validator.status === "pending" && (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 mt-2"
        >
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onApprove}
            className="
              px-2.5 py-1 rounded-lg bg-emerald-500 text-white text-xs font-medium
              hover:bg-emerald-600 transition-colors flex items-center gap-1
            "
          >
            <Check size={12} />
            Approve
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onReject}
            className="
              px-2.5 py-1 rounded-lg bg-red-500 text-white text-xs font-medium
              hover:bg-red-600 transition-colors flex items-center gap-1
            "
          >
            <X size={12} />
            Reject
          </motion.button>
        </motion.div>
      )}

      {/* Note indicator */}
      {validator.note && (
        <div
          className="
            mt-1 px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800
            text-[10px] text-zinc-500 dark:text-zinc-400 max-w-[80px] truncate
            flex items-center gap-1
          "
          title={validator.note}
        >
          <FileText size={10} />
          Note
        </div>
      )}
    </motion.div>
  );
};

export default ValidationNode;
