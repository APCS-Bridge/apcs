"use client";

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Search, UserPlus, Check, AlertCircle, User, Mail, Plus } from "lucide-react";
import { getInitials } from "@/lib/documentWorkflow";

export interface ValidatorCandidate {
  id: string;
  name: string;
  email?: string;
  avatarUrl?: string;
}

interface AddValidatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddValidator: (user: ValidatorCandidate, note?: string) => void;
  availableUsers: ValidatorCandidate[];
  existingValidatorIds: string[];
  insertPosition?: "start" | "end" | number;
}

const AddValidatorModal: React.FC<AddValidatorModalProps> = ({
  isOpen,
  onClose,
  onAddValidator,
  availableUsers,
  existingValidatorIds,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<ValidatorCandidate | null>(null);
  const [note, setNote] = useState("");
  const [step, setStep] = useState<"select" | "configure" | "create-new">("select");
  
  // New validator creation fields
  const [newValidatorName, setNewValidatorName] = useState("");
  const [newValidatorEmail, setNewValidatorEmail] = useState("");

  // Filter users that are not already validators
  const filteredUsers = useMemo(() => {
    return availableUsers
      .filter((user) => !existingValidatorIds.includes(user.id))
      .filter((user) => {
        if (!searchQuery.trim()) return true;
        const query = searchQuery.toLowerCase();
        return (
          user.name.toLowerCase().includes(query) ||
          (user.email?.toLowerCase().includes(query) ?? false)
        );
      });
  }, [availableUsers, existingValidatorIds, searchQuery]);

  // Check if search looks like an email
  const isEmailSearch = searchQuery.includes("@");

  const handleSelectUser = (user: ValidatorCandidate) => {
    setSelectedUser(user);
    setStep("configure");
  };

  const handleCreateNewValidator = () => {
    // Pre-fill email if search query looks like an email
    if (isEmailSearch) {
      setNewValidatorEmail(searchQuery);
    }
    setStep("create-new");
  };

  const handleAddNewValidator = () => {
    if (!newValidatorName.trim() || !newValidatorEmail.trim()) return;
    
    const newUser: ValidatorCandidate = {
      id: `external-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: newValidatorName.trim(),
      email: newValidatorEmail.trim(),
    };
    
    setSelectedUser(newUser);
    setStep("configure");
  };

  const handleAddValidator = () => {
    if (!selectedUser) return;
    onAddValidator(selectedUser, note.trim() || undefined);
    handleClose();
  };

  const handleClose = () => {
    setSearchQuery("");
    setSelectedUser(null);
    setNote("");
    setStep("select");
    setNewValidatorName("");
    setNewValidatorEmail("");
    onClose();
  };

  const handleBack = () => {
    if (step === "configure" && selectedUser?.id.startsWith("external-")) {
      setStep("create-new");
    } else if (step === "create-new") {
      setStep("select");
      setNewValidatorName("");
      setNewValidatorEmail("");
    } else {
      setStep("select");
    }
    setNote("");
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

          {/* Modal */}
          <div className="fixed inset-0 flex items-center justify-center z-[70] p-4 pointer-events-none">
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-3xl shadow-2xl pointer-events-auto border border-zinc-200 dark:border-zinc-800 max-h-[85vh] overflow-hidden flex flex-col"
            >
              {/* Header */}
              <div className="relative p-6 pb-4 border-b border-zinc-200 dark:border-zinc-800">
                <button
                  onClick={handleClose}
                  className="absolute right-4 top-4 p-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 transition-colors"
                >
                  <X size={20} />
                </button>

                <div className="w-14 h-14 bg-indigo-100 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-4">
                  <UserPlus size={28} />
                </div>
                <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
                  {step === "select" ? "Add Validator" : step === "create-new" ? "New External Validator" : "Configure Validator"}
                </h2>
                <p className="text-zinc-500 dark:text-zinc-400 text-sm mt-1">
                  {step === "select"
                    ? "Select a team member or add an external validator"
                    : step === "create-new"
                    ? "Add someone outside your team as a validator"
                    : `Adding ${selectedUser?.name} as validator`}
                </p>
              </div>

              {step === "select" ? (
                <>
                  {/* Search */}
                  <div className="p-4 border-b border-zinc-100 dark:border-zinc-800">
                    <div className="relative">
                      <Search
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400"
                        size={18}
                      />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search by name or email..."
                        className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl py-3 pl-12 pr-4 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none text-zinc-900 dark:text-zinc-100"
                      />
                    </div>
                  </div>

                  {/* User List */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-2 min-h-[250px] max-h-[400px]">
                    {/* Add External Validator Button - always visible */}
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleCreateNewValidator}
                      className="w-full p-4 rounded-2xl border-2 border-dashed border-indigo-300 dark:border-indigo-700 hover:border-indigo-400 dark:hover:border-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 transition-all flex items-center gap-4 text-left"
                    >
                      <div className="w-12 h-12 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                        <Plus size={24} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-indigo-600 dark:text-indigo-400">
                          Add External Validator
                        </p>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400">
                          {isEmailSearch ? `Add "${searchQuery}" as validator` : "Invite someone by email"}
                        </p>
                      </div>
                      <UserPlus className="text-indigo-500 flex-shrink-0" size={20} />
                    </motion.button>

                    {filteredUsers.length === 0 && !searchQuery ? (
                      <div className="flex flex-col items-center justify-center py-6 text-center">
                        <p className="text-zinc-500 dark:text-zinc-400 text-sm">
                          No team members available
                        </p>
                        <p className="text-zinc-400 dark:text-zinc-500 text-xs mt-1">
                          Use the button above to add an external validator
                        </p>
                      </div>
                    ) : filteredUsers.length === 0 && searchQuery ? (
                      <div className="flex flex-col items-center justify-center py-6 text-center">
                        <p className="text-zinc-500 dark:text-zinc-400 text-sm">
                          No matching team members found
                        </p>
                        <p className="text-zinc-400 dark:text-zinc-500 text-xs mt-1">
                          Try adding them as an external validator
                        </p>
                      </div>
                    ) : (
                      filteredUsers.map((user) => (
                        <motion.button
                          key={user.id}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => handleSelectUser(user)}
                          className="w-full p-4 rounded-2xl border border-zinc-200 dark:border-zinc-700 hover:border-indigo-300 dark:hover:border-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 transition-all flex items-center gap-4 text-left"
                        >
                          <div className="w-12 h-12 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold">
                            {user.avatarUrl ? (
                              <img
                                src={user.avatarUrl}
                                alt={user.name}
                                className="w-full h-full rounded-full object-cover"
                              />
                            ) : (
                              <span>{getInitials(user.name)}</span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                              {user.name}
                            </p>
                            {user.email && (
                              <p className="text-sm text-zinc-500 dark:text-zinc-400 truncate flex items-center gap-1">
                                <Mail size={12} />
                                {user.email}
                              </p>
                            )}
                          </div>
                          <UserPlus className="text-indigo-500 flex-shrink-0" size={20} />
                        </motion.button>
                      ))
                    )}
                  </div>
                </>
              ) : step === "create-new" ? (
                <>
                  {/* Create New External Validator Step */}
                  <div className="p-6 space-y-5 flex-1">
                    {/* Name Input */}
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 ml-1">
                        Full Name *
                      </label>
                      <div className="relative">
                        <User
                          className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400"
                          size={18}
                        />
                        <input
                          type="text"
                          value={newValidatorName}
                          onChange={(e) => setNewValidatorName(e.target.value)}
                          placeholder="John Doe"
                          required
                          className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl py-3 pl-12 pr-4 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none text-zinc-900 dark:text-zinc-100"
                        />
                      </div>
                    </div>

                    {/* Email Input */}
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 ml-1">
                        Email Address *
                      </label>
                      <div className="relative">
                        <Mail
                          className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400"
                          size={18}
                        />
                        <input
                          type="email"
                          value={newValidatorEmail}
                          onChange={(e) => setNewValidatorEmail(e.target.value)}
                          placeholder="validator@example.com"
                          required
                          className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl py-3 pl-12 pr-4 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none text-zinc-900 dark:text-zinc-100"
                        />
                      </div>
                      <p className="text-xs text-zinc-400 ml-1">
                        An invitation will be sent to this email
                      </p>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="p-6 pt-0 flex gap-3">
                    <button
                      onClick={handleBack}
                      className="flex-1 py-3.5 rounded-2xl border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 font-semibold hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                    >
                      Back
                    </button>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleAddNewValidator}
                      disabled={!newValidatorName.trim() || !newValidatorEmail.trim()}
                      className="flex-1 py-3.5 rounded-2xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 disabled:bg-zinc-300 dark:disabled:bg-zinc-700 transition-colors flex items-center justify-center gap-2"
                    >
                      Continue
                    </motion.button>
                  </div>
                </>
              ) : (
                <>
                  {/* Configure Step */}
                  <div className="p-6 space-y-5 flex-1">
                    {/* Selected User Info */}
                    <div className="flex items-center gap-4 p-4 bg-indigo-50 dark:bg-indigo-950/20 rounded-2xl border border-indigo-200 dark:border-indigo-900/50">
                      <div className="w-12 h-12 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold">
                        {selectedUser?.avatarUrl ? (
                          <img
                            src={selectedUser.avatarUrl}
                            alt={selectedUser.name}
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : (
                          <span>{selectedUser ? getInitials(selectedUser.name) : ""}</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-zinc-900 dark:text-zinc-100">
                          {selectedUser?.name}
                        </p>
                        {selectedUser?.email && (
                          <p className="text-sm text-zinc-500 dark:text-zinc-400 truncate">
                            {selectedUser.email}
                          </p>
                        )}
                      </div>
                      <Check className="text-indigo-500" size={24} />
                    </div>

                    {/* Note Input */}
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 ml-1">
                        Note for validator (optional)
                      </label>
                      <textarea
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="Add instructions or context for this validator..."
                        rows={3}
                        className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl py-3 px-4 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none text-zinc-900 dark:text-zinc-100 resize-none"
                      />
                      <p className="text-xs text-zinc-400 ml-1">
                        This note will be visible to the validator
                      </p>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="p-6 pt-0 flex gap-3">
                    <button
                      onClick={handleBack}
                      className="flex-1 py-3.5 rounded-2xl border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 font-semibold hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                    >
                      Back
                    </button>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleAddValidator}
                      className="flex-1 py-3.5 rounded-2xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
                    >
                      <UserPlus size={18} />
                      Add Validator
                    </motion.button>
                  </div>
                </>
              )}
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};

export default AddValidatorModal;
