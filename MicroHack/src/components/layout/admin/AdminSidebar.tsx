"use client";

import React, { useState } from "react";
import { UserPlus, PlusCircle, LayoutGrid, Users, LogOut, MessageSquare, Settings, LayoutDashboard, Crown, Shield, User, Bell, FileText } from "lucide-react";
import { motion } from "framer-motion";
import { useRouter, usePathname } from "next/navigation";
import AdminCreateUserModal from "@/components/modals/admin/AdminCreateUserModal";
import CreateWorkspaceModal from "@/components/modals/CreateWorkspaceModal";
import { useAuth } from "@/context/AuthContext";
import { useNotifications } from "@/context/NotificationContext";
import NotificationPanelContent from "../NotificationPanelContent";
import { AnimatePresence } from "framer-motion";

const AdminSidebar = () => {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { unreadCount } = useNotifications();
  const [isCreateUserModalOpen, setIsCreateUserModalOpen] = useState(false);
  const [isCreateWorkspaceModalOpen, setIsCreateWorkspaceModalOpen] =
    useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);

    const handleLogout = async () => {
        await logout();
    router.push("/login");
  };

  const getInitials = (name: string, email: string) => {
    if (name) {
      return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    return email.substring(0, 2).toUpperCase();
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'SUPERADMIN':
        return <Crown size={12} className="text-amber-500" />;
      case 'ADMIN':
        return <Shield size={12} className="text-indigo-500" />;
      default:
        return <User size={12} className="text-zinc-400" />;
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'SUPERADMIN':
        return 'Super Admin';
      case 'ADMIN':
        return 'Admin';
      default:
        return 'User';
    }
  };

    // Main navigation items
    const mainMenuItems = [
        {
            icon: <LayoutDashboard size={20} />,
            label: "Dashboard",
            action: () => router.push("/dashboard"),
            roles: ['ADMIN', 'USER'], // All roles can access dashboard
            path: "/dashboard"
        },
        {
            icon: <FileText size={20} />,
            label: "My Reviews",
            action: () => router.push("/reviews"),
            roles: ['ADMIN', 'USER'], // All roles can review documents
            path: "/reviews"
        },
        {
            icon: <Bell size={20} />,
            label: "Notifications",
            action: () => setIsNotificationOpen(!isNotificationOpen),
            roles: ['ADMIN', 'USER'], // All roles can access notifications
            path: null,
            badge: unreadCount > 0 ? unreadCount : undefined
        },
        {
            icon: <LayoutGrid size={20} />,
            label: "Workspaces",
            action: () => router.push("/manage-workspaces"),
            roles: ['ADMIN'], // ADMIN can manage workspaces
            path: "/manage-workspaces"
        },
        {
            icon: <Users size={20} />,
            label: "Users",
            action: () => router.push("/manage-users"),
            roles: ['ADMIN'], // ADMIN can manage users
            path: "/manage-users"
        },
        {
            icon: <MessageSquare size={20} />,
            label: "Chat Room",
            action: () => router.push("/chatroom"),
            roles: ['ADMIN', 'USER'], // All non-SUPERADMIN users can access chat
            path: "/chatroom"
        },
        {
            icon: <Settings size={20} />,
            label: "Settings",
            action: () => router.push("/settings"),
            roles: ['ADMIN', 'USER'], // All non-SUPERADMIN users can access settings
            path: "/settings"
        },
    ];

    // Action items (Create buttons)
    const actionItems = [
        {
            icon: <PlusCircle size={20} />,
            label: "Create Workspace",
            action: () => setIsCreateWorkspaceModalOpen(true),
            roles: ['ADMIN'], // ADMIN can create workspaces
            path: null
        },
        {
            icon: <UserPlus size={20} />,
            label: "Create User",
            action: () => setIsCreateUserModalOpen(true),
            roles: ['ADMIN'], // Only ADMIN can create users (SUPERADMIN uses different sidebar)
            path: null
        },
    ];

  // Filter menu items based on user role
  const visibleMainItems = mainMenuItems.filter(item =>
    !item.roles || item.roles.includes(user?.role || 'USER')
  );
  
  const visibleActionItems = actionItems.filter(item =>
    !item.roles || item.roles.includes(user?.role || 'USER')
  );

    return (
        <>
            <aside className="fixed left-0 top-0 h-screen w-64 bg-white dark:bg-zinc-950 border-r border-zinc-200 dark:border-zinc-800 flex flex-col p-6 z-50">
                {/* Navigation Groups */}
                <nav className="flex-1 space-y-6 overflow-y-auto">
                    {/* Main Navigation */}
                    <div className="space-y-2">
                        {visibleMainItems.map((item, index) => {
                            const isActive = item.path && pathname === item.path;
                            const isNotificationItem = item.label === 'Notifications';
                            return (
                                <motion.button
                                    key={index}
                                    onClick={item.action}
                                    whileHover={{ x: 5 }}
                                    whileTap={{ scale: 0.98 }}
                                    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-colors duration-200 group text-left ${
                                        (isActive || (isNotificationItem && isNotificationOpen))
                                            ? 'bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400'
                                            : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900'
                                    }`}
                                >
                                    <span className={`relative transition-colors ${
                                        (isActive || (isNotificationItem && isNotificationOpen))
                                            ? 'text-indigo-600 dark:text-indigo-400'
                                            : 'text-zinc-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400'
                                    }`}>
                                        {item.icon}
                                    </span>
                                    <span className={`text-sm font-medium transition-colors flex-1 ${
                                        (isActive || (isNotificationItem && isNotificationOpen))
                                            ? 'text-indigo-600 dark:text-indigo-400 font-semibold'
                                            : 'group-hover:text-zinc-900 dark:group-hover:text-zinc-100'
                                    }`}>
                                        {item.label}
                                    </span>
                                    {item.badge && item.badge > 0 && (
                                        <span className="px-2 py-0.5 bg-red-500 text-white text-xs font-bold rounded-full min-w-[20px] text-center">
                                            {item.badge > 9 ? '9+' : item.badge}
                                        </span>
                                    )}
                                </motion.button>
                            );
                        })}
                    </div>

                    {/* Quick Actions Section */}
                    {visibleActionItems.length > 0 && (
                        <div className="space-y-2 pt-4 border-t border-zinc-200 dark:border-zinc-800">
                            <p className="px-4 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2">
                                Quick Actions
                            </p>
                            {visibleActionItems.map((item, index) => (
                                <motion.button
                                    key={index}
                                    onClick={item.action}
                                    whileHover={{ x: 5 }}
                                    whileTap={{ scale: 0.98 }}
                                    className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-colors duration-200 group text-left text-zinc-600 dark:text-zinc-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 hover:text-indigo-600 dark:hover:text-indigo-400"
                                >
                                    <span className="text-zinc-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                        {item.icon}
                                    </span>
                                    <span className="text-sm font-medium group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                        {item.label}
                                    </span>
                                </motion.button>
                            ))}
                        </div>
                    )}
                </nav>

                {/* Footer - Profile and Sign out */}
                <div className="mt-auto pt-6 border-t border-zinc-200 dark:border-zinc-800 space-y-4">
                    {/* Profile Section */}
                    {user && (
                        <motion.div
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => router.push("/settings")}
                            className="flex items-center cursor-pointer hover:opacity-80 transition-opacity p-3 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-900"
                        >
                            <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-lg ring-2 ring-indigo-100 dark:ring-indigo-900/30">
                                {user?.avatarUrl ? (
                                    <img
                                        src={user.avatarUrl}
                                        alt={user.name}
                                        className="w-full h-full object-cover rounded-full"
                                        onError={(e) => {
                                            e.currentTarget.style.display = 'none';
                                        }}
                                    />
                                ) : null}
                                {!user?.avatarUrl && (
                                    <span>{getInitials(user.name || '', user.email || '')}</span>
                                )}
                            </div>
                            <div className="ml-3 flex-1 min-w-0">
                                <div className="flex items-center gap-1.5">
                                    <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                                        {user?.name || "Admin"}
                                    </p>
                                    {user && getRoleIcon(user.role)}
                                </div>
                                <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                                    {getRoleLabel(user.role)}
                                </p>
                            </div>
                        </motion.div>
                    )}

                    {/* Sign out button */}
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleLogout}
                        className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-xl font-medium shadow-md transition-all duration-200 hover:bg-zinc-800 dark:hover:bg-zinc-200"
                    >
                        <LogOut size={18} />
                        <span className="text-sm">Sign out</span>
                    </motion.button>
                </div>
            </aside>

            {/* Notification Panel */}
            <AnimatePresence>
                {isNotificationOpen && (
                    <>
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/20 dark:bg-black/40 z-40"
                            onClick={() => setIsNotificationOpen(false)}
                        />
                        {/* Notification Panel */}
                        <motion.div
                            initial={{ x: -100, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ x: -100, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="fixed left-64 top-0 h-screen w-96 bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 z-50 shadow-2xl flex flex-col"
                        >
                            <NotificationPanelContent onClose={() => setIsNotificationOpen(false)} />
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            <AdminCreateUserModal
                isOpen={isCreateUserModalOpen}
                onClose={() => setIsCreateUserModalOpen(false)}
            />

            <CreateWorkspaceModal
                isOpen={isCreateWorkspaceModalOpen}
                onClose={() => setIsCreateWorkspaceModalOpen(false)}
            />
        </>
    );
};

export default AdminSidebar;
