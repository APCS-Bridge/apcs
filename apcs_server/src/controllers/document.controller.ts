/**
 * Document Controller - HTTP request handlers for document management
 */
import { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import * as documentService from '../services/document.service';
import { DocumentType, DocumentRole, DocumentVisibility } from '@prisma/client';

// ═══════════════════════════════════════════════════════════════
// DOCUMENT CRUD
// ═══════════════════════════════════════════════════════════════

/**
 * Create document or folder
 * POST /api/spaces/:spaceId/documents
 */
export async function createDocument(req: Request, res: Response) {
  try {
    const spaceId = Array.isArray(req.params.spaceId) ? req.params.spaceId[0] : req.params.spaceId;
    const userId = req.user!.userId;
    
    if (!spaceId) {
      console.warn('⚠️ [BACKEND] Space ID missing');
      return res.status(400).json({
        success: false,
        message: 'Space ID is required'
      });
    }
    
    // Parse body fields from multipart form data
    const { name, type, parentId, visibility, description } = req.body;
    
    // Check if this is a file upload
    if (req.file) {
      // File upload
      console.log('📄 [BACKEND] Document upload started', {
        fileName: req.file.originalname,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
        spaceId: spaceId,
        userId: userId,
        timestamp: new Date().toISOString()
      });

      const document = await documentService.createDocument({
        name: name || req.file.originalname,
        type: DocumentType.FILE,
        spaceId: spaceId,
        parentId: parentId || undefined,
        visibility: visibility || DocumentVisibility.PUBLIC,
        description: description || undefined,
        fileUrl: `/uploads/documents/${spaceId}/${req.file.filename}`,
        fileName: req.file.originalname,
        fileSize: req.file.size,
        mimeType: req.file.mimetype
      }, userId);
      
      console.log('✅ [BACKEND] Document created successfully', {
        documentId: document.id,
        fileName: document.fileName,
        fileSize: document.fileSize
      });
      
      return res.status(201).json({
        success: true,
        message: 'File uploaded successfully',
        data: document
      });
    }
    
    // Folder creation (no file)
    if (!name || !type) {
      console.warn('⚠️ [BACKEND] Missing name or type for folder creation');
      return res.status(400).json({
        success: false,
        message: 'Name and type are required for folder creation'
      });
    }
    
    if (!Object.values(DocumentType).includes(type)) {
      console.warn('⚠️ [BACKEND] Invalid document type:', type);
      return res.status(400).json({
        success: false,
        message: 'Invalid document type'
      });
    }

    console.log('📁 [BACKEND] Folder creation started', {
      name: name,
      type: type,
      spaceId: spaceId
    });

    const document = await documentService.createDocument({
      name,
      type,
      spaceId: spaceId,
      parentId: parentId || undefined,
      visibility: visibility || DocumentVisibility.PUBLIC,
      description: description || undefined
    }, userId);

    console.log('✅ [BACKEND] Folder created successfully', {
      documentId: document.id,
      name: document.name
    });
    
    res.status(201).json({
      success: true,
      message: `${type === DocumentType.FOLDER ? 'Folder' : 'Document'} created successfully`,
      data: document
    });
  } catch (error) {
    console.error('❌ [BACKEND] Create document error:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to create document'
    });
  }
}

/**
 * Get document by ID
 * GET /api/documents/:id
 */
export async function getDocument(req: Request, res: Response) {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const userId = req.user!.userId;
    
    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Document ID is required'
      });
    }
    
    const document = await documentService.getDocumentById(id, userId);
    
    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }
    
    res.json({
      success: true,
      data: document
    });
  } catch (error) {
    console.error('Get document error:', error);
    
    if (error instanceof Error && error.message === 'Access denied') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve document'
    });
  }
}

/**
 * List documents in folder/root
 * GET /api/spaces/:spaceId/documents?parentId=xxx
 */
export async function listDocuments(req: Request, res: Response) {
  try {
    const spaceId = Array.isArray(req.params.spaceId) ? req.params.spaceId[0] : req.params.spaceId;
    const { parentId } = req.query;
    const userId = req.user!.userId;
    
    if (!spaceId) {
      return res.status(400).json({
        success: false,
        message: 'Space ID is required'
      });
    }
    
    const documents = await documentService.listDocuments(
      spaceId!,
      parentId as string || null,
      userId
    );
    
    res.json({
      success: true,
      data: documents
    });
  } catch (error) {
    console.error('List documents error:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to list documents'
    });
  }
}

/**
 * Get document tree
 * GET /api/spaces/:spaceId/documents/tree
 */
export async function getDocumentTree(req: Request, res: Response) {
  try {
    const spaceId = Array.isArray(req.params.spaceId) ? req.params.spaceId[0] : req.params.spaceId;
    const userId = req.user!.userId;
    
    if (!spaceId) {
      return res.status(400).json({
        success: false,
        message: 'Space ID is required'
      });
    }
    
    const tree = await documentService.getDocumentTree(spaceId, userId);
    
    res.json({
      success: true,
      data: tree
    });
  } catch (error) {
    console.error('Get document tree error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve document tree'
    });
  }
}

/**
 * Update document
 * PUT /api/documents/:id
 */
