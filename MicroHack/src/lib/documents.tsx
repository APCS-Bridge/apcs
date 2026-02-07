/**
 * Document Management Library - Frontend utilities and hooks
 */
import React from 'react';
import {
  File,
  Image,
  Video,
  Music,
  FileText,
  FileSpreadsheet,
  Presentation,
  Archive,
  Code,
  Globe,
  Palette,
  FileCode,
  Crown,
  Edit,
  Eye
} from 'lucide-react';
import { api, Document, DocumentType, DocumentRole, DocumentVisibility } from './api';

// ═══════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Get file icon component based on mime type
 */
export function getFileIcon(mimeType: string | null | undefined, size: number = 24): React.ReactElement {
  const iconProps = { size, className: "text-zinc-600 dark:text-zinc-400" };
  
  if (!mimeType) return <File {...iconProps} />;
  
  if (mimeType.startsWith('image/')) return <Image {...iconProps} />;
  if (mimeType.startsWith('video/')) return <Video {...iconProps} />;
  if (mimeType.startsWith('audio/')) return <Music {...iconProps} />;
  
  if (mimeType === 'application/pdf') return <FileText {...iconProps} />;
  if (mimeType.includes('word')) return <FileText {...iconProps} />;
  if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return <FileSpreadsheet {...iconProps} />;
  if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) return <Presentation {...iconProps} />;
  if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('7z')) return <Archive {...iconProps} />;
  if (mimeType === 'text/plain') return <FileText {...iconProps} />;
  if (mimeType.includes('json')) return <FileCode {...iconProps} />;
  if (mimeType.includes('javascript') || mimeType.includes('typescript')) return <Code {...iconProps} />;
  if (mimeType.includes('html')) return <Globe {...iconProps} />;
  if (mimeType.includes('css')) return <Palette {...iconProps} />;
  
  return <File {...iconProps} />;
}

/**
 * Format file size
 */
export function formatFileSize(bytes: number | null | undefined): string {
  if (!bytes) return '0 B';
  
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
}

/**
 * Get file extension
 */
export function getFileExtension(filename: string | null | undefined): string {
  if (!filename) return '';
  const parts = filename.split('.');
  return parts.length > 1 ? parts[parts.length - 1].toUpperCase() : '';
}

/**
 * Build breadcrumb from path
 */
export function buildBreadcrumbs(document: Document | null, allDocuments: Document[]): Array<{id: string; name: string}> {
  if (!document) return [];
  
  const breadcrumbs: Array<{id: string; name: string}> = [];
  let current: Document | undefined = document;
  
  while (current && current.parentId) {
    const parent = allDocuments.find(d => d.id === current!.parentId);
    if (parent) {
      breadcrumbs.unshift({ id: parent.id, name: parent.name });
      current = parent;
    } else {
      break;
    }
  }
  
  return breadcrumbs;
}

/**
 * Check if user can edit document
 */
export function canEditDocument(document: Document, userId: string): boolean {
  if (document.createdBy === userId) return true;
  
  const permission = document.permissions?.find(p => p.userId === userId);
  return permission ? [DocumentRole.OWNER, DocumentRole.EDITOR].includes(permission.role) : false;
}

/**
 * Check if user can delete document
 */
export function canDeleteDocument(document: Document, userId: string): boolean {
  return document.createdBy === userId;
}

/**
 * Check if file is viewable in browser
 */
export function isViewableFile(mimeType: string | null | undefined): boolean {
  if (!mimeType) return false;
  
  const viewableMimes = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'text/plain'
  ];
  
  return viewableMimes.includes(mimeType) || mimeType.startsWith('image/');
}

/**
 * Sort documents - folders first, then alphabetically
 */
export function sortDocuments(documents: Document[]): Document[] {
  return [...documents].sort((a, b) => {
    // Folders first
    if (a.type !== b.type) {
      return a.type === DocumentType.FOLDER ? -1 : 1;
    }
    // Then alphabetically
    return a.name.localeCompare(b.name);
  });
}

/**
 * Filter documents by search query
 */
export function filterDocuments(documents: Document[], query: string): Document[] {
  if (!query.trim()) return documents;
  
  const lowerQuery = query.toLowerCase();
  return documents.filter(doc => 
    doc.name.toLowerCase().includes(lowerQuery) ||
    doc.description?.toLowerCase().includes(lowerQuery)
  );
}

/**
 * Get role display name
 */
export function getRoleDisplayName(role: DocumentRole): string {
  const names = {
    [DocumentRole.OWNER]: 'Owner',
    [DocumentRole.EDITOR]: 'Editor',
    [DocumentRole.VIEWER]: 'Viewer'
  };
  return names[role];
}

/**
 * Get role icon component
 */
export function getRoleIcon(role: DocumentRole, size: number = 16): React.ReactElement {
  const iconProps = { size, className: "text-zinc-600 dark:text-zinc-400" };
  
  const icons = {
    [DocumentRole.OWNER]: <Crown {...iconProps} />,
    [DocumentRole.EDITOR]: <Edit {...iconProps} />,
    [DocumentRole.VIEWER]: <Eye {...iconProps} />
  };
  return icons[role];
}

/**
 * Download file helper
 */
export async function downloadFile(documentId: string, fileName: string) {
  try {
    // Download the file as a blob with authentication
    const blob = await api.downloadDocument(documentId);
    
    // Create a download link
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    
    // Cleanup
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Download error:', error);
    throw error;
  }
}

// ═══════════════════════════════════════════════════════════════
// REACT HOOKS (if needed)
// ═══════════════════════════════════════════════════════════════

/**
 * Custom hook for document operations (can be expanded)
 */
export function useDocuments(spaceId: string) {
  // This can be expanded with React Query or SWR for caching
  const fetchDocuments = async (parentId?: string) => {
    const response = await api.listDocuments(spaceId, parentId);
    return response.data || [];
  };
  
  const fetchTree = async () => {
    const response = await api.getDocumentTree(spaceId);
    return response.data || [];
  };
  
  return {
    fetchDocuments,
    fetchTree
  };
}
