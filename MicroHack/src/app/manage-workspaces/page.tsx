'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from "next/navigation";
import { useAuth } from '@/context/AuthContext';
import Sidebar from '@/components/layout/Sidebar';
import AdminSidebar from '@/components/layout/admin/AdminSidebar';
import Header from '@/components/layout/Header';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Edit2, 
    Trash2, 
    Mail, 
    Briefcase, 
    Users, 
    Loader2, 
    AlertCircle, 
    RefreshCw, 
    Plus,
    Search,
    Filter,
    Grid3x3,
    List,
    ChevronDown,
    ChevronUp,
    Calendar,
    GitBranch,
    ExternalLink,
    MoreVertical,
    X,
    SortAsc,
    SortDesc
} from 'lucide-react';
import { api, Space, SpaceMember } from '@/lib/api';
import CreateWorkspaceModal from '@/components/modals/CreateWorkspaceModal';

interface SpaceWithMembers extends Space {
    members?: SpaceMember[];
    _count?: {
        members: number;
    };
}

type SortOption = 'name' | 'date' | 'members';
type ViewMode = 'grid' | 'list';

const ManageWorkspacesPage = () => {
    const router = useRouter();
    const { user, isLoading: authLoading } = useAuth();
    const isSuperAdmin = user?.role === "SUPERADMIN";
    const isAdmin = user?.role === "ADMIN";
    const SidebarComponent = isSuperAdmin ? Sidebar : AdminSidebar;
    
    const [workspaces, setWorkspaces] = useState<SpaceWithMembers[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [expandedWorkspace, setExpandedWorkspace] = useState<string | null>(null);
    const [workspaceMembers, setWorkspaceMembers] = useState<Record<string, SpaceMember[]>>({});
    const [loadingMembers, setLoadingMembers] = useState<string | null>(null);
    const [deletingWorkspace, setDeletingWorkspace] = useState<string | null>(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    
    // New state for improved features
    const [searchQuery, setSearchQuery] = useState('');
    const [methodologyFilter, setMethodologyFilter] = useState<'ALL' | 'SCRUM' | 'KANBAN'>('ALL');
    const [sortBy, setSortBy] = useState<SortOption>('date');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
    const [viewMode, setViewMode] = useState<ViewMode>('grid');
    const [showFilters, setShowFilters] = useState(false);
    const [menuOpen, setMenuOpen] = useState<string | null>(null);

    useEffect(() => {
        // Only allow SUPERADMIN and ADMIN
        if (!authLoading && user && !["SUPERADMIN", "ADMIN"].includes(user.role)) {
            router.push("/dashboard");
            return;
        }

        if (!authLoading && user && (isSuperAdmin || isAdmin)) {
            fetchWorkspaces();
        }
    }, [authLoading, user, isSuperAdmin, isAdmin, router]);

    const fetchWorkspaces = async () => {
        setIsLoading(true);
        setError('');
        try {
            const response = await api.getSpaces(1, 100);
            if (response.success) {
                setWorkspaces(response.data || []);
            } else {
                setError('Failed to load workspaces');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load workspaces');
        } finally {
            setIsLoading(false);
        }
    };

    const fetchMembers = async (spaceId: string) => {
        if (workspaceMembers[spaceId]) {
            return;
        }
        setLoadingMembers(spaceId);
        try {
            const response = await api.getSpaceMembers(spaceId);
            if (response.success && response.data) {
                setWorkspaceMembers(prev => ({
                    ...prev,
                    [spaceId]: response.data || []
                }));
            }
        } catch (err) {
            console.error('Failed to load members:', err);
        } finally {
            setLoadingMembers(null);
        }
    };

    const handleToggleExpand = (spaceId: string) => {
        if (expandedWorkspace === spaceId) {
            setExpandedWorkspace(null);
        } else {
            setExpandedWorkspace(spaceId);
            fetchMembers(spaceId);
        }
    };

    const handleDeleteWorkspace = async (spaceId: string) => {
        if (!confirm('Are you sure you want to delete this workspace? This action cannot be undone.')) {
            return;
        }
        setDeletingWorkspace(spaceId);
        setMenuOpen(null);
        try {
            const response = await api.deleteSpace(spaceId);
            if (response.success) {
                setWorkspaces(prev => prev.filter(w => w.id !== spaceId));
            }
        } catch (err) {
            console.error('Failed to delete workspace:', err);
            alert('Failed to delete workspace');
        } finally {
            setDeletingWorkspace(null);
        }
    };

    const handleWorkspaceCreated = (space: Space) => {
        setWorkspaces(prev => [space, ...prev]);
    };

    const handleViewWorkspace = (spaceId: string) => {
        router.push(`/workspace/${spaceId}`);
    };

    const getRoleBadgeColor = (role?: string | null) => {
        switch (role) {
            case 'PRODUCT_OWNER': return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
            case 'SCRUM_MASTER': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
            case 'DEVELOPER': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
            default: return 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400';
        }
    };

    const formatRole = (role?: string | null) => {
        if (!role) return 'Member';
        return role.replace('_', ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
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

    // Filter and sort workspaces
    const filteredAndSortedWorkspaces = useMemo(() => {
        let filtered = [...workspaces];

        // Search filter
        if (searchQuery) {
            filtered = filtered.filter(ws => 
                ws.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                ws.owner?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                ws.owner?.email?.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        // Methodology filter
        if (methodologyFilter !== 'ALL') {
            filtered = filtered.filter(ws => ws.methodology === methodologyFilter);
        }

        // Sort
        filtered.sort((a, b) => {
            let comparison = 0;
            
            switch (sortBy) {
                case 'name':
                    comparison = a.name.localeCompare(b.name);
                    break;
                case 'date':
                    comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
                    break;
                case 'members':
                    comparison = (a._count?.members || 0) - (b._count?.members || 0);
                    break;
            }
            
            return sortOrder === 'asc' ? comparison : -comparison;
        });

        return filtered;
    }, [workspaces, searchQuery, methodologyFilter, sortBy, sortOrder]);

    // Statistics
    const stats = useMemo(() => {
        return {
            total: workspaces.length,
            scrum: workspaces.filter(w => w.methodology === 'SCRUM').length,
            kanban: workspaces.filter(w => w.methodology === 'KANBAN').length,
            totalMembers: workspaces.reduce((sum, w) => sum + (w._count?.members || 0), 0),
        };
    }, [workspaces]);

    return (
        <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex transition-colors duration-300">
            <SidebarComponent />

            <main className="flex-1 ml-64 min-w-0">
                <Header showSearch />

                <div className="p-8">
                    <div className="max-w-7xl mx-auto">
                        {/* Header */}
                        <div className="mb-8">
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight mb-2">
                                        Manage Workspaces
                                    </h1>
                                    <p className="text-zinc-500 dark:text-zinc-400">
                                        View, edit, or remove existing collaborative environments.
                                    </p>
                                </div>
                                <button
                                    onClick={() => setIsCreateModalOpen(true)}
                                    className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition-colors shadow-lg shadow-indigo-200 dark:shadow-indigo-900/30"
                                >
                                    <Plus size={18} />
                                    Create Workspace
                                </button>
                            </div>

                            {/* Statistics Cards */}
                            <div className="grid grid-cols-4 gap-4 mb-6">
                                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4">
                                    <div className="text-sm text-zinc-500 dark:text-zinc-400 mb-1">Total Workspaces</div>
                                    <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{stats.total}</div>
                                </div>
                                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4">
                                    <div className="text-sm text-zinc-500 dark:text-zinc-400 mb-1">SCRUM</div>
                                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.scrum}</div>
                                </div>
                                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4">
                                    <div className="text-sm text-zinc-500 dark:text-zinc-400 mb-1">KANBAN</div>
                                    <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{stats.kanban}</div>
                                </div>
                                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4">
                                    <div className="text-sm text-zinc-500 dark:text-zinc-400 mb-1">Total Members</div>
                                    <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{stats.totalMembers}</div>
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
                                            placeholder="Search workspaces..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="w-full pl-10 pr-4 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                                        />
                                    </div>

                                    {/* Methodology Filter */}
                                    <div className="flex items-center gap-2">
                                        <Filter size={16} className="text-zinc-400" />
                                        <select
                                            value={methodologyFilter}
                                            onChange={(e) => setMethodologyFilter(e.target.value as 'ALL' | 'SCRUM' | 'KANBAN')}
                                            className="px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                        >
                                            <option value="ALL">All Methodologies</option>
                                            <option value="SCRUM">SCRUM</option>
                                            <option value="KANBAN">KANBAN</option>
                                        </select>
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
                                            <option value="members">Sort by Members</option>
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
                                        onClick={fetchWorkspaces}
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
                            <div className="mb-6 p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-xl flex items-center gap-3 text-red-600 dark:text-red-400">
                                <AlertCircle size={20} />
                                <span className="text-sm font-medium">{error}</span>
                            </div>
                        )}

                        {/* Loading State */}
                        {isLoading ? (
                            <div className="flex items-center justify-center py-20">
                                <div className="text-center">
                                    <Loader2 className="animate-spin mx-auto mb-4 text-indigo-600" size={32} />
                                    <p className="text-zinc-500 dark:text-zinc-400">Loading workspaces...</p>
                                </div>
                            </div>
                        ) : filteredAndSortedWorkspaces.length === 0 ? (
                            <div className="text-center py-20 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl">
                                <div className="w-20 h-20 bg-zinc-100 dark:bg-zinc-900 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Briefcase size={32} className="text-zinc-400" />
                                </div>
                                <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
                                    {searchQuery || methodologyFilter !== 'ALL' ? 'No workspaces found' : 'No Workspaces Yet'}
                                </h3>
                                <p className="text-zinc-500 dark:text-zinc-400 mb-6">
                                    {searchQuery || methodologyFilter !== 'ALL' 
                                        ? 'Try adjusting your search or filters.' 
                                        : 'Create your first workspace to get started.'}
                                </p>
                                {(!searchQuery && methodologyFilter === 'ALL') && (
                                    <button
                                        onClick={() => setIsCreateModalOpen(true)}
                                        className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition-colors"
                                    >
                                        <Plus size={18} />
                                        Create Workspace
                                    </button>
                                )}
                            </div>
                        ) : viewMode === 'grid' ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-20">
                                {filteredAndSortedWorkspaces.map((workspace) => (
                                    <WorkspaceCard
                                        key={workspace.id}
                                        workspace={workspace}
                                        expanded={expandedWorkspace === workspace.id}
                                        members={workspaceMembers[workspace.id]}
                                        loadingMembers={loadingMembers === workspace.id}
                                        onToggleExpand={() => handleToggleExpand(workspace.id)}
                                        onDelete={() => handleDeleteWorkspace(workspace.id)}
                                        onView={() => handleViewWorkspace(workspace.id)}
                                        deleting={deletingWorkspace === workspace.id}
                                        getRoleBadgeColor={getRoleBadgeColor}
                                        formatRole={formatRole}
                                        formatDate={formatDate}
                                    />
                                ))}
                            </div>
                        ) : (
                            <div className="space-y-4 pb-20">
                                {filteredAndSortedWorkspaces.map((workspace) => (
                                    <WorkspaceListItem
                                        key={workspace.id}
                                        workspace={workspace}
                                        expanded={expandedWorkspace === workspace.id}
                                        members={workspaceMembers[workspace.id]}
                                        loadingMembers={loadingMembers === workspace.id}
                                        onToggleExpand={() => handleToggleExpand(workspace.id)}
                                        onDelete={() => handleDeleteWorkspace(workspace.id)}
                                        onView={() => handleViewWorkspace(workspace.id)}
                                        deleting={deletingWorkspace === workspace.id}
                                        getRoleBadgeColor={getRoleBadgeColor}
                                        formatRole={formatRole}
                                        formatDate={formatDate}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </main>

            <CreateWorkspaceModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onSuccess={handleWorkspaceCreated}
            />
        </div>
    );
};

// Grid Card Component
const WorkspaceCard: React.FC<{
    workspace: SpaceWithMembers;
    expanded: boolean;
    members?: SpaceMember[];
    loadingMembers: boolean;
    onToggleExpand: () => void;
    onDelete: () => void;
    onView: () => void;
    deleting: boolean;
    getRoleBadgeColor: (role?: string | null) => string;
    formatRole: (role?: string | null) => string;
    formatDate: (date: string) => string;
}> = ({ workspace, expanded, members, loadingMembers, onToggleExpand, onDelete, onView, deleting, getRoleBadgeColor, formatRole, formatDate }) => {
    const [menuOpen, setMenuOpen] = useState(false);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="group relative bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 transition-all hover:shadow-xl hover:shadow-zinc-200/50 dark:hover:shadow-none hover:border-indigo-200 dark:hover:border-indigo-900/30"
        >
            {/* Header */}
            <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                        <Briefcase size={24} />
                    </div>
                    <div className="min-w-0 flex-1">
                        <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 truncate">
                            {workspace.name}
                        </h3>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-1 mt-1">
                            <Calendar size={12} />
                            {formatDate(workspace.createdAt)}
                        </p>
                    </div>
                </div>
                <div className="relative">
                    <button
                        onClick={() => setMenuOpen(!menuOpen)}
                        className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                    >
                        <MoreVertical size={18} className="text-zinc-400" />
                    </button>
                    {menuOpen && (
                        <>
                            <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                            <div className="absolute right-0 top-10 z-20 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-xl py-1 min-w-[160px]">
                                <button
                                    onClick={() => { onView(); setMenuOpen(false); }}
                                    className="w-full px-4 py-2 text-left text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center gap-2"
                                >
                                    <ExternalLink size={14} />
                                    View Workspace
                                </button>
                                <button
                                    onClick={() => { onDelete(); setMenuOpen(false); }}
                                    disabled={deleting}
                                    className="w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 flex items-center gap-2 disabled:opacity-50"
                                >
                                    {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                                    Delete
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Info */}
            <div className="space-y-3 mb-4">
                <div className="flex items-center justify-between">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider ${
                        workspace.methodology === 'SCRUM' 
                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' 
                            : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400'
                    }`}>
                        {workspace.methodology}
                    </span>
                    <div className="flex items-center gap-1 text-zinc-500 dark:text-zinc-400 text-sm">
                        <Users size={14} />
                        <span className="font-medium">{workspace._count?.members || 0}</span>
                    </div>
                </div>
                {workspace.owner && (
                    <div className="text-xs text-zinc-500 dark:text-zinc-400">
                        Owner: <span className="font-medium">{workspace.owner.name}</span>
                    </div>
                )}
                {workspace.gitRepoUrl && (
                    <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                        <GitBranch size={12} />
                        <span className="truncate">{workspace.gitRepoUrl}</span>
                    </div>
                )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 pt-4 border-t border-zinc-200 dark:border-zinc-800">
                <button
                    onClick={onToggleExpand}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-100 rounded-lg transition-all font-medium text-sm"
                >
                    <Users size={14} />
                    <span>{expanded ? 'Hide' : 'Show'} Members</span>
                </button>
                <button
                    onClick={onView}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors font-medium text-sm"
                >
                    View
                </button>
            </div>

            {/* Members List */}
            <AnimatePresence>
                {expanded && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden mt-4 pt-4 border-t border-zinc-200 dark:border-zinc-800"
                    >
                        {loadingMembers ? (
                            <div className="flex items-center justify-center py-6">
                                <Loader2 className="animate-spin text-zinc-400" size={20} />
                            </div>
                        ) : !members || members.length === 0 ? (
                            <div className="text-center py-6 text-zinc-500 text-sm">No members yet</div>
                        ) : (
                            <div className="space-y-2 max-h-64 overflow-y-auto">
                                {members.map((member) => (
                                    <div
                                        key={member.id}
                                        className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-950/50 border border-zinc-100 dark:border-zinc-800/50 rounded-lg"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-white dark:bg-zinc-900 flex items-center justify-center border border-zinc-200 dark:border-zinc-800 text-indigo-600 dark:text-indigo-400 font-bold text-xs">
                                                {member.user?.name?.charAt(0).toUpperCase() || 'U'}
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                                                    {member.user?.name || 'Unknown'}
                                                </p>
                                                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                                    {member.user?.email || 'No email'}
                                                </p>
                                            </div>
                                        </div>
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${getRoleBadgeColor(member.scrumRole)}`}>
                                            {formatRole(member.scrumRole)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

// List Item Component
const WorkspaceListItem: React.FC<{
    workspace: SpaceWithMembers;
    expanded: boolean;
    members?: SpaceMember[];
    loadingMembers: boolean;
    onToggleExpand: () => void;
    onDelete: () => void;
    onView: () => void;
    deleting: boolean;
    getRoleBadgeColor: (role?: string | null) => string;
    formatRole: (role?: string | null) => string;
    formatDate: (date: string) => string;
}> = ({ workspace, expanded, members, loadingMembers, onToggleExpand, onDelete, onView, deleting, getRoleBadgeColor, formatRole, formatDate }) => {
    const [menuOpen, setMenuOpen] = useState(false);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 hover:shadow-lg transition-all"
        >
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                        <Briefcase size={24} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 truncate">
                                {workspace.name}
                            </h3>
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider ${
                                workspace.methodology === 'SCRUM' 
                                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' 
                                    : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400'
                            }`}>
                                {workspace.methodology}
                            </span>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-zinc-500 dark:text-zinc-400">
                            <div className="flex items-center gap-1">
                                <Users size={14} />
                                <span>{workspace._count?.members || 0} members</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <Calendar size={14} />
                                <span>{formatDate(workspace.createdAt)}</span>
                            </div>
                            {workspace.owner && (
                                <span>Owner: {workspace.owner.name}</span>
                            )}
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={onToggleExpand}
                        className="flex items-center gap-2 px-4 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-100 rounded-lg transition-all font-medium text-sm"
                    >
                        <Users size={16} />
                        <span>{expanded ? 'Hide' : 'Show'} Members</span>
                    </button>
                    <button
                        onClick={onView}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors font-medium text-sm"
                    >
                        View
                    </button>
                    <div className="relative">
                        <button
                            onClick={() => setMenuOpen(!menuOpen)}
                            className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                        >
                            <MoreVertical size={18} className="text-zinc-400" />
                        </button>
                        {menuOpen && (
                            <>
                                <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                                <div className="absolute right-0 top-10 z-20 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-xl py-1 min-w-[160px]">
                                    <button
                                        onClick={() => { onDelete(); setMenuOpen(false); }}
                                        disabled={deleting}
                                        className="w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 flex items-center gap-2 disabled:opacity-50"
                                    >
                                        {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                                        Delete
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Members List */}
            <AnimatePresence>
                {expanded && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden mt-4 pt-4 border-t border-zinc-200 dark:border-zinc-800"
                    >
                        {loadingMembers ? (
                            <div className="flex items-center justify-center py-6">
                                <Loader2 className="animate-spin text-zinc-400" size={20} />
                            </div>
                        ) : !members || members.length === 0 ? (
                            <div className="text-center py-6 text-zinc-500 text-sm">No members yet</div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {members.map((member) => (
                                    <div
                                        key={member.id}
                                        className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-950/50 border border-zinc-100 dark:border-zinc-800/50 rounded-lg"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-white dark:bg-zinc-900 flex items-center justify-center border border-zinc-200 dark:border-zinc-800 text-indigo-600 dark:text-indigo-400 font-bold text-xs">
                                                {member.user?.name?.charAt(0).toUpperCase() || 'U'}
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                                                    {member.user?.name || 'Unknown'}
                                                </p>
                                                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                                    {member.user?.email || 'No email'}
                                                </p>
                                            </div>
                                        </div>
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${getRoleBadgeColor(member.scrumRole)}`}>
                                            {formatRole(member.scrumRole)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

export default ManageWorkspacesPage;
