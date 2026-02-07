"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Sidebar from "@/components/layout/Sidebar";
import AdminSidebar from "@/components/layout/admin/AdminSidebar";
import Header from "@/components/layout/Header";
import { getAssignedWorkflows, updateValidatorStatus, addComment, DocumentWorkflow } from "@/lib/documentWorkflow";
import { motion, AnimatePresence } from "framer-motion";
import { 
  FileText, CheckCircle, XCircle, Clock, 
  MessageCircle, Download, Eye, ChevronRight,
  AlertCircle, Send, Loader2
} from "lucide-react";
import { API_BASE_URL } from "@/lib/api";

interface ReviewWorkflow extends DocumentWorkflow {
  reviewerAssignment?: {
    id: string;
    status: 'pending' | 'approved' | 'rejected';
    comments: any[];
  };
}

const ReviewsPage: React.FC = () => {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [workflows, setWorkflows] = useState<ReviewWorkflow[]>([]);
  const [selectedWorkflow, setSelectedWorkflow] = useState<ReviewWorkflow | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [comment, setComment] = useState("");
  const [showPreview, setShowPreview] = useState(false);

  // Determine sidebar based on role
  const isSuperAdmin = user?.role === "SUPERADMIN";
  const SidebarComponent = isSuperAdmin ? Sidebar : AdminSidebar;

  useEffect(() => {
    if (!authLoading && user) {
      loadAssignedWorkflows();
    } else if (!authLoading && !user) {
      router.push("/login");
    }
  }, [authLoading, user, router]);

  const loadAssignedWorkflows = async () => {
    try {
      setLoading(true);
      const assigned = await getAssignedWorkflows();
      setWorkflows(assigned);
    } catch (error) {
      console.error("Failed to load assigned workflows:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedWorkflow || !user) return;
    
    const reviewerAssignment = selectedWorkflow.validators.find(
      v => v.userId === user.id
    );
    
    if (!reviewerAssignment) return;

    try {
      setSubmitting(true);
      // API expects reviewerId (user ID), not validatorId
      await updateValidatorStatus(
        selectedWorkflow.document.id,
        selectedWorkflow.id,
        reviewerAssignment.userId, // Use userId, not id
        "approved"
      );
      // Reload workflows to get updated data
      const reloaded = await getAssignedWorkflows();
      setWorkflows(reloaded);
      // Update selected workflow with fresh data
      const updated = reloaded.find(w => w.id === selectedWorkflow.id);
      if (updated) {
        setSelectedWorkflow(updated);
      }
    } catch (error: any) {
      console.error("Failed to approve:", error);
      alert(error.message || "Failed to approve document");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!selectedWorkflow || !user) return;
    
    const reviewerAssignment = selectedWorkflow.validators.find(
      v => v.userId === user.id
    );
    
    if (!reviewerAssignment) return;

    if (!comment.trim()) {
      alert("Please provide a comment explaining why you're rejecting this document.");
      return;
    }

    try {
      setSubmitting(true);
      // API expects reviewerId (user ID), not validatorId
      await updateValidatorStatus(
        selectedWorkflow.document.id,
        selectedWorkflow.id,
        reviewerAssignment.userId, // Use userId, not id
        "rejected"
      );
      
      // Add comment if provided
      if (comment.trim()) {
        await addComment(
          selectedWorkflow.document.id,
          selectedWorkflow.id,
          reviewerAssignment.userId, // Use userId, not id
          {
            authorId: user.id,
            authorName: user.name || "Reviewer",
            content: comment.trim()
          }
        );
      }
      
      setComment("");
      // Reload workflows to get updated data
      const reloaded = await getAssignedWorkflows();
      setWorkflows(reloaded);
      // Update selected workflow with fresh data
      const updated = reloaded.find(w => w.id === selectedWorkflow.id);
      if (updated) {
        setSelectedWorkflow(updated);
      }
    } catch (error: any) {
      console.error("Failed to reject:", error);
      alert(error.message || "Failed to reject document");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddComment = async () => {
    if (!selectedWorkflow || !user || !comment.trim()) return;
    
    const reviewerAssignment = selectedWorkflow.validators.find(
      v => v.userId === user.id
    );
    
    if (!reviewerAssignment) return;

    try {
      setSubmitting(true);
      // API expects reviewerId (user ID), not validatorId
      await addComment(
        selectedWorkflow.document.id,
        selectedWorkflow.id,
        reviewerAssignment.userId, // Use userId, not id
        {
          authorId: user.id,
          authorName: user.name || "Reviewer",
          content: comment.trim()
        }
      );
      
      setComment("");
      // Reload workflows to get updated data
      const reloaded = await getAssignedWorkflows();
      setWorkflows(reloaded);
      // Update selected workflow with fresh data
      const updated = reloaded.find(w => w.id === selectedWorkflow.id);
      if (updated) {
        setSelectedWorkflow(updated);
      }
    } catch (error: any) {
      console.error("Failed to add comment:", error);
      alert(error.message || "Failed to add comment");
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusInfo = (status: string) => {
    switch (status) {
      case "approved":
        return {
          icon: <CheckCircle className="text-emerald-500" size={16} />,
          text: "Approved",
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
      default:
        return {
          icon: <Clock className="text-amber-500" size={16} />,
          text: "Pending",
          color: "text-amber-600 dark:text-amber-400",
          bg: "bg-amber-50 dark:bg-amber-950/30",
        };
    }
  };

  const getDocumentUrl = (workflow: ReviewWorkflow) => {
    if (!workflow.document.fileUrl) return '';
    
    if (workflow.document.fileUrl.startsWith('blob:')) {
      return workflow.document.fileUrl;
    }
    
    if (workflow.document.fileUrl.startsWith('http://') || workflow.document.fileUrl.startsWith('https://')) {
      return workflow.document.fileUrl;
    }
    
    // If it starts with /, prepend API_BASE_URL
    if (workflow.document.fileUrl.startsWith('/')) {
      // Remove /api from API_BASE_URL if present, then add the fileUrl
      const serverBase = API_BASE_URL.replace('/api', '');
      return `${serverBase}${workflow.document.fileUrl}`;
    }
    
    // Otherwise, assume it's a relative path
    const serverBase = API_BASE_URL.replace('/api', '');
    return `${serverBase}${workflow.document.fileUrl.startsWith('/') ? '' : '/'}${workflow.document.fileUrl}`;
  };

  const currentUserReviewer = selectedWorkflow?.validators.find(
    v => v.userId === user?.id
  );

  const canReview = currentUserReviewer?.status === 'pending';

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
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">
                My Reviews
              </h1>
              <p className="text-zinc-500 dark:text-zinc-400">
                Documents assigned to you for review
              </p>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="animate-spin text-indigo-600" size={32} />
              </div>
            ) : (
              <div className="flex gap-6">
          {/* Workflow List */}
          <div className="w-80 shrink-0 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden flex flex-col">
            <div className="p-4 border-b border-zinc-200 dark:border-zinc-800">
              <h3 className="font-semibold text-zinc-700 dark:text-zinc-300 text-sm">
                Assigned Reviews ({workflows.length})
              </h3>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-2">
              {workflows.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full py-8 text-center px-4">
                  <div className="w-14 h-14 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mb-3">
                    <FileText className="text-zinc-400" size={24} />
                  </div>
                  <p className="text-zinc-500 dark:text-zinc-400 text-sm">
                    No reviews assigned
                  </p>
                </div>
              ) : (
                workflows.map((workflow) => {
                  const reviewer = workflow.validators.find(v => v.userId === user?.id);
                  const statusInfo = getStatusInfo(reviewer?.status || 'pending');
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
                            by {workflow.document.createdByName}
                          </p>
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

          {/* Review Detail */}
          <div className="flex-1 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden flex flex-col">
            {selectedWorkflow ? (
              <>
                {/* Header */}
                <div className="p-6 border-b border-zinc-200 dark:border-zinc-800">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">
                        {selectedWorkflow.document.title}
                      </h2>
                      {selectedWorkflow.document.description && (
                        <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">
                          {selectedWorkflow.document.description}
                        </p>
                      )}
                      <div className="flex items-center gap-4 text-sm">
                        <span className="text-zinc-500 dark:text-zinc-400">
                          Created by <span className="font-medium">{selectedWorkflow.document.createdByName}</span>
                        </span>
                        <span className="text-zinc-400">•</span>
                        <span className="text-zinc-500 dark:text-zinc-400">
                          {selectedWorkflow.document.fileName}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setShowPreview(!showPreview)}
                        className="p-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                      >
                        <Eye size={20} />
                      </motion.button>
                      {selectedWorkflow.document.fileUrl && (
                        <motion.a
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          href={getDocumentUrl(selectedWorkflow)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                        >
                          <Download size={20} />
                        </motion.a>
                      )}
                    </div>
                  </div>
                </div>

                {/* Document Preview */}
                {showPreview && selectedWorkflow.document.fileUrl && (
                  <div className="p-6 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
                    <div className="rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-800">
                      {selectedWorkflow.document.mimeType?.startsWith('image/') ? (
                        <img
                          src={getDocumentUrl(selectedWorkflow)}
                          alt={selectedWorkflow.document.title}
                          className="w-full h-auto max-h-96 object-contain"
                        />
                      ) : selectedWorkflow.document.mimeType === 'application/pdf' ? (
                        <iframe
                          src={getDocumentUrl(selectedWorkflow)}
                          className="w-full h-96"
                          title={selectedWorkflow.document.title}
                        />
                      ) : (
                        <div className="p-8 text-center text-zinc-500">
                          <FileText size={48} className="mx-auto mb-2 opacity-50" />
                          <p>Preview not available for this file type</p>
                          <a
                            href={getDocumentUrl(selectedWorkflow)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-indigo-600 dark:text-indigo-400 hover:underline mt-2 inline-block"
                          >
                            Download to view
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Review Actions */}
                {canReview && (
                  <div className="p-6 border-b border-zinc-200 dark:border-zinc-800 bg-amber-50 dark:bg-amber-950/20">
                    <div className="flex items-center gap-2 mb-4">
                      <AlertCircle className="text-amber-600 dark:text-amber-400" size={18} />
                      <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                        Your review is pending
                      </p>
                    </div>
                    
                    {/* Comment Input */}
                    <div className="mb-4">
                      <textarea
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        placeholder="Add your comments or feedback..."
                        rows={4}
                        className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none text-zinc-900 dark:text-zinc-100 resize-none"
                      />
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3">
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleApprove}
                        disabled={submitting}
                        className="flex-1 py-3 px-6 bg-emerald-600 hover:bg-emerald-700 disabled:bg-zinc-300 dark:disabled:bg-zinc-700 text-white rounded-xl font-semibold transition-colors flex items-center justify-center gap-2"
                      >
                        <CheckCircle size={18} />
                        Approve
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleReject}
                        disabled={submitting || !comment.trim()}
                        className="flex-1 py-3 px-6 bg-red-600 hover:bg-red-700 disabled:bg-zinc-300 dark:disabled:bg-zinc-700 text-white rounded-xl font-semibold transition-colors flex items-center justify-center gap-2"
                      >
                        <XCircle size={18} />
                        Reject
                      </motion.button>
                      {comment.trim() && (
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={handleAddComment}
                          disabled={submitting}
                          className="py-3 px-6 bg-indigo-600 hover:bg-indigo-700 disabled:bg-zinc-300 dark:disabled:bg-zinc-700 text-white rounded-xl font-semibold transition-colors flex items-center justify-center gap-2"
                        >
                          <Send size={18} />
                          Add Comment
                        </motion.button>
                      )}
                    </div>
                  </div>
                )}

                {/* Status Display */}
                {!canReview && currentUserReviewer && (
                  <div className="p-6 border-b border-zinc-200 dark:border-zinc-800">
                    <div className={`p-4 rounded-xl ${getStatusInfo(currentUserReviewer.status).bg}`}>
                      <div className="flex items-center gap-2">
                        {getStatusInfo(currentUserReviewer.status).icon}
                        <p className={`font-semibold ${getStatusInfo(currentUserReviewer.status).color}`}>
                          You have {currentUserReviewer.status === 'approved' ? 'approved' : 'rejected'} this document
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Comments Section */}
                <div className="flex-1 overflow-y-auto p-6">
                  <h3 className="font-semibold text-zinc-700 dark:text-zinc-300 mb-4 flex items-center gap-2">
                    <MessageCircle size={18} />
                    Comments
                  </h3>
                  {currentUserReviewer?.comments && currentUserReviewer.comments.length > 0 ? (
                    <div className="space-y-4">
                      {currentUserReviewer.comments.map((comment: any) => (
                        <div key={comment.id} className="p-4 bg-zinc-50 dark:bg-zinc-800 rounded-xl">
                          <div className="flex items-start justify-between mb-2">
                            <p className="font-medium text-sm text-zinc-900 dark:text-zinc-100">
                              {comment.authorName || 'Unknown'}
                            </p>
                            <span className="text-xs text-zinc-400">
                              {new Date(comment.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-sm text-zinc-600 dark:text-zinc-400">
                            {comment.content}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-zinc-400 text-sm">
                      No comments yet
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                <div className="w-20 h-20 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mb-4">
                  <FileText className="text-zinc-400" size={32} />
                </div>
                <h3 className="text-lg font-semibold text-zinc-700 dark:text-zinc-300">
                  Select a Review
                </h3>
                <p className="text-zinc-500 dark:text-zinc-400 text-sm mt-1 max-w-sm">
                  Choose a document from the list to start your review
                </p>
              </div>
            )}
          </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default ReviewsPage;

