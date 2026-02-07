'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Trash2, Briefcase, Layout, AlertCircle, Check, ChevronDown, Search, Loader2 } from 'lucide-react';
import { api, User, Space } from '@/lib/api';

interface CreateWorkspaceModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: (space: Space) => void;
}

type Methodology = 'KANBAN' | 'SCRUM';

interface SelectedMember {
    userId: string;
    user: User;
    scrumRole?: 'PRODUCT_OWNER' | 'SCRUM_MASTER' | 'DEVELOPER';
}

const CreateWorkspaceModal: React.FC<CreateWorkspaceModalProps> = ({ isOpen, onClose, onSuccess }) => {
    const [name, setName] = useState('');
    const [methodology, setMethodology] = useState<Methodology>('KANBAN');
    const [selectedMembers, setSelectedMembers] = useState<SelectedMember[]>([]);
    const [availableUsers, setAvailableUsers] = useState<User[]>([]);
    const [isLoadingUsers, setIsLoadingUsers] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    
    // Use ref to track submitting state synchronously (prevents double-clicks)
    const isSubmittingRef = useRef(false);
    
    // User search/dropdown state
    const [showUserDropdown, setShowUserDropdown] = useState(false);
    const [userSearchQuery, setUserSearchQuery] = useState('');

    // Fetch available users when modal opens
    useEffect(() => {
        if (isOpen) {
            fetchUsers();
        }
    }, [isOpen]);

    const fetchUsers = async () => {
        setIsLoadingUsers(true);
        try {
            const response = await api.getUsers(1, 100); // Get up to 100 users
            if (response.success) {
                // Filter out SUPERADMIN from the list
                const filteredUsers = response.data.filter(u => u.role !== 'SUPERADMIN');
                setAvailableUsers(filteredUsers);
            }
        } catch (err) {
            console.error('Failed to fetch users:', err);
        } finally {
            setIsLoadingUsers(false);
        }
    };

    const handleAddMember = (user: User, role?: 'PRODUCT_OWNER' | 'SCRUM_MASTER' | 'DEVELOPER') => {
        // Check if user already added
        if (selectedMembers.some(m => m.userId === user.id)) {
            return;
        }
        
        setSelectedMembers([...selectedMembers, {
            userId: user.id,
            user,
            scrumRole: methodology === 'SCRUM' ? role : undefined
        }]);
        setShowUserDropdown(false);
        setUserSearchQuery('');
    };

    const handleRemoveMember = (userId: string) => {
        setSelectedMembers(selectedMembers.filter(m => m.userId !== userId));
    };

    const handleUpdateMemberRole = (userId: string, role: 'PRODUCT_OWNER' | 'SCRUM_MASTER' | 'DEVELOPER') => {
        setSelectedMembers(selectedMembers.map(m => 
            m.userId === userId ? { ...m, scrumRole: role } : m
        ));
    };

    const filteredUsers = availableUsers.filter(user => {
        // Exclude already selected users
        if (selectedMembers.some(m => m.userId === user.id)) {
            return false;
        }
        // Filter by search query
        if (userSearchQuery) {
            const query = userSearchQuery.toLowerCase();
            return user.name.toLowerCase().includes(query) || user.email.toLowerCase().includes(query);
        }
        return true;
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        e.stopPropagation();
        
        // Prevent multiple submissions using ref (synchronous check)
        if (isSubmittingRef.current) {
            return;
        }
        
        // Set submitting state immediately (both ref and state)
        isSubmittingRef.current = true;
        setIsSubmitting(true);
        setError('');
        setSuccess('');

        try {
            // Validate
            if (!name.trim()) {
                throw new Error('Workspace name is required');
            }

            if (methodology === 'SCRUM') {
                const hasProductOwner = selectedMembers.some(m => m.scrumRole === 'PRODUCT_OWNER');
                const hasScrumMaster = selectedMembers.some(m => m.scrumRole === 'SCRUM_MASTER');
                if (!hasProductOwner || !hasScrumMaster) {
                    throw new Error('SCRUM workspace requires at least a Product Owner and a Scrum Master');
                }
            }

            // Create the space
            const spaceResponse = await api.createSpace({
                name: name.trim(),
                methodology
            });

            if (!spaceResponse.success || !spaceResponse.data) {
                throw new Error(spaceResponse.message || 'Failed to create workspace');
            }

            const space = spaceResponse.data;

            // Add members to the space
            for (const member of selectedMembers) {
                try {
                    await api.addSpaceMember(space.id, member.userId, member.scrumRole);
                } catch (memberErr) {
                    console.error(`Failed to add member ${member.user.email}:`, memberErr);
                }
            }

            setSuccess('Workspace created successfully!');
            
            // Notify parent and close after a short delay
            setTimeout(() => {
                onSuccess?.(space);
                handleClose();
            }, 1500);

        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to create workspace';
            setError(errorMessage);
            // Reset submitting state on error so user can try again
            isSubmittingRef.current = false;
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        // Reset form
        setName('');
        setMethodology('KANBAN');
        setSelectedMembers([]);
        setError('');
        setSuccess('');
        setUserSearchQuery('');
        setShowUserDropdown(false);
        // Reset submitting state
        isSubmittingRef.current = false;
        setIsSubmitting(false);
        onClose();
    };

    const getRoleBadgeColor = (role?: string) => {
        switch (role) {
            case 'PRODUCT_OWNER': return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
            case 'SCRUM_MASTER': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
            case 'DEVELOPER': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
            default: return 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400';
        }
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
                        onClick={handleClose}
                        className="fixed inset-0 bg-zinc-950/60 backdrop-blur-sm z-[60]"
                    />

                    {/* Modal Container */}
                    <div className="fixed inset-0 flex items-center justify-center z-[70] p-4 pointer-events-none">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="bg-white dark:bg-zinc-900 w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col rounded-[32px] shadow-2xl pointer-events-auto border border-zinc-200 dark:border-zinc-800"
                        >
                            {/* Header */}
                            <div className="relative p-8 pb-4">
                                <button
                                    onClick={handleClose}
                                    className="absolute right-6 top-6 p-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 transition-colors"
                                >
                                    <X size={20} />
                                </button>
                                <div className="flex items-center space-x-4 mb-2">
                                    <div className="w-14 h-14 bg-indigo-100 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold shadow-sm shadow-indigo-100 dark:shadow-none">
                                        <Briefcase size={28} />
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">Create Workspace</h2>
                                        <p className="text-zinc-500 dark:text-zinc-400 text-sm">Configure your new collaborative environment</p>
                                    </div>
                                </div>
                            </div>

                            {/* Error/Success Messages */}
                            {error && (
                                <div className="mx-8 mb-4 p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-2xl flex items-center gap-3 text-red-600 dark:text-red-400">
                                    <AlertCircle size={20} />
                                    <span className="text-sm font-medium">{error}</span>
                                </div>
                            )}
                            {success && (
                                <div className="mx-8 mb-4 p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 rounded-2xl flex items-center gap-3 text-green-600 dark:text-green-400">
                                    <Check size={20} />
                                    <span className="text-sm font-medium">{success}</span>
                                </div>
                            )}

                            {/* Form */}
                            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 pt-4 space-y-6">
                                {/* Workspace Name */}
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 ml-1">Workspace Name</label>
                                    <div className="relative">
                                        <Layout className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                                        <input
                                            type="text"
                                            required
                                            placeholder="Enter workspace name..."
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl py-3.5 pl-12 pr-4 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none text-zinc-900 dark:text-zinc-100"
                                        />
                                    </div>
                                </div>

                                {/* Methodology Toggle */}
                                <div className="space-y-3">
                                    <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 ml-1">Methodology</label>
                                    <div className="bg-zinc-100 dark:bg-zinc-950 p-1.5 rounded-2xl flex relative border border-zinc-200 dark:border-zinc-800">
                                        <motion.div
                                            className="absolute top-1.5 bottom-1.5 w-[calc(50%-0.375rem)] bg-white dark:bg-zinc-800 rounded-xl shadow-sm"
                                            animate={{ x: methodology === 'KANBAN' ? 0 : '100%' }}
                                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setMethodology('KANBAN')}
                                            className={`relative z-10 flex-1 py-2 text-sm font-bold transition-colors ${methodology === 'KANBAN' ? 'text-indigo-600 dark:text-indigo-400' : 'text-zinc-500'}`}
                                        >
                                            Kanban
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setMethodology('SCRUM')}
                                            className={`relative z-10 flex-1 py-2 text-sm font-bold transition-colors ${methodology === 'SCRUM' ? 'text-indigo-600 dark:text-indigo-400' : 'text-zinc-500'}`}
                                        >
                                            Kanban + Sprint
                                        </button>
                                    </div>
                                </div>

                                {/* Members Section */}
                                <div className="space-y-4">
                                    <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 ml-1">
                                        {methodology === 'SCRUM' ? 'Team Members' : 'Members'}
                                    </label>

                                    {/* Selected Members List */}
                                    <div className="space-y-2">
                                        {selectedMembers.map((member) => (
                                            <motion.div
                                                key={member.userId}
                                                initial={{ opacity: 0, x: -10 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                className="flex items-center gap-3 p-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl"
                                            >
                                                <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold">
                                                    {member.user.name.charAt(0).toUpperCase()}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">{member.user.name}</p>
                                                    <p className="text-xs text-zinc-500 truncate">{member.user.email}</p>
                                                </div>
                                                
                                                {/* Role Selector for SCRUM */}
                                                {methodology === 'SCRUM' && (
                                                    <select
                                                        value={member.scrumRole || 'DEVELOPER'}
                                                        onChange={(e) => handleUpdateMemberRole(member.userId, e.target.value as 'PRODUCT_OWNER' | 'SCRUM_MASTER' | 'DEVELOPER')}
                                                        className={`text-xs font-semibold px-3 py-1.5 rounded-lg border-0 cursor-pointer ${getRoleBadgeColor(member.scrumRole)}`}
                                                    >
                                                        <option value="DEVELOPER">Developer</option>
                                                        <option value="PRODUCT_OWNER">Product Owner</option>
                                                        <option value="SCRUM_MASTER">Scrum Master</option>
                                                    </select>
                                                )}

                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveMember(member.userId)}
                                                    aria-label="Remove member"
                                                    className="p-2 rounded-xl text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </motion.div>
                                        ))}
                                    </div>

                                    {/* Add Member Dropdown */}
                                    <div className="relative">
                                        <button
                                            type="button"
                                            onClick={() => setShowUserDropdown(!showUserDropdown)}
                                            className="flex items-center space-x-2 text-sm font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 transition-colors group"
                                        >
                                            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center group-hover:bg-indigo-100 transition-colors">
                                                <Plus size={16} />
                                            </div>
                                            <span>Add Member</span>
                                            <ChevronDown size={16} className={`transition-transform ${showUserDropdown ? 'rotate-180' : ''}`} />
                                        </button>

                                        {/* User Dropdown */}
                                        <AnimatePresence>
                                            {showUserDropdown && (
                                                <motion.div
                                                    initial={{ opacity: 0, y: -10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0, y: -10 }}
                                                    className="absolute left-0 right-0 mt-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl z-50 overflow-hidden"
                                                >
                                                    {/* Search */}
                                                    <div className="p-3 border-b border-zinc-200 dark:border-zinc-800">
                                                        <div className="relative">
                                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
                                                            <input
                                                                type="text"
                                                                placeholder="Search users..."
                                                                value={userSearchQuery}
                                                                onChange={(e) => setUserSearchQuery(e.target.value)}
                                                                className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl py-2 pl-10 pr-4 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none"
                                                            />
                                                        </div>
                                                    </div>

                                                    {/* User List */}
                                                    <div className="max-h-48 overflow-y-auto">
                                                        {isLoadingUsers ? (
                                                            <div className="p-4 text-center text-zinc-500">
                                                                <Loader2 className="animate-spin mx-auto mb-2" size={20} />
                                                                <span className="text-sm">Loading users...</span>
                                                            </div>
                                                        ) : filteredUsers.length === 0 ? (
                                                            <div className="p-4 text-center text-zinc-500 text-sm">
                                                                No users available
                                                            </div>
                                                        ) : (
                                                            filteredUsers.map((user) => (
                                                                <button
                                                                    key={user.id}
                                                                    type="button"
                                                                    onClick={() => handleAddMember(user, methodology === 'SCRUM' ? 'DEVELOPER' : undefined)}
                                                                    className="w-full flex items-center gap-3 p-3 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors text-left"
                                                                >
                                                                    <div className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-400 font-medium text-sm">
                                                                        {user.name.charAt(0).toUpperCase()}
                                                                    </div>
                                                                    <div className="flex-1 min-w-0">
                                                                        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">{user.name}</p>
                                                                        <p className="text-xs text-zinc-500 truncate">{user.email}</p>
                                                                    </div>
                                                                    <span className={`text-xs px-2 py-1 rounded-lg ${user.role === 'ADMIN' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'}`}>
                                                                        {user.role}
                                                                    </span>
                                                                </button>
                                                            ))
                                                        )}
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>

                                    {/* SCRUM Role Hint */}
                                    {methodology === 'SCRUM' && selectedMembers.length > 0 && (
                                        <p className="text-xs text-zinc-500 dark:text-zinc-400 ml-1">
                                            💡 Assign roles to team members. Each SCRUM team needs a Product Owner and Scrum Master.
                                        </p>
                                    )}
                                </div>
                            </form>

                            {/* Footer Actions */}
                            <div className="p-8 bg-zinc-50 dark:bg-zinc-900/50 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-end space-x-3">
                                <button
                                    type="button"
                                    onClick={handleClose}
                                    disabled={isSubmitting}
                                    className="px-6 py-3.5 rounded-2xl text-sm font-bold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                                <motion.button
                                    type="button"
                                    whileHover={!isSubmitting ? { scale: 1.02 } : {}}
                                    whileTap={!isSubmitting ? { scale: 0.98 } : {}}
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        // Double-check using ref (synchronous) to prevent rapid double-clicks
                                        if (!isSubmittingRef.current && !isSubmitting) {
                                            handleSubmit(e);
                                        }
                                    }}
                                    disabled={isSubmitting}
                                    className="px-10 py-3.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-75 text-white rounded-2xl text-sm font-bold shadow-lg shadow-indigo-200 dark:shadow-indigo-900/30 transition-all flex items-center gap-2"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <Loader2 className="animate-spin" size={18} />
                                            <span>Creating...</span>
                                        </>
                                    ) : (
                                        <span>Create Workspace</span>
                                    )}
                                </motion.button>
                            </div>
                        </motion.div>
                    </div>
                </>
            )}
        </AnimatePresence>
    );
};

export default CreateWorkspaceModal;
