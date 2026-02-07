/**
 * Document Middleware - File upload and permission checking
 */
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { Request, Response, NextFunction } from 'express';
import { generateUniqueFilename } from '../utils/upload.util';

// ═══════════════════════════════════════════════════════════════
// FILE UPLOAD MIDDLEWARE
// ═══════════════════════════════════════════════════════════════

// Allowed document mime types
const ALLOWED_DOCUMENT_MIMES = [
  // Documents
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/csv',
  'application/rtf',
  
  // Images
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  
  // Archives
  'application/zip',
  'application/x-rar-compressed',
  'application/x-7z-compressed',
  
  // Code files
  'text/javascript',
  'application/json',
  'text/html',
  'text/css',
  'text/xml'
];

// Maximum file size: 50MB
const MAX_FILE_SIZE = 50 * 1024 * 1024;

/**
 * Multer storage configuration for documents
 */
const documentStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    try {
      const { spaceId } = req.params;
      const spaceIdStr = Array.isArray(spaceId) ? spaceId[0] : spaceId;
      if (!spaceIdStr) {
        return cb(new Error('Space ID is required'), '');
      }
      
      // Create directory: uploads/documents/{spaceId} - use absolute path and sync
      const uploadPath = path.join(process.cwd(), 'uploads', 'documents', spaceIdStr);
      
      // Create directory synchronously (multer doesn't handle async callbacks well)
      if (!fs.existsSync(uploadPath)) {
        fs.mkdirSync(uploadPath, { recursive: true });
      }
      
      cb(null, uploadPath);
    } catch (error) {
      cb(error as Error, '');
    }
  },
  filename: (req, file, cb) => {
    const uniqueName = generateUniqueFilename(file.originalname);
    cb(null, uniqueName);
  }
});

/**
 * File filter for document validation
 */
const documentFileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Check mime type
  if (!ALLOWED_DOCUMENT_MIMES.includes(file.mimetype)) {
    return cb(new Error(`File type ${file.mimetype} is not allowed`));
  }
  
  // Check file extension
  const ext = path.extname(file.originalname).toLowerCase();
  const allowedExtensions = [
    '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
    '.txt', '.csv', '.rtf',
    '.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg',
    '.zip', '.rar', '.7z',
    '.js', '.json', '.html', '.css', '.xml'
  ];
  
  if (!allowedExtensions.includes(ext)) {
    return cb(new Error(`File extension ${ext} is not allowed`));
  }
  
  cb(null, true);
};

/**
 * Multer upload middleware for documents
 */
export const uploadDocument: ReturnType<typeof multer> = multer({
  storage: documentStorage,
  fileFilter: documentFileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE
  }
});

/**
 * Error handling middleware for multer
 */
export function handleUploadError(err: any, req: Request, res: Response, next: NextFunction) {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: `File size exceeds maximum limit of ${MAX_FILE_SIZE / (1024 * 1024)}MB`
      });
    }
    return res.status(400).json({
      success: false,
      message: err.message
    });
  } else if (err) {
    return res.status(400).json({
      success: false,
      message: err.message || 'File upload failed'
    });
  }
  next();
}

// ═══════════════════════════════════════════════════════════════
// SPACE MEMBERSHIP VALIDATION
// ═══════════════════════════════════════════════════════════════

/**
 * Middleware to check if user is a member of the workspace
 */
export async function checkSpaceMembership(req: Request, res: Response, next: NextFunction) {
  try {
    const { spaceId } = req.params;
    const spaceIdStr = Array.isArray(spaceId) ? spaceId[0] : spaceId;
    const userId = req.user?.userId;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }
    
    if (!spaceIdStr) {
      return res.status(400).json({
        success: false,
        message: 'Workspace ID is required'
      });
    }
    
    // Import shared prisma instance
    const prisma = (await import('../lib/prisma')).default;
    
    try {
      // Check if user is space owner or member
      const space = await prisma.space.findUnique({
        where: { id: spaceIdStr },
        include: {
          members: {
            where: { userId }
          }
        }
      });
      
      if (!space) {
        return res.status(404).json({
          success: false,
          message: 'Workspace not found'
        });
      }
      
      const isOwner = space.ownerId === userId;
      const isMember = space.members.length > 0;
      const isSuperAdmin = req.user?.role === 'SUPERADMIN';
      
      if (!isOwner && !isMember && !isSuperAdmin) {
        return res.status(403).json({
          success: false,
          message: 'Access denied - Not a workspace member'
        });
      }
      
      // Attach space info to request
      req.workspace = {
        id: space.id,
        name: space.name,
        isOwner,
        isMember
      };
      
      next();
    } catch (dbError) {
      console.error('Database error in checkSpaceMembership:', dbError);
      throw dbError;
    }
  } catch (error) {
    console.error('Space membership check error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify workspace membership'
    });
  }
}

// ═══════════════════════════════════════════════════════════════
// TYPE AUGMENTATION
// ═══════════════════════════════════════════════════════════════

declare global {
  namespace Express {
    interface Request {
      workspace?: {
        id: string;
        name: string;
        isOwner: boolean;
        isMember: boolean;
      };
    }
  }
}
