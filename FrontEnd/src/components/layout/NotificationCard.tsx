"use client";

import React from "react";
import { motion } from "framer-motion";
import {
  Mail,
  CheckCircle2,
  XCircle,
  FileText,
  UserPlus,
  Calendar,
  Clock,
  MessageCircle,
  AlertCircle,
  Zap,
  Trophy,
  Users,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export type NotificationType =
  | "space_invitation_received"
  | "invitation_accepted"
  | "invitation_denied"
  | "backlog_item_created"
  | "backlog_item_assigned"
  | "backlog_item_updated"
  | "sprint_created"
  | "sprint_started"
  | "sprint_completed"
  | "sprint_updated"
  | "sprint_backlog_item_created"
  | "sprint_backlog_item_assigned"
  | "sprint_backlog_item_updated"
  | "task_assigned"
  | "task_updated"
  | "task_completed"
  | "task_comment_added"
  | "meeting_scheduled"
  | "meeting_reminder"
  | "meeting_updated"
  | "meeting_cancelled"
  | "daily_standup_reminder"
  | "sprint_deadline_reminder"
  | "message_received"
  | "mention_received";

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: {
    spaceId?: string;
    spaceName?: string;
    invitationId?: string;
    backlogItemId?: string;
    sprintId?: string;
    taskId?: string;
    meetingId?: string;
    actorName?: string;
    actorId?: string;
    url?: string;
    [key: string]: any;
  };
  read: boolean;
  createdAt: Date | string;
}

interface NotificationCardProps {
  notification: Notification;
  onMarkAsRead?: (id: string) => void;
  onDelete?: (id: string) => void;
  onClick?: (notification: Notification) => void;
}

const getNotificationIcon = (type: NotificationType) => {
  const iconClass = "w-5 h-5";

  switch (type) {
    // Invitations
    case "space_invitation_received":
      return <Mail className={iconClass} />;
    case "invitation_accepted":
      return <CheckCircle2 className={iconClass} />;
    case "invitation_denied":
      return <XCircle className={iconClass} />;

    // Backlog
    case "backlog_item_created":
    case "backlog_item_updated":
    case "backlog_item_assigned":
      return <FileText className={iconClass} />;

    // Sprint
    case "sprint_created":
    case "sprint_updated":
      return <Zap className={iconClass} />;
    case "sprint_started":
      return <Calendar className={iconClass} />;
    case "sprint_completed":
      return <Trophy className={iconClass} />;

    // Sprint Backlog
    case "sprint_backlog_item_created":
    case "sprint_backlog_item_assigned":
    case "sprint_backlog_item_updated":
      return <FileText className={iconClass} />;

    // Tasks
    case "task_assigned":
      return <UserPlus className={iconClass} />;
    case "task_updated":
      return <FileText className={iconClass} />;
    case "task_completed":
      return <CheckCircle2 className={iconClass} />;
    case "task_comment_added":
      return <MessageCircle className={iconClass} />;

    // Meetings
    case "meeting_scheduled":
    case "meeting_updated":
      return <Calendar className={iconClass} />;
    case "meeting_reminder":
      return <Clock className={iconClass} />;
    case "meeting_cancelled":
      return <XCircle className={iconClass} />;

    // Reminders
    case "daily_standup_reminder":
      return <Users className={iconClass} />;
    case "sprint_deadline_reminder":
      return <AlertCircle className={iconClass} />;

    // Communication
    case "message_received":
    case "mention_received":
      return <MessageCircle className={iconClass} />;

    default:
      return <FileText className={iconClass} />;
  }
};

const getNotificationColor = (type: NotificationType) => {
  if (type.includes("invitation")) {
    return {
      bg: "bg-blue-100 dark:bg-blue-900/30",
      border: "border-blue-200 dark:border-blue-800",
      icon: "text-blue-600 dark:text-blue-400",
    };
  }
  if (type.includes("task")) {
    return {
      bg: "bg-purple-100 dark:bg-purple-900/30",
      border: "border-purple-200 dark:border-purple-800",
      icon: "text-purple-600 dark:text-purple-400",
    };
  }
  if (type.includes("sprint")) {
    return {
      bg: "bg-indigo-100 dark:bg-indigo-900/30",
      border: "border-indigo-200 dark:border-indigo-800",
      icon: "text-indigo-600 dark:text-indigo-400",
    };
  }
  if (type.includes("meeting")) {
    return {
      bg: "bg-green-100 dark:bg-green-900/30",
      border: "border-green-200 dark:border-green-800",
      icon: "text-green-600 dark:text-green-400",
    };
  }
  if (type.includes("backlog")) {
    return {
      bg: "bg-amber-100 dark:bg-amber-900/30",
      border: "border-amber-200 dark:border-amber-800",
      icon: "text-amber-600 dark:text-amber-400",
    };
  }
  if (type.includes("reminder")) {
    return {
      bg: "bg-red-100 dark:bg-red-900/30",
      border: "border-red-200 dark:border-red-800",
      icon: "text-red-600 dark:text-red-400",
    };
  }
  // Default
  return {
    bg: "bg-zinc-100 dark:bg-zinc-900/30",
    border: "border-zinc-200 dark:border-zinc-800",
    icon: "text-zinc-600 dark:text-zinc-400",
  };
};

const NotificationCard: React.FC<NotificationCardProps> = ({
  notification,
  onMarkAsRead,
  onDelete,
  onClick,
}) => {
  const colors = getNotificationColor(notification.type);
  const icon = getNotificationIcon(notification.type);

  const handleClick = () => {
    if (onClick) {
      onClick(notification);
    }
    if (!notification.read && onMarkAsRead) {
      onMarkAsRead(notification.id);
    }
  };

  const timeAgo = formatDistanceToNow(new Date(notification.createdAt), {
    addSuffix: true,
  });

  return (
    <div
      className={`
        relative p-3 mb-2 rounded-lg border cursor-pointer transition-all
        bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700
        ${
          notification.read
            ? "opacity-60"
            : "hover:bg-zinc-50 dark:hover:bg-zinc-800/80"
        }
      `}
      onClick={handleClick}
    >
      {!notification.read && (
        <div className="absolute top-2 right-2 w-2 h-2 bg-indigo-500 rounded-full" />
      )}

      <div className="flex items-start gap-2">
        <div className={`flex-shrink-0 w-8 h-8 rounded-lg ${colors.bg} flex items-center justify-center ${colors.icon}`}>
          {icon}
        </div>

        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-zinc-900 dark:text-white line-clamp-1">
            {notification.title}
          </h4>
          <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5 line-clamp-2">
            {notification.body}
          </p>
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-zinc-500 dark:text-zinc-500">
              {timeAgo}
            </span>
            <div className="flex items-center gap-1">
              {!notification.read && onMarkAsRead && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onMarkAsRead(notification.id);
                  }}
                  className="p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-500"
                  title="Mark as read"
                >
                  <CheckCircle2 size={14} />
                </button>
              )}
              {onDelete && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(notification.id);
                  }}
                  className="p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-500 hover:text-red-600"
                  title="Delete"
                >
                  <XCircle size={14} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationCard;
