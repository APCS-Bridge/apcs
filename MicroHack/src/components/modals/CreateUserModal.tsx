'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mail, UserPlus, Lock, RefreshCw, User, AlertCircle, CheckCircle } from 'lucide-react';
import { api } from '@/lib/api';

interface CreateUserModalProps {
    isOpen: boolean;
    onClose: () => void;
    onUserCreated?: () => void;
}

const CreateUserModal: React.FC<CreateUserModalProps> = ({ isOpen, onClose, onUserCreated }) => {
    const [email, setEmail] = useState('');
    const [name, setName] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState<'ADMIN' | 'USER'>('USER');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const generatePassword = () => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
        let generated = '';
        for (let i = 0; i < 12; i++) {
            generated += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        setPassword(generated);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setIsSubmitting(true);

        try {
            const response = await api.createUser({
                email,
                password,
                name,
                role,
            });

            if (response.success) {
                setSuccess(`User "${name}" created successfully!`);
                setTimeout(() => {
                    onClose();
                    onUserCreated?.();
                    // Reset form
                    setEmail('');
                    setName('');
                    setPassword('');
                    setRole('USER');
                    setSuccess('');
                }, 1500);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to create user');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        setError('');
        setSuccess('');
        onClose();
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
                            className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-3xl shadow-2xl pointer-events-auto border border-zinc-200 dark:border-zinc-800 max-h-[90vh] overflow-y-auto"
                        >
                            {/* Header */}
                            <div className="relative p-8 pb-0">
                                <button
                                    onClick={handleClose}
                                    className="absolute right-6 top-6 p-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 transition-colors"
                                >
                                    <X size={20} />
                                </button>
                                <div className="w-14 h-14 bg-indigo-100 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-6 font-bold shadow-sm shadow-indigo-100 dark:shadow-none">
                                    <UserPlus size={28} />
                                </div>
                                <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">Create User</h2>
                                <p className="text-zinc-500 dark:text-zinc-400 mt-1">Register a new member or administrator.</p>
                            </div>

                            {/* Form */}
                            <form onSubmit={handleSubmit} className="p-8 space-y-5">
                                {/* Error Message */}
                                {error && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-2xl flex items-center gap-3 text-red-600 dark:text-red-400"
                                    >
                                        <AlertCircle size={20} />
                                        <span className="text-sm font-medium">{error}</span>
                                    </motion.div>
                                )}

                                {/* Success Message */}
                                {success && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 rounded-2xl flex items-center gap-3 text-green-600 dark:text-green-400"
                                    >
                                        <CheckCircle size={20} />
                                        <span className="text-sm font-medium">{success}</span>
                                    </motion.div>
                                )}

                                {/* Name Input */}
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 ml-1">Full Name</label>
                                    <div className="relative">
                                        <User className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                                        <input
                                            type="text"
                                            required
                                            placeholder="John Doe"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl py-3.5 pl-12 pr-4 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none text-zinc-900 dark:text-zinc-100"
                                        />
                                    </div>
                                </div>

                                {/* Email Input */}
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 ml-1">Email Address</label>
                                    <div className="relative">
                                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                                        <input
                                            type="email"
                                            required
                                            placeholder="admin@microhack.com"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl py-3.5 pl-12 pr-4 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none text-zinc-900 dark:text-zinc-100"
                                        />
                                    </div>
                                </div>

                                {/* Password Input */}
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center px-1">
                                        <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Password</label>
                                        <button
                                            type="button"
                                            onClick={generatePassword}
                                            className="text-xs font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5 hover:opacity-80 transition-opacity"
                                        >
                                            <RefreshCw size={12} />
                                            <span>Auto-generate</span>
                                        </button>
                                    </div>
                                    <div className="relative">
                                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                                        <input
                                            type="text"
                                            required
                                            minLength={8}
                                            placeholder="Min. 8 characters"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl py-3.5 pl-12 pr-4 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none text-zinc-900 dark:text-zinc-100 font-mono"
                                        />
                                    </div>
                                </div>

                                {/* Role Selection */}
                                <div className="space-y-3">
                                    <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 ml-1">Account Role</label>
                                    <div className="bg-zinc-100 dark:bg-zinc-950 p-1.5 rounded-2xl flex relative border border-zinc-200 dark:border-zinc-800">
                                        <motion.div
                                            className="absolute top-1.5 bottom-1.5 w-[calc(50%-0.375rem)] bg-white dark:bg-zinc-800 rounded-xl shadow-sm"
                                            animate={{ x: role === 'USER' ? 0 : '100%' }}
                                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setRole('USER')}
                                            className={`relative z-10 flex-1 py-2 text-sm font-bold transition-colors ${role === 'USER' ? 'text-indigo-600 dark:text-indigo-400' : 'text-zinc-500'}`}
                                        >
                                            User
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setRole('ADMIN')}
                                            className={`relative z-10 flex-1 py-2 text-sm font-bold transition-colors ${role === 'ADMIN' ? 'text-indigo-600 dark:text-indigo-400' : 'text-zinc-500'}`}
                                        >
                                            Admin
                                        </button>
                                    </div>
                                    <p className="text-xs text-zinc-500 dark:text-zinc-400 ml-1">SuperAdmin can create Admin and User accounts</p>
                                </div>

                                {/* Submit */}
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-2xl py-4 font-bold shadow-lg shadow-indigo-200 dark:shadow-indigo-900/30 transition-all flex items-center justify-center space-x-2 mt-4"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                            <span>Creating...</span>
                                        </>
                                    ) : (
                                        <>
                                            <UserPlus size={20} />
                                            <span>Add User</span>
                                        </>
                                    )}
                                </motion.button>
                            </form>
                        </motion.div>
                    </div>
                </>
            )}
        </AnimatePresence>
    );
};

export default CreateUserModal;
