"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";
import AdminSidebar from "@/components/layout/admin/AdminSidebar";
import Header from "@/components/layout/Header";
import { motion, AnimatePresence } from "framer-motion";
import {
  Trash2,
  Shield,
  User as UserIcon,
  Plus,
  RefreshCw,
  AlertCircle,
  Crown,
  Search,
  Grid3x3,
  List,
  SortAsc,
  SortDesc,
  Calendar,
  Mail,
  MoreVertical,
  Edit2,
  X,
  Filter,
} from "lucide-react";
import DeleteUserModal from "@/components/modals/DeleteUserModal";
import CreateUserModal from "@/components/modals/CreateUserModal";
import { useAuth } from "@/context/AuthContext";
import { api, User } from "@/lib/api";

type SortOption = 'name' | 'email' | 'role' | 'date';
type ViewMode = 'grid' | 'list';

const ManageUsersPage = () => {
  const router = useRouter();
  const {
    user: currentUser,
    isAuthenticated,
    isLoading: authLoading,
    isSuperAdmin,
  } = useAuth();

  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<"all" | "ADMIN" | "USER">("all");
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<{
    id: string;
    email: string;
  } | null>(null);
  
  // New state for improved features
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const response = await api.getUsers(1, 100);
      if (response.success && response.data) {
        setUsers(response.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch users");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // Only allow SUPERADMIN and ADMIN to access this page
    if (
      !authLoading &&
      currentUser &&
      !["SUPERADMIN", "ADMIN"].includes(currentUser.role)
    ) {
      router.push("/dashboard");
      return;
    }

    // Fetch users when authenticated
    if (!authLoading && isAuthenticated && currentUser) {
      fetchUsers();
    }
  }, [authLoading, isAuthenticated, currentUser, router, fetchUsers]);

  // Filter and sort users
  const filteredAndSortedUsers = useMemo(() => {
    let filtered = [...users];

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(user => 
        user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.role.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Role filter
    if (filter !== "all") {
      filtered = filtered.filter(user => user.role === filter);
    }

    // Sort
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'email':
          comparison = a.email.localeCompare(b.email);
          break;
        case 'role':
          comparison = a.role.localeCompare(b.role);
          break;
        case 'date':
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [users, searchQuery, filter, sortBy, sortOrder]);

  // Statistics
  const stats = useMemo(() => {
    return {
      total: users.length,
      superAdmin: users.filter(u => u.role === 'SUPERADMIN').length,
      admin: users.filter(u => u.role === 'ADMIN').length,
      regular: users.filter(u => u.role === 'USER').length,
    };
  }, [users]);

  const handleDeleteClick = (user: User) => {
    setUserToDelete({ id: user.id, email: user.email });
    setIsDeleteModalOpen(true);
    setMenuOpen(null);
  };

  const confirmDelete = async () => {
    if (userToDelete) {
      try {
        await api.deleteUser(userToDelete.id);
        setUsers(users.filter((u) => u.id !== userToDelete.id));
        setIsDeleteModalOpen(false);
        setUserToDelete(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to delete user");
      }
    }
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
      case "SUPERADMIN":
        return <Crown size={14} className="text-amber-500 shrink-0" />;
      case "ADMIN":
        return <Shield size={14} className="text-indigo-500 shrink-0" />;
      default:
        return <UserIcon size={14} className="text-zinc-400 shrink-0" />;
    }
  };

  const getRoleBadgeStyle = (role: string) => {
    switch (role) {
      case "SUPERADMIN":
        return "bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400";
      case "ADMIN":
        return "bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400";
      default:
        return "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400";
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) return 'Today';
    if (diffInDays === 1) return 'Yesterday';
    if (diffInDays < 7) return `${diffInDays} days ago`;
    if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`;
    if (diffInDays < 365) return `${Math.floor(diffInDays / 30)} months ago`;
    return date.toLocaleDateString();
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-zinc-500 dark:text-zinc-400 font-medium">
            Loading users...
          </p>
        </div>
      </div>
    );
  }

  // Determine sidebar based on role
  const SidebarComponent = isSuperAdmin ? Sidebar : AdminSidebar;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex transition-colors duration-300">
      <SidebarComponent />

      <main className="flex-1 ml-64 min-w-0">
        <Header />

        <div className="p-8">
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight mb-2">
                    Manage Users
                  </h1>
                  <p className="text-zinc-500 dark:text-zinc-400">
                    Review and manage platform members and administrators.
                  </p>
                </div>
                <button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition-colors shadow-lg shadow-indigo-200 dark:shadow-indigo-900/30"
                >
                  <Plus size={18} />
                  Add User
                </button>
              </div>

              {/* Statistics Cards */}
              <div className="grid grid-cols-4 gap-4 mb-6">
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4">
                  <div className="text-sm text-zinc-500 dark:text-zinc-400 mb-1">Total Users</div>
                  <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{stats.total}</div>
                </div>
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4">
                  <div className="text-sm text-zinc-500 dark:text-zinc-400 mb-1">Super Admins</div>
                  <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">{stats.superAdmin}</div>
                </div>
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4">
                  <div className="text-sm text-zinc-500 dark:text-zinc-400 mb-1">Admins</div>
                  <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{stats.admin}</div>
                </div>
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4">
                  <div className="text-sm text-zinc-500 dark:text-zinc-400 mb-1">Regular Users</div>
                  <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{stats.regular}</div>
                </div>
              </div>

              {/* Search and Filters */}
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4">
                <div className="flex items-center gap-4 flex-wrap">
                  {/* Search */}
                  <div className="flex-1 min-w-[300px] relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                    <input
                      type="text"
                      placeholder="Search users by name, email, or role..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                    />
                  </div>

                  {/* Role Filter */}
                  <div className="flex items-center gap-2">
                    <Filter size={16} className="text-zinc-400" />
                    <div className="bg-zinc-100 dark:bg-zinc-800 p-1 rounded-lg flex">
                      <button
                        onClick={() => setFilter("all")}
                        className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
                          filter === "all"
                            ? "bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 shadow-sm"
                            : "text-zinc-500 dark:text-zinc-400"
                        }`}
                      >
                        All
                      </button>
                      <button
                        onClick={() => setFilter("ADMIN")}
                        className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
                          filter === "ADMIN"
                            ? "bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 shadow-sm"
                            : "text-zinc-500 dark:text-zinc-400"
                        }`}
                      >
                        Admins
                      </button>
                      <button
                        onClick={() => setFilter("USER")}
                        className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
                          filter === "USER"
                            ? "bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 shadow-sm"
                            : "text-zinc-500 dark:text-zinc-400"
                        }`}
                      >
                        Users
                      </button>
                    </div>
                  </div>

                  {/* Sort */}
                  <div className="flex items-center gap-2">
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as SortOption)}
                      className="px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                    >
                      <option value="date">Sort by Date</option>
                      <option value="name">Sort by Name</option>
                      <option value="email">Sort by Email</option>
                      <option value="role">Sort by Role</option>
                    </select>
                    <button
                      onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                      className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                    >
                      {sortOrder === 'asc' ? <SortAsc size={16} /> : <SortDesc size={16} />}
                    </button>
                  </div>

                  {/* View Toggle */}
                  <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg p-1">
                    <button
                      onClick={() => setViewMode('grid')}
                      className={`p-2 rounded transition-colors ${
                        viewMode === 'grid' 
                          ? 'bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400' 
                          : 'text-zinc-500 dark:text-zinc-400'
                      }`}
                    >
                      <Grid3x3 size={16} />
                    </button>
                    <button
                      onClick={() => setViewMode('list')}
                      className={`p-2 rounded transition-colors ${
                        viewMode === 'list' 
                          ? 'bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400' 
                          : 'text-zinc-500 dark:text-zinc-400'
                      }`}
                    >
                      <List size={16} />
                    </button>
                  </div>

                  {/* Refresh */}
                  <button
                    onClick={fetchUsers}
                    className="p-2.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                    title="Refresh"
                  >
                    <RefreshCw size={18} className={isLoading ? 'animate-spin text-indigo-600' : 'text-zinc-500'} />
                  </button>
                </div>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-xl flex items-center gap-3 text-red-600 dark:text-red-400"
              >
                <AlertCircle size={20} />
                <span className="text-sm font-medium flex-1">{error}</span>
                <button
                  onClick={() => setError("")}
                  className="text-red-400 hover:text-red-600"
                >
                  <X size={18} />
                </button>
              </motion.div>
            )}

            {/* Users List/Grid */}
            {filteredAndSortedUsers.length === 0 ? (
              <div className="text-center py-20 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl">
                <div className="w-20 h-20 bg-zinc-100 dark:bg-zinc-900 rounded-full flex items-center justify-center mx-auto mb-4">
                  <UserIcon size={32} className="text-zinc-400" />
                </div>
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
                  {searchQuery || filter !== 'all' ? 'No users found' : 'No Users Yet'}
                </h3>
                <p className="text-zinc-500 dark:text-zinc-400 mb-6">
                  {searchQuery || filter !== 'all' 
                    ? 'Try adjusting your search or filters.' 
                    : 'Create your first user to get started.'}
                </p>
                {(!searchQuery && filter === 'all') && (
                  <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition-colors"
                  >
                    <Plus size={18} />
                    Add User
                  </button>
                )}
              </div>
            ) : viewMode === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-20">
                {filteredAndSortedUsers.map((user) => (
                  <UserCard
                    key={user.id}
                    user={user}
                    currentUserId={currentUser?.id}
                    onDelete={handleDeleteClick}
                    getInitials={getInitials}
                    getRoleIcon={getRoleIcon}
                    getRoleBadgeStyle={getRoleBadgeStyle}
                    formatDate={formatDate}
                    menuOpen={menuOpen}
                    setMenuOpen={setMenuOpen}
                  />
                ))}
              </div>
            ) : (
              <div className="space-y-3 pb-20">
                {filteredAndSortedUsers.map((user) => (
                  <UserListItem
                    key={user.id}
                    user={user}
                    currentUserId={currentUser?.id}
                    onDelete={handleDeleteClick}
                    getInitials={getInitials}
                    getRoleIcon={getRoleIcon}
                    getRoleBadgeStyle={getRoleBadgeStyle}
                    formatDate={formatDate}
                    menuOpen={menuOpen}
                    setMenuOpen={setMenuOpen}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      <DeleteUserModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        userEmail={userToDelete?.email || ""}
      />

      <CreateUserModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onUserCreated={fetchUsers}
      />
    </div>
  );
};

// Grid Card Component
const UserCard: React.FC<{
  user: User;
  currentUserId?: string;
  onDelete: (user: User) => void;
  getInitials: (name: string, email: string) => string;
  getRoleIcon: (role: string) => React.ReactNode;
  getRoleBadgeStyle: (role: string) => string;
  formatDate: (date: string) => string;
  menuOpen: string | null;
  setMenuOpen: (id: string | null) => void;
}> = ({ user, currentUserId, onDelete, getInitials, getRoleIcon, getRoleBadgeStyle, formatDate, menuOpen, setMenuOpen }) => {
  const canDelete = user.role !== "SUPERADMIN" && user.id !== currentUserId;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="group relative bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 transition-all hover:shadow-xl hover:shadow-zinc-200/50 dark:hover:shadow-none hover:border-indigo-200 dark:hover:border-indigo-900/30"
    >
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="relative">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-lg border border-indigo-100 dark:border-indigo-900/30 shrink-0">
              {user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.name}
                  className="w-full h-full object-cover rounded-xl"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              ) : (
                getInitials(user.name, user.email)
              )}
            </div>
            <div className="absolute -bottom-1 -right-1">
              {getRoleIcon(user.role)}
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 truncate">
              {user.name}
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate flex items-center gap-1 mt-1">
              <Mail size={10} />
              {user.email}
            </p>
          </div>
        </div>
        {canDelete && (
          <div className="relative">
            <button
              onClick={() => setMenuOpen(menuOpen === user.id ? null : user.id)}
              className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
            >
              <MoreVertical size={18} className="text-zinc-400" />
            </button>
            {menuOpen === user.id && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(null)} />
                <div className="absolute right-0 top-10 z-20 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-xl py-1 min-w-[160px]">
                  <button
                    onClick={() => { onDelete(user); setMenuOpen(null); }}
                    className="w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 flex items-center gap-2"
                  >
                    <Trash2 size={14} />
                    Delete
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider ${getRoleBadgeStyle(user.role)}`}>
            {user.role}
          </span>
          <div className="flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400">
            <Calendar size={12} />
            <span>{formatDate(user.createdAt)}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// List Item Component
const UserListItem: React.FC<{
  user: User;
  currentUserId?: string;
  onDelete: (user: User) => void;
  getInitials: (name: string, email: string) => string;
  getRoleIcon: (role: string) => React.ReactNode;
  getRoleBadgeStyle: (role: string) => string;
  formatDate: (date: string) => string;
  menuOpen: string | null;
  setMenuOpen: (id: string | null) => void;
}> = ({ user, currentUserId, onDelete, getInitials, getRoleIcon, getRoleBadgeStyle, formatDate, menuOpen, setMenuOpen }) => {
  const canDelete = user.role !== "SUPERADMIN" && user.id !== currentUserId;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="group bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 flex items-center justify-between gap-4 transition-all hover:shadow-lg"
    >
      <div className="flex items-center gap-4 flex-1 min-w-0">
        <div className="relative">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-lg border border-indigo-100 dark:border-indigo-900/30 shrink-0">
            {user.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.name}
                className="w-full h-full object-cover rounded-xl"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            ) : (
              getInitials(user.name, user.email)
            )}
          </div>
          <div className="absolute -bottom-1 -right-1">
            {getRoleIcon(user.role)}
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 truncate">
              {user.name}
            </h3>
          </div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 truncate flex items-center gap-1 mb-2">
            <Mail size={12} />
            {user.email}
          </p>
          <div className="flex items-center gap-3">
            <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider ${getRoleBadgeStyle(user.role)}`}>
              {user.role}
            </span>
            <div className="flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400">
              <Calendar size={12} />
              <span>{formatDate(user.createdAt)}</span>
            </div>
          </div>
        </div>
      </div>
      {canDelete && (
        <div className="relative">
          <button
            onClick={() => setMenuOpen(menuOpen === user.id ? null : user.id)}
            className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <MoreVertical size={18} className="text-zinc-400" />
          </button>
          {menuOpen === user.id && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(null)} />
              <div className="absolute right-0 top-10 z-20 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-xl py-1 min-w-[160px]">
                <button
                  onClick={() => { onDelete(user); setMenuOpen(null); }}
                  className="w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 flex items-center gap-2"
                >
                  <Trash2 size={14} />
                  Delete
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </motion.div>
  );
};

export default ManageUsersPage;
