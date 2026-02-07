"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  Trash2,
  ChevronRight,
  PlusCircle,
  AlertCircle,
  ArrowRight,
  Upload,
  File,
  X,
  Info,
} from "lucide-react";
import {
  DocumentWorkflow as DocumentWorkflowType,
  Validator,
  getWorkflows,
  createWorkflow,
  addValidator,
  removeValidator,
  updateValidatorStatus,
  addComment,
  updateValidatorNote,
  resendNotification,
  deleteWorkflow,
  getStatusColor,
} from "@/lib/documentWorkflow";
import ValidationNode from "./ValidationNode";
import CommentsModal from "./CommentsModal";
import AddValidatorModal, { ValidatorCandidate } from "./AddValidatorModal";

interface DocumentWorkflowViewProps {
  spaceId: string;
  currentUserId: string;
  currentUserName: string;
  members: ValidatorCandidate[];
  isOwner?: boolean;
}

import WarningModal from "@/components/ui/WarningModal";

const DocumentWorkflowView: React.FC<DocumentWorkflowViewProps> = ({
  spaceId,
  currentUserId,
  currentUserName,
  members,
  isOwner = false,
}) => {
  const [warningModal, setWarningModal] = useState<{
    isOpen: boolean;
    message: string;
  }>({ isOpen: false, message: "" });
  const [workflows, setWorkflows] = useState<DocumentWorkflowType[]>([]);
  const [selectedWorkflow, setSelectedWorkflow] = useState<DocumentWorkflowType | null>(null);
  const [commentsModal, setCommentsModal] = useState<{
    isOpen: boolean;
    validator: Validator | null;
  }>({ isOpen: false, validator: null });
  const [addValidatorModal, setAddValidatorModal] = useState<{
    isOpen: boolean;
    insertPosition: number | null;
  }>({ isOpen: false, insertPosition: null });
  const [isCreatingWorkflow, setIsCreatingWorkflow] = useState(false);
  const [newDocTitle, setNewDocTitle] = useState("");
  const [newDocDescription, setNewDocDescription] = useState("");
  const [newDocFile, setNewDocFile] = useState<File | null>(null);
  const [notificationSent, setNotificationSent] = useState<string | null>(null);

  // Load workflows from storage
  const loadWorkflows = useCallback(async () => {
    try {
      const loaded = await getWorkflows(spaceId);
      setWorkflows(Array.isArray(loaded) ? loaded : []);
    } catch (error) {
      console.error("Failed to load workflows:", error);
      setWorkflows([]); // Set to empty array on error
    }
  }, [spaceId]);

  // Update selected workflow when workflows change (only if it still exists)
  useEffect(() => {
    if (selectedWorkflow) {
      const updated = workflows.find((w) => w.id === selectedWorkflow.id);
      if (updated && updated !== selectedWorkflow) {
        // Only update if the workflow data actually changed (different object reference)
        setSelectedWorkflow(updated);
      } else if (!updated) {
        // Clear selection if workflow no longer exists
        setSelectedWorkflow(null);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workflows]); // Only depend on workflows, not selectedWorkflow to avoid loops

  useEffect(() => {
    loadWorkflows();
    console.log('🚀 [Workflow] Component mounted - Loading workflows from API');
  }, [loadWorkflows]);

  // Create new workflow
  const handleCreateWorkflow = async () => {
    if (!newDocTitle.trim()) return;

    // Create a fake URL for the file (in a real app, you'd upload to a server)
    // For now we still do this locally until file upload API is ready, or use a placeholder
    const fileUrl = newDocFile ? URL.createObjectURL(newDocFile) : "https://example.com/placeholder.pdf";

    try {
      const workflow = await createWorkflow(spaceId, {
        title: newDocTitle.trim(),
        description: newDocDescription.trim() || undefined,
        fileUrl, // API requires documentUrl
        fileName: newDocFile?.name || "document.pdf",
        fileSize: newDocFile?.size || 0,
        fileType: newDocFile?.type || "application/pdf",
        createdById: currentUserId,
        createdByName: currentUserName,
      });

      setWorkflows(await getWorkflows(spaceId));
      setSelectedWorkflow(workflow);
      setNewDocTitle("");
      setNewDocDescription("");
      setNewDocFile(null);
      setIsCreatingWorkflow(false);
    } catch (error: any) {
      console.error("Failed to create workflow:", error);
      setWarningModal({
        isOpen: true,
        message: error.message || "Failed to create workflow. Please try again.",
      });
    }
  };

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setNewDocFile(file);
      // Auto-fill title from filename if empty
      if (!newDocTitle.trim()) {
        const nameWithoutExt = file.name.replace(/\.[^/.]+$/, "");
        setNewDocTitle(nameWithoutExt);
      }
    }
  };

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  // Add validator
  const handleAddValidator = async (user: ValidatorCandidate, note?: string) => {
    if (!selectedWorkflow) return;

    const position =
      addValidatorModal.insertPosition !== null
        ? addValidatorModal.insertPosition
        : undefined;

    try {
      const updated = await addValidator(spaceId, selectedWorkflow.id, {
        userId: user.id,
        userName: user.name,
        userEmail: user.email,
        avatarUrl: user.avatarUrl,
        note,
      }, position);

      if (updated) {
        setSelectedWorkflow(updated);
        setWorkflows(await getWorkflows(spaceId));
      }
    } catch (error: any) {
      console.error("Failed to add validator:", error);
      setWarningModal({
        isOpen: true,
        message: error.message || "Failed to add validator. Please try again.",
      });
    }
    setAddValidatorModal({ isOpen: false, insertPosition: null });
  };

  // Remove validator
  const handleRemoveValidator = async (validatorId: string) => {
    if (!selectedWorkflow) return;

    try {
      const updated = await removeValidator(spaceId, selectedWorkflow.id, validatorId);
      if (updated) {
        setSelectedWorkflow(updated);
        setWorkflows(await getWorkflows(spaceId));
      }
    } catch (error: any) {
      console.error("Failed to remove validator:", error);
      setWarningModal({
        isOpen: true,
        message: error.message || "Failed to remove validator.",
      });
    }
  };

  // Update validator status
  const handleUpdateStatus = async (validatorId: string, status: "approved" | "rejected") => {
    if (!selectedWorkflow) return;

    try {
      const updated = await updateValidatorStatus(
        spaceId,
        selectedWorkflow.id,
        validatorId,
        status
      );
      if (updated) {
        setSelectedWorkflow(updated);
        setWorkflows(await getWorkflows(spaceId));
      }
    } catch (error: any) {
      console.error("Failed to update status:", error);
      setWarningModal({
        isOpen: true,
        message: error.message || "Failed to update review status.",
      });
    }
  };

  // Add comment
  const handleAddComment = async (validatorId: string, content: string) => {
    if (!selectedWorkflow) return;

    // Find the validator to get the userId (API expects userId, not validator record id)
    const validator = selectedWorkflow.validators.find((v) => v.id === validatorId);
    if (!validator) return;

    try {
      const updated = await addComment(spaceId, selectedWorkflow.id, validator.userId, {
        authorId: currentUserId,
        authorName: currentUserName,
        content,
      });
      if (updated) {
        setSelectedWorkflow(updated);
        setWorkflows(await getWorkflows(spaceId));
        // Update comments modal validator
        const updatedValidator = updated.validators.find((v) => v.id === validatorId);
        if (updatedValidator) {
          setCommentsModal({ isOpen: true, validator: updatedValidator });
        }
      }
    } catch (error: any) {
      console.error("Failed to add comment:", error);
      setWarningModal({
        isOpen: true,
        message: error.message || "Failed to add comment.",
      });
    }
  };

  // Update validator note
  const handleUpdateNote = async (validatorId: string, note: string) => {
    if (!selectedWorkflow) return;

    try {
      const updated = await updateValidatorNote(
        spaceId,
        selectedWorkflow.id,
        validatorId,
        note
      );
      if (updated) {
        setSelectedWorkflow(updated);
        setWorkflows(await getWorkflows(spaceId));
        // Update comments modal validator
        const validator = updated.validators.find((v) => v.id === validatorId);
        if (validator) {
          setCommentsModal({ isOpen: true, validator });
        }
      }
    } catch (error: any) {
      console.error("Failed to update note:", error);
      setWarningModal({
        isOpen: true,
        message: error.message || "Failed to update note.",
      });
    }
  };

  // Resend notification
  const handleResendNotification = async (validatorId: string) => {
    if (!selectedWorkflow) return;

    try {
      const updated = await resendNotification(spaceId, selectedWorkflow.id, validatorId);
      if (updated) {
        setSelectedWorkflow(updated);
        setWorkflows(await getWorkflows(spaceId));
        setNotificationSent(validatorId);
        setTimeout(() => setNotificationSent(null), 2000);
      }
    } catch (error: any) {
      console.error("Failed to resend notification:", error);
      setWarningModal({
        isOpen: true,
        message: error.message || "Failed to resend notification.",
      });
    }
  };

  // Delete workflow
  const handleDeleteWorkflow = async (workflowId: string) => {
    try {
      await deleteWorkflow(spaceId, workflowId);
      setWorkflows(await getWorkflows(spaceId));
      if (selectedWorkflow?.id === workflowId) {
        setSelectedWorkflow(null);
      }
    } catch (error: any) {
      console.error("Failed to delete workflow:", error);
      setWarningModal({
        isOpen: true,
        message: error.message || "Failed to delete workflow.",
      });
    }
  };

  // Get workflow status info
  const getWorkflowStatusInfo = (workflow: DocumentWorkflowType) => {
    switch (workflow.status) {
      case "completed":
        return {
          icon: <CheckCircle className="text-emerald-500\" size={16} />,
          text: "Completed",
          color: "text-emerald-600 dark:text-emerald-400",
          bg: "bg-emerald-50 dark:bg-emerald-950/30",
        };
      case "rejected":
        return {
          icon: <XCircle className="text-red-500" size={16} />,
          text: "Rejected",
          color: "text-red-600 dark:text-red-400",
          bg: "bg-red-50 dark:bg-red-950/30",
        };
      case "in_progress":
        return {
          icon: <Clock className="text-amber-500" size={16} />,
          text: "In Progress",
          color: "text-amber-600 dark:text-amber-400",
          bg: "bg-amber-50 dark:bg-amber-950/30",
        };
      default:
        return {
          icon: <FileText className="text-zinc-400" size={16} />,
          text: "Draft",
          color: "text-zinc-600 dark:text-zinc-400",
          bg: "bg-zinc-50 dark:bg-zinc-800",
        };
    }
  };

  // Check if current user is the document owner
  const isDocumentOwner =
    selectedWorkflow?.document.createdById === currentUserId || isOwner;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
            Document Validation Workflows
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Create and manage document approval workflows
          </p>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsCreatingWorkflow(true)}
          className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-medium text-sm hover:bg-indigo-700 transition-colors flex items-center gap-2"
        >
          <Plus size={18} />
          New Workflow
        </motion.button>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex gap-6 min-h-0">
        {/* Workflow List */}
        <div className="w-72 flex-shrink-0 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden flex flex-col">
          <div className="p-4 border-b border-zinc-200 dark:border-zinc-800">
            <h3 className="font-semibold text-zinc-700 dark:text-zinc-300 text-sm">
              Your Workflows
            </h3>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {workflows.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full py-8 text-center px-4">
                <div className="w-14 h-14 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mb-3">
                  <FileText className="text-zinc-400" size={24} />
                </div>
                <p className="text-zinc-500 dark:text-zinc-400 text-sm">
                  No workflows yet
                </p>
                <p className="text-zinc-400 dark:text-zinc-500 text-xs mt-1">
                  Create your first workflow
                </p>
              </div>
            ) : (
              workflows.map((workflow) => {
                const statusInfo = getWorkflowStatusInfo(workflow);
                const isSelected = selectedWorkflow?.id === workflow.id;
                return (
                  <motion.button
                    key={workflow.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setSelectedWorkflow(workflow)}
                    className={`
                      w-full p-3 rounded-xl text-left transition-all
                      ${isSelected
                        ? "bg-indigo-50 dark:bg-indigo-950/30 border-indigo-300 dark:border-indigo-700"
                        : "bg-zinc-50 dark:bg-zinc-800/50 border-transparent hover:bg-zinc-100 dark:hover:bg-zinc-800"
                      }
                      border
                    `}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-zinc-800 dark:text-zinc-200 text-sm truncate">
                          {workflow.document.title}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span
                            className={`
                              px-2 py-0.5 rounded-full text-[10px] font-medium flex items-center gap-1
                              ${statusInfo.bg} ${statusInfo.color}
                            `}
                          >
                            {statusInfo.icon}
                            {statusInfo.text}
                          </span>
                        </div>
                        <p className="text-[10px] text-zinc-400 mt-1">
                          {workflow.validators.length} validator
                          {workflow.validators.length !== 1 ? "s" : ""}
                        </p>
                        {/* Debug: Show creator info */}
                        {workflow.document.createdByName && (
                          <p className="text-[9px] text-zinc-500 dark:text-zinc-500 mt-0.5">
                            by {workflow.document.createdByName}
                          </p>
                        )}
                      </div>
                      <ChevronRight
                        className={`shrink-0 transition-colors ${isSelected
                          ? "text-indigo-500"
                          : "text-zinc-300 dark:text-zinc-600"
                          }`}
                        size={16}
                      />
                    </div>
                  </motion.button>
                );
              })
            )}
          </div>
        </div>

        {/* Workflow Detail View */}
        <div className="flex-1 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden flex flex-col">
          {selectedWorkflow ? (
            <>
              {/* Workflow Header */}
              <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-zinc-900 dark:text-zinc-100">
                    {selectedWorkflow.document.title}
                  </h3>
                  {selectedWorkflow.document.description && (
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
                      {selectedWorkflow.document.description}
                    </p>
                  )}

                  {/* File Info */}
                  {selectedWorkflow.document.fileName && (
                    <div className="flex items-center gap-2 mt-2 p-2 bg-zinc-50 dark:bg-zinc-800 rounded-lg w-fit">
                      <File className="text-indigo-500" size={16} />
                      <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                        {selectedWorkflow.document.fileName}
                      </span>
                      {selectedWorkflow.document.fileSize && (
                        <span className="text-xs text-zinc-400">
                          ({formatFileSize(selectedWorkflow.document.fileSize)})
                        </span>
                      )}
                      {selectedWorkflow.document.fileUrl && (
                        <a
                          href={selectedWorkflow.document.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline ml-1"
                        >
                          View
                        </a>
                      )}
                    </div>
                  )}

                  <div className="flex items-center gap-3 mt-2">
                    <span
                      className={`
                        px-2.5 py-1 rounded-full text-xs font-medium flex items-center gap-1.5
                        ${getWorkflowStatusInfo(selectedWorkflow).bg}
                        ${getWorkflowStatusInfo(selectedWorkflow).color}
                      `}
                    >
                      {getWorkflowStatusInfo(selectedWorkflow).icon}
                      {getWorkflowStatusInfo(selectedWorkflow).text}
                    </span>
                    <span className="text-xs text-zinc-400">
                      Created by {selectedWorkflow.document.createdByName}
                    </span>
                  </div>
                </div>
                {isDocumentOwner && (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleDeleteWorkflow(selectedWorkflow.id)}
                    className="p-2 rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                  >
                    <Trash2 size={18} />
                  </motion.button>
                )}
              </div>

              {/* Notification Toast */}
              <AnimatePresence>
                {notificationSent && (
                  <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="absolute top-20 left-1/2 -translate-x-1/2 px-4 py-2 bg-emerald-500 text-white rounded-lg text-sm font-medium shadow-lg z-50"
                  >
                    Notification resent successfully!
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Workflow Chain */}
              <div className="flex-1 overflow-x-auto p-8">
                <div className="flex items-center justify-start min-w-max gap-2">
                  {/* Start Node (Document) */}
                  <div className="flex flex-col items-center">
                    <div className="w-14 h-14 rounded-full bg-indigo-100 dark:bg-indigo-900/30 border-2 border-indigo-500 flex items-center justify-center">
                      <FileText className="text-indigo-600 dark:text-indigo-400" size={24} />
                    </div>
                    <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400 mt-2">
                      Document
                    </span>
                  </div>

                  {/* Add validator at start */}
                  {isDocumentOwner && (
                    <>
                      <ArrowRight className="text-zinc-300 dark:text-zinc-600 mx-1" size={20} />
                      <motion.button
                        whileHover={{ scale: 1.2 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() =>
                          setAddValidatorModal({ isOpen: true, insertPosition: 0 })
                        }
                        className="w-8 h-8 rounded-full border-2 border-dashed border-zinc-300 dark:border-zinc-600 flex items-center justify-center text-zinc-400 hover:border-indigo-400 hover:text-indigo-500 transition-colors"
                      >
                        <PlusCircle size={20} />
                      </motion.button>
                    </>
                  )}

                  {/* Validators Chain */}
                  <AnimatePresence mode="popLayout">
                    {selectedWorkflow.validators.map((validator, index) => (
                      <React.Fragment key={validator.id}>
                        <ArrowRight
                          className="text-zinc-300 dark:text-zinc-600 mx-1"
                          size={20}
                        />
                        <ValidationNode
                          validator={validator}
                          onOpenComments={() =>
                            setCommentsModal({ isOpen: true, validator })
                          }
                          onResendNotification={() =>
                            handleResendNotification(validator.id)
                          }
                          onRemove={() => handleRemoveValidator(validator.id)}
                          onApprove={() => handleUpdateStatus(validator.id, "approved")}
                          onReject={() => handleUpdateStatus(validator.id, "rejected")}
                          isCurrentUserValidator={validator.userId === currentUserId}
                          canEdit={isDocumentOwner}
                        />

                        {/* Add validator between nodes */}
                        {isDocumentOwner && (
                          <>
                            <ArrowRight
                              className="text-zinc-300 dark:text-zinc-600 mx-1"
                              size={20}
                            />
                            <motion.button
                              whileHover={{ scale: 1.2 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={() =>
                                setAddValidatorModal({
                                  isOpen: true,
                                  insertPosition: index + 1,
                                })
                              }
                              className="w-8 h-8 rounded-full border-2 border-dashed border-zinc-300 dark:border-zinc-600 flex items-center justify-center text-zinc-400 hover:border-indigo-400 hover:text-indigo-500 transition-colors"
                            >
                              <PlusCircle size={20} />
                            </motion.button>
                          </>
                        )}
                      </React.Fragment>
                    ))}
                  </AnimatePresence>

                  {/* End Node (when completed) */}
                  {selectedWorkflow.status === "completed" && (
                    <>
                      <ArrowRight
                        className="text-emerald-400 mx-1"
                        size={20}
                      />
                      <div className="flex flex-col items-center">
                        <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-900/30 border-2 border-emerald-500 flex items-center justify-center">
                          <CheckCircle
                            className="text-emerald-600 dark:text-emerald-400"
                            size={24}
                          />
                        </div>
                        <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 mt-2">
                          Approved
                        </span>
                      </div>
                    </>
                  )}

                  {/* Show empty state if no validators */}
                  {selectedWorkflow.validators.length === 0 && !isDocumentOwner && (
                    <div className="flex items-center gap-4 ml-4 px-6 py-4 bg-zinc-50 dark:bg-zinc-800 rounded-xl">
                      <AlertCircle className="text-zinc-400" size={20} />
                      <p className="text-zinc-500 dark:text-zinc-400 text-sm">
                        No validators have been added yet
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Workflow Legend */}
              <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-center gap-6">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full border-2 border-zinc-300 dark:border-zinc-600" />
                  <span className="text-xs text-zinc-500">Pending</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full border-2 border-emerald-500" />
                  <span className="text-xs text-zinc-500">Approved</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full border-2 border-red-500" />
                  <span className="text-xs text-zinc-500">Rejected</span>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
              <div className="w-20 h-20 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mb-4">
                <FileText className="text-zinc-400" size={32} />
              </div>
              <h3 className="text-lg font-semibold text-zinc-700 dark:text-zinc-300">
                Select a Workflow
              </h3>
              <p className="text-zinc-500 dark:text-zinc-400 text-sm mt-1 max-w-sm">
                Choose a workflow from the list or create a new one to start
                managing document validations
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Create Workflow Modal */}
      <AnimatePresence>
        {isCreatingWorkflow && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCreatingWorkflow(false)}
              className="fixed inset-0 bg-zinc-950/60 backdrop-blur-sm z-[60]"
            />
            <div className="fixed inset-0 flex items-center justify-center z-[70] p-4 pointer-events-none">
              <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-3xl shadow-2xl pointer-events-auto border border-zinc-200 dark:border-zinc-800"
              >
                <div className="p-6 border-b border-zinc-200 dark:border-zinc-800">
                  <div className="w-14 h-14 bg-indigo-100 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-4">
                    <FileText size={28} />
                  </div>
                  <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
                    New Workflow
                  </h2>
                  <p className="text-zinc-500 dark:text-zinc-400 text-sm mt-1">
                    Create a new document validation workflow
                  </p>
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleCreateWorkflow();
                  }}
                  className="p-6 space-y-4"
                >
                  {/* File Upload */}
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                      Upload Document *
                    </label>
                    {!newDocFile ? (
                      <label
                        className="
                          flex flex-col items-center justify-center w-full h-32
                          border-2 border-dashed border-zinc-300 dark:border-zinc-700
                          rounded-2xl cursor-pointer
                          hover:border-indigo-400 dark:hover:border-indigo-600
                          hover:bg-indigo-50 dark:hover:bg-indigo-950/20
                          transition-all
                        "
                      >
                        <Upload className="text-zinc-400 mb-2" size={28} />
                        <span className="text-sm text-zinc-500 dark:text-zinc-400 font-medium">
                          Click to upload or drag and drop
                        </span>
                        <span className="text-xs text-zinc-400 mt-1">
                          PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, JPG, PNG
                        </span>
                        <input
                          type="file"
                          className="hidden"
                          accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.txt"
                          onChange={handleFileChange}
                        />
                      </label>
                    ) : (
                      <div className="flex items-center gap-3 p-4 bg-indigo-50 dark:bg-indigo-950/20 rounded-2xl border border-indigo-200 dark:border-indigo-900/50">
                        <div className="w-12 h-12 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                          <File size={24} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-zinc-900 dark:text-zinc-100 truncate text-sm">
                            {newDocFile.name}
                          </p>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400">
                            {formatFileSize(newDocFile.size)}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setNewDocFile(null)}
                          className="p-2 rounded-xl hover:bg-red-100 dark:hover:bg-red-950/30 text-red-500 transition-colors"
                        >
                          <X size={18} />
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                      Document Title *
                    </label>
                    <input
                      type="text"
                      value={newDocTitle}
                      onChange={(e) => setNewDocTitle(e.target.value)}
                      placeholder="e.g., Q1 Report, Project Proposal..."
                      required
                      className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl py-3 px-4 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none text-zinc-900 dark:text-zinc-100"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                      Description (optional)
                    </label>
                    <textarea
                      value={newDocDescription}
                      onChange={(e) => setNewDocDescription(e.target.value)}
                      placeholder="Add context about what needs to be validated..."
                      rows={3}
                      className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl py-3 px-4 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none text-zinc-900 dark:text-zinc-100 resize-none"
                    />
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIsCreatingWorkflow(false);
                        setNewDocFile(null);
                        setNewDocTitle("");
                        setNewDocDescription("");
                      }}
                      className="flex-1 py-3 rounded-2xl border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 font-semibold hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                    >
                      Cancel
                    </button>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      type="submit"
                      disabled={!newDocTitle.trim()}
                      className="flex-1 py-3 rounded-2xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 disabled:bg-zinc-300 dark:disabled:bg-zinc-700 transition-colors flex items-center justify-center gap-2"
                    >
                      <Plus size={18} />
                      Create
                    </motion.button>
                  </div>
                </form>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>

      {/* Comments Modal */}
      {commentsModal.validator && (
        <CommentsModal
          isOpen={commentsModal.isOpen}
          onClose={() => setCommentsModal({ isOpen: false, validator: null })}
          validator={commentsModal.validator}
          currentUserId={currentUserId}
          currentUserName={currentUserName}
          onAddComment={(content) =>
            handleAddComment(commentsModal.validator!.id, content)
          }
          onUpdateNote={(note) =>
            handleUpdateNote(commentsModal.validator!.id, note)
          }
          canEditNote={isDocumentOwner}
        />
      )}

      {/* Add Validator Modal */}
      <AddValidatorModal
        isOpen={addValidatorModal.isOpen}
        onClose={() => setAddValidatorModal({ isOpen: false, insertPosition: null })}
        onAddValidator={handleAddValidator}
        availableUsers={members}
        existingValidatorIds={selectedWorkflow?.validators.map((v) => v.userId) || []}
        insertPosition={
          addValidatorModal.insertPosition === null
            ? "end"
            : addValidatorModal.insertPosition
        }
      />
      <WarningModal
        isOpen={warningModal.isOpen}
        onClose={() => setWarningModal({ isOpen: false, message: "" })}
        title="Warning"
        message={warningModal.message}
      />
    </div>
  );
};

export default DocumentWorkflowView;
