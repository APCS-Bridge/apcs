/**
 * Document Explorer - Main component for document/folder management
 */
"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Folder,
  File,
  Plus,
  Upload,
  Search,
  MoreVertical,
  Download,
  Trash2,
  Edit,
  Share2,
  FolderOpen,
  Grid3x3,
  List,
  ChevronRight,
  X,
  Maximize2,
  ExternalLink,
  FileText,
  Image as ImageIcon,
  AlertCircle
} from 'lucide-react';
import { api, Document, DocumentType, DocumentVisibility, DocumentRole, isGoogleDocUrl, getGoogleDocEmbedUrl } from '@/lib/api';
import {
  getFileIcon,
  formatFileSize,
  sortDocuments,
  filterDocuments,
  canEditDocument,
  canDeleteDocument,
  downloadFile,
  isViewableFile
} from '@/lib/documents';

interface DocumentExplorerProps {
  spaceId: string;
  currentUserId: string;
}

export default function DocumentExplorer({ spaceId, currentUserId }: DocumentExplorerProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [currentFolder, setCurrentFolder] = useState<Document | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<Array<{id: string; name: string}>>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  
  // Modals
  const [showCreateFolderModal, setShowCreateFolderModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  
  // Load documents
  useEffect(() => {
    loadDocuments();
  }, [spaceId, currentFolder]);
  
  const loadDocuments = async () => {
    setIsLoading(true);
    setError('');
    try {
      const response = await api.listDocuments(spaceId, currentFolder?.id);
      if (response.success && response.data) {
        setDocuments(sortDocuments(response.data));
      }
    } catch (err) {
      setError('Failed to load documents');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleFolderClick = (folder: Document) => {
    if (folder.type === DocumentType.FOLDER) {
      setCurrentFolder(folder);
      setBreadcrumbs([...breadcrumbs, { id: folder.id, name: folder.name }]);
    }
  };
  
  const handleBreadcrumbClick = (index: number) => {
    if (index === -1) {
      // Root
      setCurrentFolder(null);
      setBreadcrumbs([]);
    } else {
      const newBreadcrumbs = breadcrumbs.slice(0, index + 1);
      setBreadcrumbs(newBreadcrumbs);
      // Find the folder
      const folderId = newBreadcrumbs[newBreadcrumbs.length - 1].id;
      const folder = documents.find(d => d.id === folderId);
      setCurrentFolder(folder || null);
    }
  };
  
  const handleCreateFolder = async (name: string) => {
    try {
      const response = await api.createFolder(spaceId, {
        name,
        parentId: currentFolder?.id,
        visibility: DocumentVisibility.PUBLIC
      });
      
      if (response.success) {
        setShowCreateFolderModal(false);
        loadDocuments();
      }
    } catch (err) {
      console.error('Failed to create folder:', err);
    }
  };
  
  const handleFileUpload = async (file: File) => {
    try {
      const response = await api.uploadDocument(spaceId, file, {
        name: file.name,
        parentId: currentFolder?.id,
        visibility: DocumentVisibility.PUBLIC
      });
      
      if (response.success) {
        setShowUploadModal(false);
        loadDocuments();
      }
    } catch (err) {
      console.error('Failed to upload file:', err);
    }
  };
  
  const handleDelete = async (document: Document) => {
    if (!confirm(`Delete ${document.name}?`)) return;
    
    try {
      await api.deleteDocument(document.id);
      loadDocuments();
    } catch (err) {
      console.error('Failed to delete:', err);
    }
  };
  
  const handleDownload = async (document: Document) => {
    if (document.type === DocumentType.FILE && document.fileName) {
      await downloadFile(document.id, document.fileName);
    }
  };
  
  const filteredDocuments = filterDocuments(documents, searchQuery);
  
  return (
    <div className="h-full flex flex-col bg-zinc-50 dark:bg-zinc-950">
      {/* Header */}
      <div className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <Folder size={24} className="text-indigo-600 dark:text-indigo-400" />
            Documents
          </h2>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowCreateFolderModal(true)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg flex items-center gap-2 text-sm font-medium transition-colors"
            >
              <Plus size={16} />
              New Folder
            </button>
            
            <button
              onClick={() => setShowUploadModal(true)}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center gap-2 text-sm font-medium transition-colors"
            >
              <Upload size={16} />
              Upload File
            </button>
          </div>
        </div>
        
        {/* Breadcrumbs */}
        <div className="flex items-center gap-2 text-sm mb-4">
          <button
            onClick={() => handleBreadcrumbClick(-1)}
            className="text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            Root
          </button>
          {breadcrumbs.map((crumb, index) => (
            <React.Fragment key={crumb.id}>
              <ChevronRight size={14} className="text-zinc-400" />
              <button
                onClick={() => handleBreadcrumbClick(index)}
                className="text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                {crumb.name}
              </button>
            </React.Fragment>
          ))}
        </div>
        
        {/* Search & View Toggle */}
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
            <input
              type="text"
              placeholder="Search documents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-100 dark:bg-zinc-800 border-none rounded-lg py-2.5 pl-10 pr-4 text-sm focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
            />
          </div>
          
          <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded ${viewMode === 'grid' ? 'bg-white dark:bg-zinc-700 shadow-sm' : ''}`}
            >
              <Grid3x3 size={18} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded ${viewMode === 'list' ? 'bg-white dark:bg-zinc-700 shadow-sm' : ''}`}
            >
              <List size={18} />
            </button>
          </div>
        </div>
      </div>
      
      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          </div>
        ) : error ? (
          <div className="text-center text-red-600 py-8">{error}</div>
        ) : filteredDocuments.length === 0 ? (
          <div className="text-center text-zinc-500 py-12">
            <FolderOpen size={64} className="mx-auto mb-4 opacity-20" />
            <p className="text-lg font-medium mb-2">No documents yet</p>
            <p className="text-sm">Create a folder or upload a file to get started</p>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filteredDocuments.map(doc => (
              <DocumentCard
                key={doc.id}
                document={doc}
                currentUserId={currentUserId}
                onClick={() => doc.type === DocumentType.FOLDER ? handleFolderClick(doc) : setSelectedDocument(doc)}
                onDelete={() => handleDelete(doc)}
                onDownload={() => handleDownload(doc)}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredDocuments.map(doc => (
              <DocumentListItem
                key={doc.id}
                document={doc}
                currentUserId={currentUserId}
                onClick={() => doc.type === DocumentType.FOLDER ? handleFolderClick(doc) : setSelectedDocument(doc)}
                onDelete={() => handleDelete(doc)}
                onDownload={() => handleDownload(doc)}
              />
            ))}
          </div>
        )}
      </div>
      
      {/* Modals */}
      {showCreateFolderModal && (
        <CreateFolderModal
          onClose={() => setShowCreateFolderModal(false)}
          onCreate={handleCreateFolder}
        />
      )}
      
      {showUploadModal && (
        <UploadModal
          onClose={() => setShowUploadModal(false)}
          onUpload={handleFileUpload}
        />
      )}

      {/* Document Preview Modal */}
      {selectedDocument && selectedDocument.type !== DocumentType.FOLDER && (
        <DocumentPreviewModal
          document={selectedDocument}
          onClose={() => setSelectedDocument(null)}
          onDownload={() => handleDownload(selectedDocument)}
        />
      )}
    </div>
  );
}

// Document Card Component
function DocumentCard({ document, currentUserId, onClick, onDelete, onDownload }: any) {
  const isFolder = document.type === DocumentType.FOLDER;
  const canDelete = canDeleteDocument(document, currentUserId);
  
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 cursor-pointer hover:shadow-lg transition-shadow"
      onClick={onClick}
    >
      <div className="mb-3 flex items-center justify-center">
        {isFolder ? (
          <Folder size={48} className="text-indigo-600 dark:text-indigo-400" />
        ) : (
          <div className="text-indigo-600 dark:text-indigo-400">
            {getFileIcon(document.mimeType, 48)}
          </div>
        )}
      </div>
      
      <h3 className="font-medium text-sm text-zinc-900 dark:text-zinc-100 truncate mb-1">
        {document.name}
      </h3>
      
      {!isFolder && document.fileSize && (
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          {formatFileSize(document.fileSize)}
        </p>
      )}
      
      {document._count && isFolder && (
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          {document._count.children} items
        </p>
      )}
      
      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-800">
        {!isFolder && (
          <button
            onClick={(e) => { e.stopPropagation(); onDownload(); }}
            className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded"
          >
            <Download size={14} />
          </button>
        )}
        
        {canDelete && (
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="p-1 hover:bg-red-100 dark:hover:bg-red-900/20 text-red-600 rounded ml-auto"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>
    </motion.div>
  );
}

// Document List Item Component
function DocumentListItem({ document, currentUserId, onClick, onDelete, onDownload }: any) {
  const isFolder = document.type === DocumentType.FOLDER;
  const canDelete = canDeleteDocument(document, currentUserId);
  
  return (
    <div
      className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-4 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors flex items-center justify-between"
      onClick={onClick}
    >
      <div className="flex items-center gap-4 flex-1 min-w-0">
        <div className="shrink-0">
          {isFolder ? (
            <Folder size={24} className="text-indigo-600 dark:text-indigo-400" />
          ) : (
            <div className="text-indigo-600 dark:text-indigo-400">
              {getFileIcon(document.mimeType, 24)}
            </div>
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-sm text-zinc-900 dark:text-zinc-100 truncate">
            {document.name}
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {!isFolder && document.fileSize ? formatFileSize(document.fileSize) : `${document._count?.children || 0} items`}
          </p>
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        {!isFolder && (
          <button
            onClick={(e) => { e.stopPropagation(); onDownload(); }}
            className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded"
          >
            <Download size={16} />
          </button>
        )}
        
        {canDelete && (
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="p-2 hover:bg-red-100 dark:hover:bg-red-900/20 text-red-600 rounded"
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>
    </div>
  );
}

// Create Folder Modal
function CreateFolderModal({ onClose, onCreate }: any) {
  const [name, setName] = useState('');
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onCreate(name.trim());
    }
  };
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white dark:bg-zinc-900 rounded-2xl p-6 w-full max-w-md"
      >
        <h3 className="text-lg font-bold mb-4">Create New Folder</h3>
        
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Folder name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-zinc-100 dark:bg-zinc-800 border-none rounded-lg py-3 px-4 mb-4 focus:ring-2 focus:ring-indigo-500 outline-none"
            autoFocus
          />
          
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-zinc-200 dark:bg-zinc-800 rounded-lg hover:bg-zinc-300 dark:hover:bg-zinc-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              disabled={!name.trim()}
            >
              Create
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

// Document Preview Modal
function DocumentPreviewModal({ document, onClose, onDownload }: { document: Document; onClose: () => void; onDownload: () => void }) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    let blobUrl: string | null = null;
    let isMounted = true;

    const loadPreview = async () => {
      setIsLoading(true);
      setError('');
      
      try {
        // Check if it's a Google Doc
        if (document.url && isGoogleDocUrl(document.url)) {
          if (isMounted) {
            setPreviewUrl(getGoogleDocEmbedUrl(document.url));
            setIsLoading(false);
          }
          return;
        }

        // For files, always use download endpoint to get blob URL for preview
        // This ensures authentication works and we can preview images/PDFs properly
        if (document.type === DocumentType.FILE && document.fileName) {
          try {
            const blob = await api.downloadDocument(document.id);
            blobUrl = window.URL.createObjectURL(blob);
            if (isMounted) {
              setPreviewUrl(blobUrl);
              setIsLoading(false);
            }
          } catch (err) {
            console.error('Preview error:', err);
            if (isMounted) {
              setError('Unable to load preview. Please download the file.');
              setIsLoading(false);
            }
          }
        } else if (document.fileUrl) {
          // Fallback: try direct URL if available (for non-file documents or external URLs)
          let previewUrlToSet: string;
          
          if (document.fileUrl.startsWith('http://') || document.fileUrl.startsWith('https://')) {
            previewUrlToSet = document.fileUrl;
          } else {
            const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";
            const serverBase = API_BASE_URL.replace('/api', '');
            previewUrlToSet = `${serverBase}${document.fileUrl}`;
          }
          
          if (isMounted) {
            setPreviewUrl(previewUrlToSet);
            setIsLoading(false);
          }
        } else {
          if (isMounted) {
            setError('No preview available for this document type.');
            setIsLoading(false);
          }
        }
      } catch (err) {
        console.error('Preview error:', err);
        if (isMounted) {
          setError('Failed to load preview');
          setIsLoading(false);
        }
      }
    };

    loadPreview();

    // Cleanup blob URL on unmount or document change
    return () => {
      isMounted = false;
      if (blobUrl) {
        window.URL.revokeObjectURL(blobUrl);
      }
    };
  }, [document.id, document.url, document.fileUrl]);

  const isImage = document.mimeType?.startsWith('image/');
  const isPDF = document.mimeType === 'application/pdf';
  const isText = document.mimeType === 'text/plain' || document.mimeType?.startsWith('text/');
  const isGoogleDoc = document.url && isGoogleDocUrl(document.url);
  const canPreview = isImage || isPDF || isText || isGoogleDoc;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/80 dark:bg-black/90 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className={`bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 flex flex-col ${
            isFullscreen ? 'w-full h-full max-w-none max-h-none' : 'w-full max-w-6xl max-h-[90vh]'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="w-10 h-10 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                {isImage ? (
                  <ImageIcon size={20} />
                ) : isPDF ? (
                  <FileText size={20} />
                ) : (
                  <File size={20} />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 truncate">
                  {document.name}
                </h3>
                {document.fileSize && (
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {formatFileSize(document.fileSize)}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {canPreview && previewUrl && (
                <button
                  onClick={() => setIsFullscreen(!isFullscreen)}
                  className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                  title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
                >
                  <Maximize2 size={18} className="text-zinc-600 dark:text-zinc-400" />
                </button>
              )}
              {document.fileUrl && (
                <a
                  href={document.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                  title="Open in new tab"
                >
                  <ExternalLink size={18} className="text-zinc-600 dark:text-zinc-400" />
                </a>
              )}
              <button
                onClick={onDownload}
                className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                title="Download"
              >
                <Download size={18} className="text-zinc-600 dark:text-zinc-400" />
              </button>
              <button
                onClick={onClose}
                className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
              >
                <X size={18} className="text-zinc-600 dark:text-zinc-400" />
              </button>
            </div>
          </div>

          {/* Preview Content */}
          <div className="flex-1 overflow-auto p-6 bg-zinc-50 dark:bg-zinc-950">
            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">Loading preview...</p>
                </div>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center h-64 text-center">
                <AlertCircle size={48} className="text-zinc-400 mb-4" />
                <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-2">{error}</p>
                <button
                  onClick={onDownload}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  <Download size={16} />
                  Download File
                </button>
              </div>
            ) : canPreview && previewUrl ? (
              <div className="w-full h-full flex items-center justify-center">
                {isGoogleDoc ? (
                  <iframe
                    src={previewUrl}
                    className="w-full h-full min-h-[600px] border border-zinc-200 dark:border-zinc-800 rounded-lg"
                    title={document.name}
                  />
                ) : isImage ? (
                  <div className="flex items-center justify-center">
                    <img
                      src={previewUrl}
                      alt={document.name}
                      className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-lg"
                      onError={() => setError('Failed to load image')}
                    />
                  </div>
                ) : isPDF ? (
                  <iframe
                    src={previewUrl}
                    className="w-full h-full min-h-[600px] border border-zinc-200 dark:border-zinc-800 rounded-lg"
                    title={document.name}
                  />
                ) : isText ? (
                  <div className="w-full max-w-4xl bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-6">
                    <iframe
                      src={previewUrl}
                      className="w-full h-full min-h-[400px] border-none"
                      title={document.name}
                    />
                  </div>
                ) : (
                  <div className="text-center">
                    <File size={64} className="text-zinc-400 mx-auto mb-4" />
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">
                      Preview not available for this file type
                    </p>
                    <button
                      onClick={onDownload}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      <Download size={16} />
                      Download File
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-64 text-center">
                <File size={64} className="text-zinc-400 mb-4" />
                <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-2">
                  Preview not available for this file type
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-4">
                  {document.mimeType || 'Unknown file type'}
                </p>
                <button
                  onClick={onDownload}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  <Download size={16} />
                  Download File
                </button>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// Upload Modal
function UploadModal({ onClose, onUpload }: any) {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };
  
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };
  
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      setFile(droppedFile);
    }
  };
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (file) {
      onUpload(file);
    }
  };
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white dark:bg-zinc-900 rounded-2xl p-6 w-full max-w-md"
      >
        <h3 className="text-lg font-bold mb-4">Upload File</h3>
        
        <form onSubmit={handleSubmit}>
          {/* Drag and Drop Area */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`
              border-2 border-dashed rounded-lg p-8 mb-4 text-center transition-colors cursor-pointer
              ${isDragging 
                ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/20' 
                : 'border-zinc-300 dark:border-zinc-700 hover:border-indigo-400 dark:hover:border-indigo-600'
              }
            `}
            onClick={() => document.getElementById('file-upload')?.click()}
          >
            <Upload size={48} className="mx-auto mb-3 text-zinc-400" />
            <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              {isDragging ? 'Drop file here' : 'Drag and drop file here'}
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-3">
              or click to browse
            </p>
            <p className="text-xs text-zinc-400 dark:text-zinc-500">
              Max size: 50MB
            </p>
            <input
              id="file-upload"
              type="file"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>
          
          {/* Selected File Info */}
          {file && (
            <div className="mb-4 p-3 bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-800 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/40 rounded-lg flex items-center justify-center">
                  <File size={20} className="text-indigo-600 dark:text-indigo-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-zinc-900 dark:text-zinc-100 truncate">{file.name}</p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">{formatFileSize(file.size)}</p>
                </div>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setFile(null); }}
                  className="p-1 hover:bg-red-100 dark:hover:bg-red-900/20 text-red-600 rounded"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          )}
          
          {/* Action Buttons */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-zinc-200 dark:bg-zinc-800 rounded-lg hover:bg-zinc-300 dark:hover:bg-zinc-700 font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={!file}
            >
              Upload
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
