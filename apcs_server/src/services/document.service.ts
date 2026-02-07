/**
 * Document Service - Business logic for document/folder management
 */
import { DocumentType, DocumentRole, DocumentVisibility, Document, DocumentPermission } from '@prisma/client';
import prisma from '../lib/prisma';

// ═══════════════════════════════════════════════════════════════
// TYPE DEFINITIONS
// ═══════════════════════════════════════════════════════════════

export interface CreateDocumentData {
  name: string;
  type: DocumentType;
  spaceId: string;
  parentId?: string;
  visibility?: DocumentVisibility;
  description?: string;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
}

export interface UpdateDocumentData {
  name?: string;
  description?: string;
  visibility?: DocumentVisibility;
}

export interface DocumentWithPermissions extends Document {
  permissions: DocumentPermission[];
  creator: {
    id: string;
    name: string;
    email: string;
    avatarUrl: string | null;
  };
  parent?: {
    id: string;
    name: string;
  } | null;
  _count?: {
    children: number;
    comments: number;
  };
}

// ═══════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Build folder path for hierarchical organization
 */
async function buildPath(parentId: string | null): Promise<string> {
  if (!parentId) return '/';
  
  const parent = await prisma.document.findUnique({
    where: { id: parentId },
    select: { path: true, name: true }
  });
  
  if (!parent) throw new Error('Parent folder not found');
  
  return `${parent.path}${parent.name}/`;
}

/**
 * Check if user has permission to access document
 */
export async function checkDocumentPermission(
  documentId: string,
  userId: string,
  requiredRole?: DocumentRole
): Promise<{ hasAccess: boolean; role: DocumentRole | null }> {
  const document = await prisma.document.findUnique({
    where: { id: documentId },
    include: {
      permissions: { where: { userId } },
      space: { include: { members: { where: { userId } } } }
    }
  });
  
  if (!document) {
    return { hasAccess: false, role: null };
  }
  
  // Owner has full access
  if (document.createdBy === userId) {
    return { hasAccess: true, role: DocumentRole.OWNER };
  }
  
  // Check explicit permission
  const permission = document.permissions[0];
  
  // For public documents, space members get viewer access by default
  if (document.visibility === DocumentVisibility.PUBLIC) {
    const isMember = document.space.members.length > 0;
    if (isMember) {
      const role = permission?.role || DocumentRole.VIEWER;
      
      if (requiredRole) {
        const roleHierarchy: Record<DocumentRole, number> = { OWNER: 3, EDITOR: 2, VIEWER: 1 };
        const hasRequiredAccess = roleHierarchy[role] >= roleHierarchy[requiredRole];
        return { hasAccess: hasRequiredAccess, role };
      }
      
      return { hasAccess: true, role };
    }
  }
  
  // For private documents, need explicit permission
  if (!permission) {
    return { hasAccess: false, role: null };
  }
  
  // Check if user has required role
  if (requiredRole) {
    const roleHierarchy: Record<DocumentRole, number> = { OWNER: 3, EDITOR: 2, VIEWER: 1 };
    const hasRequiredAccess = roleHierarchy[permission.role] >= roleHierarchy[requiredRole];
    return { hasAccess: hasRequiredAccess, role: permission.role };
  }
  
  return { hasAccess: true, role: permission.role };
}

// ═══════════════════════════════════════════════════════════════
// DOCUMENT CRUD OPERATIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Create a new document or folder
 */
export async function createDocument(
  data: CreateDocumentData,
  createdBy: string
): Promise<DocumentWithPermissions> {
  // Validate parent folder exists and is a folder
  if (data.parentId) {
    const parent = await prisma.document.findUnique({
      where: { id: data.parentId }
    });
    
    if (!parent) {
      throw new Error('Parent folder not found');
    }
    
    if (parent.type !== DocumentType.FOLDER) {
      throw new Error('Parent must be a folder');
    }
    
    if (parent.spaceId !== data.spaceId) {
      throw new Error('Parent folder must be in the same workspace');
    }
  }
  
  // Build path
  const path = await buildPath(data.parentId || null);
  
  // Create document
  const document = await prisma.document.create({
    data: {
      name: data.name,
      type: data.type,
      spaceId: data.spaceId,
      parentId: data.parentId || null,
      path,
      visibility: data.visibility || DocumentVisibility.PRIVATE,
      description: data.description || null,
      createdBy,
      fileUrl: data.fileUrl || null,
      fileName: data.fileName || null,
      fileSize: data.fileSize || null,
      mimeType: data.mimeType || null
    },
    include: {
      permissions: true,
      creator: {
        select: {
          id: true,
          name: true,
          email: true,
          avatarUrl: true
        }
      },
      parent: {
        select: {
          id: true,
          name: true
        }
      },
      _count: {
        select: {
          children: true,
          comments: true
        }
      }
    }
  });
  
  // Log activity
  await prisma.documentActivity.create({
    data: {
      documentId: document.id,
      userId: createdBy,
      action: 'created',
      metadata: { type: data.type, visibility: data.visibility || DocumentVisibility.PRIVATE }
    }
  });
  
  return document as DocumentWithPermissions;
}

