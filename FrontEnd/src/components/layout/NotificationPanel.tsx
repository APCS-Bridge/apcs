"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, CheckCheck, Trash2, X } from "lucide-react";
import NotificationCard, { Notification } from "./NotificationCard";

interface NotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const NotificationPanel: React.FC<NotificationPanelProps> = ({
  isOpen,
  onClose,
}) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const panelRef = useRef<HTMLDivElement>(null);

  // Close panel when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        panelRef.current &&
        !panelRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onClose]);

  // TODO: Fetch notifications from API
  useEffect(() => {
    // Placeholder: Mock notifications for demonstration
    const mockNotifications: Notification[] = [
      {
        id: "1",
        type: "task_assigned",
        title: "New Task Assigned",
        body: "John Doe assigned you to: 'Implement user authentication'",
        data: {
          taskId: "task-123",
          actorName: "John Doe",
          actorId: "user-456",
        },
        read: false,
        createdAt: new Date(Date.now() - 1000 * 60 * 5), // 5 minutes ago
      },
      {
        id: "2",
        type: "sprint_started",
        title: "Sprint Started",
        body: "Sprint 'Q1 2026 Sprint 1' has started!",
        data: {
          sprintId: "sprint-789",
          sprintName: "Q1 2026 Sprint 1",
        },
        read: false,
        createdAt: new Date(Date.now() - 1000 * 60 * 60), // 1 hour ago
      },
      {
        id: "3",
        type: "space_invitation_received",
        title: "New Space Invitation",
        body: "Jane Smith invited you to join 'Mobile App Development'",
        data: {
          invitationId: "inv-321",
          spaceName: "Mobile App Development",
          actorName: "Jane Smith",
        },
        read: true,
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
      },
      {
        id: "4",
        type: "meeting_reminder",
        title: "Meeting Reminder",
        body: "Daily Standup scheduled for in 15 minutes",
        data: {
          meetingId: "meet-654",
        },
        read: false,
        createdAt: new Date(Date.now() - 1000 * 60 * 10), // 10 minutes ago
      },
    ];

    setNotifications(mockNotifications);
  }, []);

  const handleMarkAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((notif) =>
        notif.id === id ? { ...notif, read: true } : notif
      )
    );
    // TODO: Call API to mark notification as read
  };

  const handleDelete = (id: string) => {
    setNotifications((prev) => prev.filter((notif) => notif.id !== id));
    // TODO: Call API to delete notification
  };

  const handleMarkAllAsRead = () => {
    setNotifications((prev) =>
      prev.map((notif) => ({ ...notif, read: true }))
    );
    // TODO: Call API to mark all notifications as read
  };

  const handleClearAll = () => {
    setNotifications([]);
    // TODO: Call API to clear all notifications
  };

  const handleNotificationClick = (notification: Notification) => {
    // TODO: Navigate to relevant page based on notification data
    if (notification.data?.url) {
      window.location.href = notification.data.url;
    } else if (notification.data?.taskId) {
      // Navigate to task
      console.log("Navigate to task:", notification.data.taskId);
    } else if (notification.data?.sprintId) {
      // Navigate to sprint
      console.log("Navigate to sprint:", notification.data.sprintId);
    }
    // Add more navigation logic as needed
  };

  const filteredNotifications =
    filter === "unread"
      ? notifications.filter((n) => !n.read)
      : notifications;

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={onClose}
          />

          {/* Dropdown Panel */}
          <motion.div
            ref={panelRef}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="fixed top-20 right-8 w-96 max-h-[600px] bg-white dark:bg-zinc-900 rounded-xl shadow-2xl border border-zinc-200 dark:border-zinc-800 z-50 flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                  Notifications
                </h3>
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <span className="px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-xs font-semibold rounded-full">
                      {unreadCount}
                    </span>
                  )}
                  <button
                    onClick={onClose}
                    className="p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 dark:text-zinc-400"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Filters */}
              <div className="flex items-center justify-between gap-3">
                <div className="inline-flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800/50 rounded-lg p-1 border border-zinc-200 dark:border-zinc-700">
                  <button
                    onClick={() => setFilter("all")}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                      filter === "all"
                        ? "bg-white dark:bg-zinc-700 text-indigo-600 dark:text-indigo-400 shadow-sm"
                        : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
                    }`}
                  >
                    All ({notifications.length})
                  </button>
                  <button
                    onClick={() => setFilter("unread")}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                      filter === "unread"
                        ? "bg-white dark:bg-zinc-700 text-indigo-600 dark:text-indigo-400 shadow-sm"
                        : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
                    }`}
                  >
                    Unread ({unreadCount})
                  </button>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1">
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllAsRead}
                      className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
                      title="Mark all as read"
                      aria-label="Mark all as read"
                    >
                      <CheckCheck size={18} />
                    </button>
                  )}
                  {notifications.length > 0 && (
                    <button
                      onClick={handleClearAll}
                      className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-zinc-600 dark:text-zinc-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                      title="Clear all"
                      aria-label="Clear all notifications"
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Notifications List */}
            <div className="flex-1 overflow-y-auto p-3">
              <AnimatePresence mode="popLayout">
                {filteredNotifications.length > 0 ? (
                  filteredNotifications.map((notification) => (
                    <NotificationCard
                      key={notification.id}
                      notification={notification}
                      onMarkAsRead={handleMarkAsRead}
                      onDelete={handleDelete}
                      onClick={handleNotificationClick}
                    />
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Bell className="w-12 h-12 text-zinc-300 dark:text-zinc-700 mb-3" />
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                      {filter === "unread" ? "All caught up!" : "No notifications"}
                    </p>
                  </div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default NotificationPanel;
