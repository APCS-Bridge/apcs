/**
 * Document Routes - API endpoints for document management
 */
import { Router } from 'express';
import * as documentController from '../controllers/document.controller';
import { authenticate } from '../middleware/auth.middleware';
import { uploadDocument, handleUploadError, checkSpaceMembership } from '../middleware/document.middleware';
import type { Router as ExpressRouter } from 'express';

const router: ExpressRouter = Router();

// ═══════════════════════════════════════════════════════════════
// All routes require authentication
// ═══════════════════════════════════════════════════════════════
router.use(authenticate);

// ═══════════════════════════════════════════════════════════════
// DOCUMENT/FOLDER CRUD
// ═══════════════════════════════════════════════════════════════

/**
 * Create document or folder (with optional file upload)
 * POST /api/spaces/:spaceId/documents
 */
router.post(
  '/spaces/:spaceId/documents',
  checkSpaceMembership,
  uploadDocument.single('file'),
  handleUploadError,
  documentController.createDocument
);

/**
 * List documents in folder/root
 * GET /api/spaces/:spaceId/documents?parentId=xxx
 */
router.get(
  '/spaces/:spaceId/documents',
  checkSpaceMembership,
  documentController.listDocuments
);

/**
 * Get full document tree
 * GET /api/spaces/:spaceId/documents/tree
 */
router.get(
  '/spaces/:spaceId/documents/tree',
  checkSpaceMembership,
  documentController.getDocumentTree
);

/**
 * Get document by ID
 * GET /api/documents/:id
 */
router.get(
  '/documents/:id',
  documentController.getDocument
);

/**
 * Update document metadata
 * PUT /api/documents/:id
 */
router.put(
  '/documents/:id',
  documentController.updateDocument
);

/**
 * Move document to different folder
 * POST /api/documents/:id/move
 */
router.post(
  '/documents/:id/move',
  documentController.moveDocument
);

/**
 * Delete document (soft delete)
 * DELETE /api/documents/:id
 */
router.delete(
  '/documents/:id',
  documentController.deleteDocument
);

/**
 * Download document
 * GET /api/documents/:id/download
 */
router.get(
  '/documents/:id/download',
  documentController.downloadDocument
);

// ═══════════════════════════════════════════════════════════════
// PERMISSIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Get document permissions
 * GET /api/documents/:id/permissions
 */
router.get(
  '/documents/:id/permissions',
  documentController.getPermissions
);

/**
 * Add/update user permission
 * POST /api/documents/:id/permissions
 */
router.post(
  '/documents/:id/permissions',
  documentController.addPermission
);

/**
 * Remove user permission
 * DELETE /api/documents/:id/permissions/:userId
 */
router.delete(
  '/documents/:id/permissions/:userId',
  documentController.removePermission
);

export default router;
