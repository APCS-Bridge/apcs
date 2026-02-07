/**
 * Document Validation Workflow Types and Utilities
 * Connected to Backend API
 */

import { api, DocumentReviewWorkflow, DocumentReviewer } from "./api";

// ═══════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════

export type ValidationStatus = 'pending' | 'approved' | 'rejected';

export interface ValidationComment {
  id: string;
  authorId: string;
  authorName: string;
  content: string;
  createdAt: string;
}

export interface Validator {
  id: string;
  userId: string;
  userName: string;
  userEmail?: string;
  avatarUrl?: string;
  status: ValidationStatus;
  note?: string; // Note from document owner to validator
  comments: ValidationComment[];
  notifiedAt?: string;
  validatedAt?: string;
  order: number;
}

export interface Document {
  id: string;
  title: string;
  description?: string;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  fileType?: string;
  mimeType?: string;
  createdById: string;
  createdByName: string;
  createdByEmail?: string;
  spaceId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentWorkflow {
  id: string;
  document: Document;
  validators: Validator[];
  status: 'draft' | 'in_progress' | 'completed' | 'rejected';
  createdAt: string;
  updatedAt: string;
}

// ═══════════════════════════════════════════════════════════════
// Mappers
// ═══════════════════════════════════════════════════════════════

function mapBackendToFrontend(backendWorkflow: DocumentReviewWorkflow): DocumentWorkflow {
  // Handle case where reviewers might be undefined or null
  const reviewers = backendWorkflow.reviewers || [];
  
  if (!Array.isArray(reviewers)) {
    console.warn('[mapBackendToFrontend] reviewers is not an array:', backendWorkflow);
    return {
      id: backendWorkflow.id,
      document: {
        id: backendWorkflow.id,
        title: backendWorkflow.title,
        description: backendWorkflow.description,
        fileUrl: backendWorkflow.documentUrl,
        fileName: backendWorkflow.fileName,
        fileSize: backendWorkflow.fileSize,
        fileType: backendWorkflow.mimeType,
        createdById: backendWorkflow.createdBy,
        createdByName: backendWorkflow.creator?.name || 'Unknown',
        createdByEmail: backendWorkflow.creator?.email,
        spaceId: backendWorkflow.spaceId || undefined,
        createdAt: backendWorkflow.createdAt,
        updatedAt: backendWorkflow.updatedAt,
      },
      validators: [],
      status: 'draft',
      createdAt: backendWorkflow.createdAt,
      updatedAt: backendWorkflow.updatedAt,
    };
  }

  const validators: Validator[] = reviewers.map((r, index) => {
    // Type assertion for comments since backend includes them but type might not
    const reviewerWithComments = r as typeof r & { comments?: Array<{
      id: string;
      userId: string;
      content: string;
      createdAt: string;
      author?: { name: string; email: string; avatarUrl?: string | null };
      replies?: Array<{
        id: string;
        userId: string;
        content: string;
        createdAt: string;
        author?: { name: string; email: string; avatarUrl?: string | null };
      }>;
    }> };
    
    return {
      id: r.id,
      userId: r.reviewerId,
      userName: r.reviewer?.name || 'Unknown User',
      userEmail: r.reviewer?.email,
      avatarUrl: r.reviewer?.avatarUrl || undefined,
      status: r.status.toLowerCase() as ValidationStatus,
      note: undefined, // Backend doesn't support notes on reviewers yet
      comments: (reviewerWithComments.comments || []).map((c) => ({
        id: c.id,
        authorId: c.userId || c.authorId || '',
        authorName: c.author?.name || 'Unknown',
        content: c.content,
        createdAt: c.createdAt,
        replies: (c.replies || []).map((r: { id: string; userId?: string; authorId?: string; content: string; createdAt: string; author?: { name: string } }) => ({
          id: r.id,
          authorId: r.userId || r.authorId || '',
          authorName: r.author?.name || 'Unknown',
          content: r.content,
          createdAt: r.createdAt,
        }))
      })),
      notifiedAt: undefined,
      validatedAt: r.reviewedAt,
      order: index, // Order maintained by array position
    };
  });

  const allApproved = validators.length > 0 && validators.every(v => v.status === 'approved');
  const anyRejected = validators.some(v => v.status === 'rejected');

  let status: DocumentWorkflow['status'] = 'draft';
  if (validators.length > 0) status = 'in_progress';
  if (allApproved) status = 'completed';
  if (anyRejected) status = 'rejected';

  // Override if backend has status (it does, but simple string)

  return {
    id: backendWorkflow.id,
    document: {
      id: backendWorkflow.id, // Document ID same as workflow ID in this simple model? Or virtual.
      title: backendWorkflow.title,
      description: backendWorkflow.description,
      fileUrl: backendWorkflow.documentUrl,
      fileName: backendWorkflow.fileName,
      fileSize: backendWorkflow.fileSize,
      fileType: backendWorkflow.mimeType,
      createdById: backendWorkflow.createdBy,
      createdByName: backendWorkflow.creator?.name || 'Unknown',
      createdByEmail: backendWorkflow.creator?.email,
      spaceId: backendWorkflow.spaceId || undefined,
      createdAt: backendWorkflow.createdAt,
      updatedAt: backendWorkflow.updatedAt,
    },
    validators,
    status,
    createdAt: backendWorkflow.createdAt,
    updatedAt: backendWorkflow.updatedAt,
  };
}
//
// ═══════════════════════════════════════════════════════════════
// Workflow Operations (Async API Calls)
// ═══════════════════════════════════════════════════════════════

export async function getWorkflows(spaceId: string): Promise<DocumentWorkflow[]> {
  try {
    console.log('[DEBUG] getWorkflows - Fetching workflows for spaceId:', spaceId);
    const response = await api.getCreatedWorkflows(spaceId);
    console.log('[DEBUG] getWorkflows - API response:', { 
      success: response.success, 
      count: response.data?.length || 0 
    });
    if (response && Array.isArray(response.data)) {
      const workflows = response.data.map(mapBackendToFrontend);
      console.log('[DEBUG] getWorkflows - Mapped workflows:', workflows.map(w => ({
        id: w.id,
        title: w.document.title,
        createdBy: w.document.createdById,
        createdByName: w.document.createdByName
      })));
      return workflows;
    }
    return [];
  } catch (error) {
    console.error("Failed to fetch workflows:", error);
    return [];
  }
}

export async function getAssignedWorkflows(): Promise<DocumentWorkflow[]> {
  try {
    const response = await api.getAssignedWorkflows();
    if (response && Array.isArray(response.data)) {
      return response.data.map(mapBackendToFrontend);
    }
    return [];
  } catch (error) {
    console.error("Failed to fetch assigned workflows:", error);
    return [];
  }
}

export async function createWorkflow(
  spaceId: string,
  document: Omit<Document, 'id' | 'createdAt' | 'updatedAt'>
): Promise<DocumentWorkflow> {
  const response = await api.createWorkflow({
    title: document.title,
    description: document.description,
    documentUrl: document.fileUrl || "https://example.com/placeholder",
    fileName: document.fileName || "unknown.pdf",
    fileSize: document.fileSize || 0,
    mimeType: document.fileType || "application/pdf",
    spaceId: spaceId,
    reviewerIds: [] // Initially empty
  });

  // API returns ApiResponse<DocumentReviewWorkflow>
  if (!response.success || !response.data) {
    console.error("API Unexpected Response:", response);
    throw new Error(response.message || "Failed to create workflow - invalid response from server");
  }

  return mapBackendToFrontend(response.data);
}

export async function addValidator(
  spaceId: string,
  workflowId: string,
  validator: {
    userId: string;
    userName: string;
    userEmail?: string;
    avatarUrl?: string;
    note?: string;
  },
  position?: number
): Promise<DocumentWorkflow | null> {
  // Check if validator is external (placeholder ID) and needs invitation
  let userIdToUse = validator.userId;
  if (userIdToUse.startsWith("external-") && validator.userEmail) {
    try {
      const response = await api.inviteReviewer(validator.userEmail, validator.userName);
      // API returns ApiResponse<{ id, name, email, avatarUrl }>
      if (response.success && response.data && response.data.id) {
        userIdToUse = response.data.id;
      } else {
        throw new Error("Failed to find user. Please ensure they are registered in the system.");
      }
    } catch (err) {
      console.error("Failed to verify user:", err);
      throw err; // Stop and re-throw so the UI can catch the specific error
    }
  }

  try {
    const response = await api.addReviewers(workflowId, [userIdToUse]);

    // API returns ApiResponse<DocumentReviewWorkflow>
    if (response.success && response.data) {
      return mapBackendToFrontend(response.data);
    }
    
    // If response is not successful, throw an error with the message
    throw new Error(response.message || "Failed to add reviewer");
  } catch (e) {
    console.error("Failed to add validator:", e);
    // Re-throw the error so the UI can display it
    if (e instanceof Error) {
      throw e;
    }
    throw new Error("Failed to add validator");
  }
}

export async function removeValidator(
  spaceId: string,
  workflowId: string,
  validatorId: string
): Promise<DocumentWorkflow | null> {
  // Backend doesn't support removing reviewers yet via API!
  // Fallback to local filtering for UI demo, but this won't persist to DB.
  // Ideally, implemented DELETE endpoint.
  console.warn("Remove validator not implemented in backend API yet");
  return null;
}

export async function updateValidatorStatus(
  spaceId: string,
  workflowId: string,
  reviewerId: string, // Changed from validatorId to reviewerId (user ID)
  status: ValidationStatus
): Promise<DocumentWorkflow | null> {
  // Backend API expects reviewerId (user ID), not validatorId (DocumentReviewer record ID)
  // The backend verifies that the current user matches the reviewerId

  // Status in API expects 'APPROVED' | 'REJECTED'
  if (status === 'pending') return null; // Can't revert to pending in this API model yet

  try {
    const response = await api.updateReviewStatus(workflowId, reviewerId, status.toUpperCase() as 'APPROVED' | 'REJECTED');

    // API returns ApiResponse<DocumentReviewWorkflow>
    if (response.success && response.data) {
      return mapBackendToFrontend(response.data);
    }
    
    throw new Error(response.message || "Failed to update reviewer status");
  } catch (e) {
    console.error("Failed to update status:", e);
    if (e instanceof Error) {
      throw e;
    }
    throw new Error("Failed to update reviewer status");
  }
}

export async function addComment(
  spaceId: string,
  workflowId: string,
  reviewerId: string, // Changed from validatorId to reviewerId (user ID)
  comment: {
    authorId: string;
    authorName: string;
    content: string;
  }
): Promise<DocumentWorkflow | null> {
  try {
    // Backend `addReviewComment` adds comment to the workflow/reviewer.
    // It uses current user as author and expects reviewerId (user ID)
    await api.addReviewComment(workflowId, reviewerId, comment.content);
    // Refetch fresh workflow
    const response = await api.getWorkflowById(workflowId);

    // API returns ApiResponse<DocumentReviewWorkflow>
    if (response.success && response.data) {
      return mapBackendToFrontend(response.data);
    }
    
    throw new Error(response.message || "Failed to add comment");
  } catch (e) {
    console.error("Failed to add comment:", e);
    if (e instanceof Error) {
      throw e;
    }
    throw new Error("Failed to add comment");
  }
}

export async function updateValidatorNote(
  spaceId: string,
  workflowId: string,
  validatorId: string,
  note: string
): Promise<DocumentWorkflow | null> {
  console.warn("Notes not implemented API backend");
  return null;
}

export async function resendNotification(
  spaceId: string,
  workflowId: string,
  validatorId: string
): Promise<DocumentWorkflow | null> {
  console.log("Mock notification resend");
  const response = await api.getWorkflowById(workflowId);

  // API returns ApiResponse<DocumentReviewWorkflow>
  if (response.success && response.data) {
    return mapBackendToFrontend(response.data);
  }
  
  return null;
}

export async function deleteWorkflow(spaceId: string, workflowId: string): Promise<boolean> {
  try {
    const response = await api.deleteWorkflow(workflowId);
    
    if (response.success) {
      return true;
    }
    
    throw new Error(response.message || "Failed to delete workflow");
  } catch (e) {
    console.error("Failed to delete workflow:", e);
    if (e instanceof Error) {
      throw e;
    }
    throw new Error("Failed to delete workflow");
  }
}

// ═══════════════════════════════════════════════════════════════
// Utility Functions
// ═══════════════════════════════════════════════════════════════

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map(part => part.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('');
}

export function getStatusColor(status: ValidationStatus): {
  border: string;
  bg: string;
  text: string;
  ring: string;
} {
  switch (status) {
    case 'approved':
      return {
        border: 'border-emerald-500',
        bg: 'bg-emerald-50 dark:bg-emerald-950/30',
        text: 'text-emerald-600 dark:text-emerald-400',
        ring: 'ring-emerald-500/30',
      };
    case 'rejected':
      return {
        border: 'border-red-500',
        bg: 'bg-red-50 dark:bg-red-950/30',
        text: 'text-red-600 dark:text-red-400',
        ring: 'ring-red-500/30',
      };
    default:
      return {
        border: 'border-zinc-300 dark:border-zinc-600',
        bg: 'bg-zinc-50 dark:bg-zinc-800',
        text: 'text-zinc-500 dark:text-zinc-400',
        ring: 'ring-zinc-300/30 dark:ring-zinc-600/30',
      };
  }
}