/**
 * Get document by ID with permissions
 */
export async function getDocumentById(
  documentId: string,
  userId: string
): Promise<DocumentWithPermissions | null> {
  // Check access
  const { hasAccess } = await checkDocumentPermission(documentId, userId);
  if (!hasAccess) {
    throw new Error('Access denied');
  }
  
  const document = await prisma.document.findUnique({
    where: { id: documentId, isDeleted: false },
    include: {
      permissions: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              avatarUrl: true
            }
          }
        }
      },
      creator: {
        select: {
          id: true,
          name: true,
          email: true,
          avatarUrl: true
        }
      },
      parent: {
        select: {
          id: true,
          name: true
        }
      },
      _count: {
        select: {
          children: true,
          comments: true
        }
      }
    }
  });
  
  // Log view activity
  if (document) {
    await prisma.documentActivity.create({
      data: {
        documentId: document.id,
        userId,
        action: 'viewed'
      }
    });
  }
  
  return document;
}

/**
 * List documents in a folder or workspace root
 */
export async function listDocuments(
  spaceId: string,
  parentId: string | null,
  userId: string
): Promise<DocumentWithPermissions[]> {
  // If listing a specific folder, check permission
  if (parentId) {
    const { hasAccess } = await checkDocumentPermission(parentId, userId);
    if (!hasAccess) {
      throw new Error('Access denied to parent folder');
    }
  }
  
  // Get all documents in this folder/root
  const documents = await prisma.document.findMany({
    where: {
      spaceId,
      parentId: parentId || null,
      isDeleted: false
    },
    include: {
      permissions: {
        where: { userId }
      },
      creator: {
        select: {
          id: true,
          name: true,
          email: true,
          avatarUrl: true
        }
      },
      parent: {
        select: {
          id: true,
          name: true
        }
      },
      _count: {
        select: {
          children: true,
          comments: true
        }
      }
    },
    orderBy: [
      { type: 'asc' },  // Folders first
      { name: 'asc' }
    ]
  });
  
  // Filter based on permissions
  const accessibleDocuments = await Promise.all(
    documents.map(async (doc: any) => {
      const { hasAccess } = await checkDocumentPermission(doc.id, userId);
      return hasAccess ? doc : null;
    })
  );
  
  return accessibleDocuments.filter((doc: any) => doc !== null) as DocumentWithPermissions[];
}

/**
 * Get full folder tree for a workspace
 */
export async function getDocumentTree(
  spaceId: string,
  userId: string
): Promise<DocumentWithPermissions[]> {
  const allDocuments = await prisma.document.findMany({
    where: {
      spaceId,
      isDeleted: false
    },
    include: {
      permissions: {
        where: { userId }
      },
      creator: {
        select: {
          id: true,
          name: true,
          email: true,
          avatarUrl: true
        }
      },
      parent: {
        select: {
          id: true,
          name: true
        }
      },
      _count: {
        select: {
          children: true,
          comments: true
        }
      }
    },
    orderBy: [
      { path: 'asc' },
      { type: 'asc' },
      { name: 'asc' }
    ]
  });
  
  // Filter based on permissions
  const accessibleDocuments = await Promise.all(
    allDocuments.map(async (doc: any) => {
      const { hasAccess } = await checkDocumentPermission(doc.id, userId);
      return hasAccess ? doc : null;
    })
  );
  
  return accessibleDocuments.filter((doc: any) => doc !== null) as DocumentWithPermissions[];
}

/**
 * Update document metadata
 */
export async function updateDocument(
  documentId: string,
  userId: string,
  data: UpdateDocumentData
): Promise<DocumentWithPermissions> {
  // Check edit permission
  const { hasAccess, role } = await checkDocumentPermission(documentId, userId, DocumentRole.EDITOR);
  if (!hasAccess) {
    throw new Error('Access denied - requires editor or owner permission');
  }
  
  const document = await prisma.document.update({
    where: { id: documentId },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.visibility !== undefined && { visibility: data.visibility })
    },
    include: {
      permissions: true,
      creator: {
        select: {
          id: true,
          name: true,
          email: true,
          avatarUrl: true
        }
      },
      parent: {
        select: {
          id: true,
          name: true
        }
      },
      _count: {
        select: {
          children: true,
          comments: true
        }
      }
    }
  });
  
  // Log activity
  await prisma.documentActivity.create({
    data: {
      documentId,
      userId,
      action: 'updated',
      metadata: data as any
    }
  });
  
  return document as DocumentWithPermissions;
}

/**
 * Move document to different folder
 */
