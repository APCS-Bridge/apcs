"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";
import AdminSidebar from "@/components/layout/admin/AdminSidebar";
import Header from "@/components/layout/Header";
import WorkspaceCard from "@/components/dashboard/WorkspaceCard";
import CreateWorkspaceModal from "@/components/modals/CreateWorkspaceModal";
import { motion } from "framer-motion";
import { Plus, Loader2, Briefcase } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { api, Space } from "@/lib/api";

const Dashboard = () => {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [isCreateWorkspaceModalOpen, setIsCreateWorkspaceModalOpen] =
    useState(false);
  const [workspaces, setWorkspaces] = useState<Space[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  // Determine sidebar based on role
  const isSuperAdmin = user?.role === "SUPERADMIN";
  const isAdmin = user?.role === "ADMIN";
  const SidebarComponent = isSuperAdmin ? Sidebar : AdminSidebar;

  useEffect(() => {
    if (!authLoading && user) {
      fetchWorkspaces();
    } else if (!authLoading && !user) {
      router.push("/login");
    }
  }, [authLoading, user, router]);

  const fetchWorkspaces = async () => {
    if (!user) return;

    setIsLoading(true);
    setError("");
    try {
      let response;
      if (user.role === "SUPERADMIN") {
        // SuperAdmin sees all workspaces
        response = await api.getSpaces(1, 50);
      } else {
        // Admin and User see their own workspaces
        response = await api.getMySpaces();
      }

      if (response.success && response.data) {
        setWorkspaces(response.data);
      } else {
        setError("Failed to load workspaces");
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load workspaces"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleWorkspaceCreated = () => {
    fetchWorkspaces();
    setIsCreateWorkspaceModalOpen(false);
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center">
        <Loader2 className="animate-spin text-indigo-600" size={32} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex transition-colors duration-300">
      <SidebarComponent />

      <main className="flex-1 ml-64 min-w-0">
        <Header />

        <div className="p-8">
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
              <div>
                <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
                  {isSuperAdmin ? "All Workspaces" : "My Workspaces"}
                </h1>
                <p className="text-zinc-500 dark:text-zinc-400 mt-1">
                  {isSuperAdmin
                    ? "Manage all workspaces in the system"
                    : isAdmin
                    ? "Manage your workspaces and teams"
                    : "View and work in your assigned workspaces"}
                </p>
              </div>

              {(isSuperAdmin || isAdmin) && (
                <button
                  onClick={() => setIsCreateWorkspaceModalOpen(true)}
                  className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition-colors shadow-lg shadow-indigo-200 dark:shadow-indigo-900/30"
                >
                  <Plus size={18} />
                  New Workspace
                </button>
              )}
            </div>

            {/* Loading State */}
            {isLoading && (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="animate-spin text-indigo-600" size={32} />
              </div>
            )}

            {/* Error State */}
            {error && !isLoading && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-6 text-center">
                <p className="text-red-700 dark:text-red-300">{error}</p>
                <button
                  onClick={fetchWorkspaces}
                  className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-semibold transition-colors"
                >
                  Try Again
                </button>
              </div>
            )}

            {/* Workspaces Grid */}
            {!isLoading && !error && (
              <>
                {workspaces.length === 0 ? (
                  <div className="text-center py-20 bg-white dark:bg-zinc-900 rounded-3xl border border-dashed border-zinc-200 dark:border-zinc-800">
                    <Briefcase
                      size={48}
                      className="mx-auto text-zinc-300 dark:text-zinc-700 mb-4"
                    />
                    <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
                      No workspaces yet
                    </h3>
                    <p className="text-zinc-500 dark:text-zinc-400 mb-6">
                      {isSuperAdmin || isAdmin
                        ? "Create your first workspace to get started"
                        : "You haven't been added to any workspaces yet"}
                    </p>
                    {(isSuperAdmin || isAdmin) && (
                      <button
                        onClick={() => setIsCreateWorkspaceModalOpen(true)}
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition-colors"
                      >
                        <Plus size={18} />
                        Create Workspace
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {workspaces.map((workspace, index) => (
                      <motion.div
                        key={workspace.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <WorkspaceCard workspace={workspace} />
                      </motion.div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </main>

      {/* Create Workspace Modal */}
      <CreateWorkspaceModal
        isOpen={isCreateWorkspaceModalOpen}
        onClose={() => setIsCreateWorkspaceModalOpen(false)}
        onSuccess={handleWorkspaceCreated}
      />
    </div>
  );
};

export default Dashboard;