export async function updateDocument(req: Request, res: Response) {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const { name, description, visibility } = req.body;
    const userId = req.user!.userId;
    
    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Document ID is required'
      });
    }
    
    const document = await documentService.updateDocument(id!, userId, {
      name,
      description,
      visibility
    });
    
    res.json({
      success: true,
      message: 'Document updated successfully',
      data: document
    });
  } catch (error) {
    console.error('Update document error:', error);
    
    if (error instanceof Error && error.message.includes('Access denied')) {
      return res.status(403).json({
        success: false,
        message: error.message
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to update document'
    });
  }
}

/**
 * Move document
 * POST /api/documents/:id/move
 */
export async function moveDocument(req: Request, res: Response) {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const { parentId, spaceId } = req.body;
    const userId = req.user!.userId;
    
    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Document ID is required'
      });
    }
    
    const document = await documentService.moveDocument(
      id!,
      userId,
      parentId || null,
      spaceId
    );
    
    res.json({
      success: true,
      message: 'Document moved successfully',
      data: document
    });
  } catch (error) {
    console.error('Move document error:', error);
    
    if (error instanceof Error && error.message.includes('Access denied')) {
      return res.status(403).json({
        success: false,
        message: error.message
      });
    }
    
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to move document'
    });
  }
}

/**
 * Delete document
 * DELETE /api/documents/:id
 */
export async function deleteDocument(req: Request, res: Response) {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const userId = req.user!.userId;
    
    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Document ID is required'
      });
    }
    
    await documentService.deleteDocument(id!, userId);
    
    res.json({
      success: true,
      message: 'Document deleted successfully'
    });
  } catch (error) {
    console.error('Delete document error:', error);
    
    if (error instanceof Error && error.message.includes('Only the owner')) {
      return res.status(403).json({
        success: false,
        message: error.message
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to delete document'
    });
  }
}

// ═══════════════════════════════════════════════════════════════
// PERMISSIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Get document permissions
 * GET /api/documents/:id/permissions
 */
export async function getPermissions(req: Request, res: Response) {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const userId = req.user!.userId;
    
    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Document ID is required'
      });
    }
    
    const permissions = await documentService.getDocumentPermissions(id!, userId);
    
    res.json({
      success: true,
      data: permissions
    });
  } catch (error) {
    console.error('Get permissions error:', error);
    
    if (error instanceof Error && error.message === 'Access denied') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve permissions'
    });
  }
}

/**
 * Add/update permission
 * POST /api/documents/:id/permissions
 */
export async function addPermission(req: Request, res: Response) {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const { userId: targetUserId, role } = req.body;
    const userId = req.user!.userId;
    
    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Document ID is required'
      });
    }
    
    if (!targetUserId || !role) {
      return res.status(400).json({
        success: false,
        message: 'User ID and role are required'
      });
    }
    
    if (!Object.values(DocumentRole).includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role'
      });
    }
    
    const permission = await documentService.addDocumentPermission(
      id!,
      userId,
      targetUserId,
      role
    );
    
    res.json({
      success: true,
      message: 'Permission added successfully',
      data: permission
    });
  } catch (error) {
    console.error('Add permission error:', error);
    
    if (error instanceof Error && error.message.includes('Only the owner')) {
      return res.status(403).json({
        success: false,
        message: error.message
      });
    }
    
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to add permission'
    });
  }
}

/**
 * Remove permission
 * DELETE /api/documents/:id/permissions/:userId
 */
export async function removePermission(req: Request, res: Response) {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const targetUserId = Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId;
    const userId = req.user!.userId;
    
    if (!id || !targetUserId) {
      return res.status(400).json({
        success: false,
        message: 'Document ID and User ID are required'
      });
    }
    
    await documentService.removeDocumentPermission(id!, userId, targetUserId!);
    
    res.json({
      success: true,
      message: 'Permission removed successfully'
    });
  } catch (error) {
    console.error('Remove permission error:', error);
    
    if (error instanceof Error && error.message.includes('Only the owner')) {
      return res.status(403).json({
        success: false,
        message: error.message
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to remove permission'
    });
  }
}

/**
 * Download file
 * GET /api/documents/:id/download
 */
export async function downloadDocument(req: Request, res: Response) {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const userId = req.user!.userId;
    
    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Document ID is required'
      });
    }
    
    const document = await documentService.getDocumentById(id, userId);
    
    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }
    
    if (document.type !== DocumentType.FILE || !document.fileUrl) {
      return res.status(400).json({
        success: false,
        message: 'Not a downloadable file'
      });
    }
    
    // Construct the file path from the fileUrl
    // fileUrl is like: /uploads/documents/spaceId/filename.pdf
    const filePath = path.join(process.cwd(), document.fileUrl);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'File not found on server'
      });
    }
    
    // Set headers for file download
    res.setHeader('Content-Type', document.mimeType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${document.fileName}"`);
    
    // Stream the file
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
    
    fileStream.on('error', (error) => {
      console.error('File stream error:', error);
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          message: 'Failed to download file'
        });
      }
    });
  } catch (error) {
    console.error('Download document error:', error);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: 'Failed to download document'
      });
    }
  }
}
