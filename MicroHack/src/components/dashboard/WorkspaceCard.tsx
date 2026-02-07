"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  MoreVertical,
  Users,
  Code,
  Activity,
  Trash2,
  Eye,
  Loader2,
} from "lucide-react";
import { api, Space } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

interface WorkspaceCardProps {
    workspace: Space;
    onDelete?: (id: string) => void;
}

const WorkspaceCard: React.FC<WorkspaceCardProps> = ({
  workspace,
  onDelete,
}) => {
    const router = useRouter();
  const { user } = useAuth();
    const [showMenu, setShowMenu] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    // Determine status based on methodology or other factors
    // For now, all workspaces are "active"
  const status = "active" as const;

    const statusColors = {
    active:
      "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400",
    archived: "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400",
    pending:
      "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400",
    };

    const handleDelete = async () => {
    if (
      !confirm(
        `Are you sure you want to delete "${workspace.name}"? This action cannot be undone.`
      )
    ) {
            return;
        }
        setIsDeleting(true);
        setShowMenu(false);
        try {
            const response = await api.deleteSpace(workspace.id);
            if (response.success) {
                onDelete?.(workspace.id);
            } else {
        alert("Failed to delete workspace");
            }
        } catch (err) {
      console.error("Delete error:", err);
      alert("Failed to delete workspace");
        } finally {
            setIsDeleting(false);
        }
    };

    const handleViewDetails = () => {
    router.push(`/workspace/${workspace.id}`);
    };

    // Calculate time ago
    const getTimeAgo = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 60) return `${diffMins} minutes ago`;
        if (diffHours < 24) return `${diffHours} hours ago`;
        if (diffDays < 30) return `${diffDays} days ago`;
        return `${Math.floor(diffDays / 30)} months ago`;
    };

    return (
        <motion.div
            whileHover={{ y: -5, transition: { duration: 0.2 } }}
      className={`bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm hover:shadow-xl hover:border-indigo-200 dark:hover:border-indigo-900 transition-all duration-300 group relative ${
        isDeleting ? "opacity-50" : ""
      }`}
        >
            {isDeleting && (
                <div className="absolute inset-0 bg-white/50 dark:bg-zinc-950/50 rounded-2xl flex items-center justify-center z-10">
                    <Loader2 className="animate-spin text-indigo-600" size={24} />
                </div>
            )}

            <div className="flex justify-between items-start mb-6">
                <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white transition-colors duration-300">
                    <Code size={24} />
                </div>
                
                {/* Dropdown Menu */}
                <div className="relative">
                    <button 
                        onClick={() => setShowMenu(!showMenu)}
                        className="p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-900 text-zinc-400"
                    >
                        <MoreVertical size={20} />
                    </button>

                    <AnimatePresence>
                        {showMenu && (
                            <>
                                {/* Backdrop */}
                                <div 
                                    className="fixed inset-0 z-10" 
                                    onClick={() => setShowMenu(false)}
                                />
                                
                                {/* Menu */}
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95, y: -10 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                                    className="absolute right-0 top-8 w-48 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl z-20 overflow-hidden"
                                >
                                    <button
                                        onClick={handleViewDetails}
                                        className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                                    >
                                        <Eye size={16} />
                                        View Details
                                    </button>
                                    <button
                                        onClick={handleDelete}
                                        className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors border-t border-zinc-100 dark:border-zinc-800"
                                    >
                                        <Trash2 size={16} />
                                        Delete Workspace
                                    </button>
                                </motion.div>
                            </>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            <div className="mb-6">
                <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-1 group-hover:text-indigo-600 transition-colors">
                    {workspace.name}
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 flex items-center">
                    <Activity size={12} className="mr-1" />
                    Last active {getTimeAgo(workspace.createdAt)}
                </p>
            </div>

            <div className="flex items-center mb-6">
                <div className="flex items-center space-x-2 text-zinc-600 dark:text-zinc-400">
                    <Users size={16} />
                    <span className="text-sm font-medium">
                        {workspace._count?.members || 0} members
                    </span>
                </div>
                <div className="ml-auto">
          <span
            className={`text-xs font-bold uppercase tracking-wider px-2 py-1 rounded-lg ${
              workspace.methodology === "SCRUM"
                ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
            }`}
          >
                        {workspace.methodology}
                    </span>
                </div>
            </div>

            <div className="flex justify-between items-center bg-zinc-50 dark:bg-zinc-900/50 rounded-xl p-3">
        <span
          className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${statusColors[status]}`}
        >
                    {status}
                </span>
                <button 
                    onClick={handleViewDetails}
                    className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                    View Details
                </button>
            </div>
        </motion.div>
    );
};

export default WorkspaceCard;