export async function moveDocument(
  documentId: string,
  userId: string,
  newParentId: string | null,
  newSpaceId?: string
): Promise<DocumentWithPermissions> {
  // Check edit permission on source
  const { hasAccess } = await checkDocumentPermission(documentId, userId, DocumentRole.EDITOR);
  if (!hasAccess) {
    throw new Error('Access denied - requires editor permission');
  }
  
  // Validate new parent if specified
  if (newParentId) {
    const newParent = await prisma.document.findUnique({
      where: { id: newParentId }
    });
    
    if (!newParent || newParent.type !== DocumentType.FOLDER) {
      throw new Error('Invalid destination folder');
    }
    
    // Check permission on destination
    const { hasAccess: destAccess } = await checkDocumentPermission(newParentId, userId, DocumentRole.EDITOR);
    if (!destAccess) {
      throw new Error('Access denied to destination folder');
    }
  }
  
  // Build new path
  const newPath = await buildPath(newParentId);
  
  const document = await prisma.document.update({
    where: { id: documentId },
    data: {
      parentId: newParentId,
      path: newPath,
      ...(newSpaceId && { spaceId: newSpaceId })
    },
    include: {
      permissions: true,
      creator: {
        select: {
          id: true,
          name: true,
          email: true,
          avatarUrl: true
        }
      },
      parent: {
        select: {
          id: true,
          name: true
        }
      },
      _count: {
        select: {
          children: true,
          comments: true
        }
      }
    }
  });
  
  // Update paths of all children if this is a folder
  if (document.type === DocumentType.FOLDER) {
    await updateChildrenPaths(documentId);
  }
  
  // Log activity
  await prisma.documentActivity.create({
    data: {
      documentId,
      userId,
      action: 'moved',
      metadata: { newParentId, newPath }
    }
  });
  
  return document as DocumentWithPermissions;
}

/**
 * Update paths of all children recursively
 */
async function updateChildrenPaths(folderId: string): Promise<void> {
  const folder = await prisma.document.findUnique({
    where: { id: folderId },
    include: { children: true }
  });
  
  if (!folder) return;
  
  for (const child of folder.children) {
    const newPath = `${folder.path}${folder.name}/`;
    await prisma.document.update({
      where: { id: child.id },
      data: { path: newPath }
    });
    
    if (child.type === DocumentType.FOLDER) {
      await updateChildrenPaths(child.id);
    }
  }
}

/**
 * Delete document (soft delete)
 */
export async function deleteDocument(
  documentId: string,
  userId: string
): Promise<void> {
  const document = await prisma.document.findUnique({
    where: { id: documentId }
  });
  
  if (!document) {
    throw new Error('Document not found');
  }
  
  // Only owner can delete
  if (document.createdBy !== userId) {
    throw new Error('Only the owner can delete this document');
  }
  
  // Soft delete
  await prisma.document.update({
    where: { id: documentId },
    data: { isDeleted: true }
  });
  
  // Log activity
  await prisma.documentActivity.create({
    data: {
      documentId,
      userId,
      action: 'deleted'
    }
  });
}

// ═══════════════════════════════════════════════════════════════
// PERMISSION MANAGEMENT
// ═══════════════════════════════════════════════════════════════

/**
 * Add user permission to document
 */
export async function addDocumentPermission(
  documentId: string,
  userId: string,
  targetUserId: string,
  role: DocumentRole
): Promise<DocumentPermission> {
  // Check if user is owner or has permission to share
  const document = await prisma.document.findUnique({
    where: { id: documentId }
  });
  
  if (!document) {
    throw new Error('Document not found');
  }
  
  if (document.createdBy !== userId) {
    const { hasAccess, role: userRole } = await checkDocumentPermission(documentId, userId);
    if (!hasAccess || userRole !== DocumentRole.OWNER) {
      throw new Error('Only the owner can manage permissions');
    }
  }
  
  // Create or update permission
  const permission = await prisma.documentPermission.upsert({
    where: {
      documentId_userId: {
        documentId,
        userId: targetUserId
      }
    },
    create: {
      documentId,
      userId: targetUserId,
      role,
      grantedBy: userId
    },
    update: {
      role,
      grantedBy: userId
    }
  });
  
  // Log activity
  await prisma.documentActivity.create({
    data: {
      documentId,
      userId,
      action: 'shared',
      metadata: { targetUserId, role }
    }
  });
  
  return permission;
}

/**
 * Remove user permission
 */
export async function removeDocumentPermission(
  documentId: string,
  userId: string,
  targetUserId: string
): Promise<void> {
  // Check if user is owner
  const document = await prisma.document.findUnique({
    where: { id: documentId }
  });
  
  if (!document) {
    throw new Error('Document not found');
  }
  
  if (document.createdBy !== userId) {
    throw new Error('Only the owner can remove permissions');
  }
  
  await prisma.documentPermission.delete({
    where: {
      documentId_userId: {
        documentId,
        userId: targetUserId
      }
    }
  });
  
  // Log activity
  await prisma.documentActivity.create({
    data: {
      documentId,
      userId,
      action: 'permission_removed',
      metadata: { targetUserId }
    }
  });
}

/**
 * Get all permissions for a document
 */
export async function getDocumentPermissions(
  documentId: string,
  userId: string
) {
  // Check if user has access
  const { hasAccess } = await checkDocumentPermission(documentId, userId);
  if (!hasAccess) {
    throw new Error('Access denied');
  }
  
  return await prisma.documentPermission.findMany({
    where: { documentId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          avatarUrl: true
        }
      }
    }
  });
}

// Export for use in other modules
export { DocumentType, DocumentRole, DocumentVisibility };
