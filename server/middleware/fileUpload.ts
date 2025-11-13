import multer from 'multer';
import { Request, Response, NextFunction } from 'express';
import { fileStorageService } from '../services/fileStorage';
import FileModel from '../models/File';

// File validation configuration
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
const ALLOWED_MIME_TYPES = [
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
  
  // Images
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  
  // Videos
  'video/mp4',
  'video/avi',
  'video/mov',
  'video/wmv',
  'video/flv',
  'video/webm',
  
  // Audio
  'audio/mp3',
  'audio/wav',
  'audio/ogg',
  'audio/aac',
  
  // Archives
  'application/zip',
  'application/x-rar-compressed',
  'application/x-7z-compressed',
  'application/gzip',
  
  // Other
  'application/json',
  'application/xml',
  'text/xml',
  
  // Code files
  'text/javascript',
  'application/javascript',
  'text/x-python',
  'text/x-java-source',
  'text/x-c',
  'text/x-c++',
  'text/x-csharp',
  'text/x-ruby',
  'text/x-php',
  'text/x-go',
  'text/x-rust',
  'text/x-swift',
  'text/x-kotlin',
  'text/x-scala',
  'text/x-sh',
  'text/html',
  'text/css',
  'text/x-scss',
  'text/x-sass',
  'text/markdown',
  'text/yaml',
  'text/x-yaml',
  'application/x-yaml'
];

const ALLOWED_EXTENSIONS = [
  '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.csv',
  '.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg',
  '.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm',
  '.mp3', '.wav', '.ogg', '.aac',
  '.zip', '.rar', '.7z', '.gz',
  '.json', '.xml',
  // Code files
  '.js', '.jsx', '.ts', '.tsx', '.py', '.java', '.c', '.cpp', '.cs',
  '.rb', '.php', '.go', '.rs', '.swift', '.kt', '.scala', '.sh',
  '.html', '.css', '.scss', '.sass', '.vue', '.svelte', '.md',
  '.yaml', '.yml', '.toml', '.ini', '.conf', '.h', '.hpp'
];

// Custom file filter
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const fileExtension = file.originalname.toLowerCase().substring(file.originalname.lastIndexOf('.'));
  
  // Check MIME type
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  }
  // Check file extension as fallback
  else if (ALLOWED_EXTENSIONS.includes(fileExtension)) {
    cb(null, true);
  }
  else {
    cb(new Error(`File type not allowed. Allowed types: ${ALLOWED_EXTENSIONS.join(', ')}`));
  }
};

// Configure multer
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 10 // Maximum 10 files per request
  }
});

// Middleware for single file upload
export const uploadSingle = upload.single('file');

// Middleware for multiple file upload
export const uploadMultiple = upload.array('files', 10);

// Custom validation middleware
export const validateFileUpload = (req: Request, res: Response, next: NextFunction) => {
  if (!req.file && (!req.files || (req.files as Express.Multer.File[]).length === 0)) {
    return res.status(400).json({
      success: false,
      error: 'No file provided',
      message: 'Please select a file to upload'
    });
  }

  // Validate upload method
  const uploadMethod = req.body.uploadMethod || req.headers['x-upload-method'];
  if (uploadMethod && !['drag-drop', 'choose-files', 'upload-button'].includes(uploadMethod)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid upload method',
      message: 'Upload method must be one of: drag-drop, choose-files, upload-button'
    });
  }

  next();
};

// Error handling middleware for multer
export const handleUploadError = (error: any, req: Request, res: Response, next: NextFunction) => {
  if (error instanceof multer.MulterError) {
    switch (error.code) {
      case 'LIMIT_FILE_SIZE':
        return res.status(400).json({
          success: false,
          error: 'File too large',
          message: `File size exceeds the maximum limit of ${MAX_FILE_SIZE / (1024 * 1024)}MB`
        });
      case 'LIMIT_FILE_COUNT':
        return res.status(400).json({
          success: false,
          error: 'Too many files',
          message: 'Maximum 10 files allowed per upload'
        });
      case 'LIMIT_UNEXPECTED_FILE':
        return res.status(400).json({
          success: false,
          error: 'Unexpected file field',
          message: 'File field name must be "file" or "files"'
        });
      default:
        return res.status(400).json({
          success: false,
          error: 'Upload error',
          message: error.message
        });
    }
  }

  if (error.message.includes('File type not allowed')) {
    return res.status(400).json({
      success: false,
      error: 'Invalid file type',
      message: error.message
    });
  }

  next(error);
};

// Middleware to process uploaded files
export const processUploadedFiles = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const uploadMethod = (req.body.uploadMethod || req.headers['x-upload-method'] || 'upload-button') as 'drag-drop' | 'choose-files' | 'upload-button';
    const uploadedFiles: any[] = [];

    if (req.file) {
      // Single file upload
      console.log('📁 Processing single file upload:');
      console.log('  📄 Original name:', req.file.originalname);
      console.log('  📊 File size:', req.file.size);
      console.log('  🏷️ MIME type:', req.file.mimetype);
      
      const storedFile = await fileStorageService.storeFile(
        req.file.buffer,
        req.file.originalname,
        uploadMethod
      );

      uploadedFiles.push({
        ...storedFile,
        originalName: req.file.originalname,
        uploadMethod
      });
    } else if (req.files && Array.isArray(req.files)) {
      // Multiple file upload
      console.log(`📁 Processing ${req.files.length} files upload:`);
      for (const file of req.files) {
        console.log('  📄 Processing file:', file.originalname);
        console.log('  📊 File size:', file.size);
        console.log('  🏷️ MIME type:', file.mimetype);
        
        const storedFile = await fileStorageService.storeFile(
          file.buffer,
          file.originalname,
          uploadMethod
        );

        uploadedFiles.push({
          ...storedFile,
          originalName: file.originalname,
          uploadMethod
        });
      }
    }

    // Attach processed files to request
    (req as any).uploadedFiles = uploadedFiles;
    next();
  } catch (error) {
    next(error);
  }
};

// Middleware to save file metadata to database
export const saveFileMetadata = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const uploadedFiles = (req as any).uploadedFiles;
    const userId = (req as any).user?.id; // Assuming user is attached by auth middleware
    
    console.log('User info from request:', (req as any).user);
    console.log('User ID:', userId);
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        message: 'User ID not found in request. Please ensure you are logged in.'
      });
    }
    
    const savedFiles: any[] = [];

    for (const file of uploadedFiles) {
      // Use the safe createFile method that handles blobName generation
      const savedFile = await FileModel.createFile({
        fileId: file.fileId,
        originalName: file.originalName,
        fileName: file.fileName,
        blobName: file.fileName, // Use fileName as blobName, or let the model generate one
        filePath: file.filePath,
        fileUrl: file.fileUrl,
        mimeType: file.mimeType,
        fileSize: file.fileSize,
        uploadedBy: userId,
        uploadMethod: file.uploadMethod,
        metadata: {
          description: req.body.description,
          tags: req.body.tags ? req.body.tags.split(',').map((tag: string) => tag.trim()) : [],
          category: req.body.category
        },
        isPublic: req.body.isPublic === 'true' || req.body.isPublic === true
      });

      savedFiles.push(savedFile);
    }

    (req as any).savedFiles = savedFiles;
    next();
  } catch (error) {
    next(error);
  }
};

// Utility function to get file info
export const getFileInfo = (file: Express.Multer.File) => {
  return {
    originalName: file.originalname,
    mimeType: file.mimetype,
    size: file.size,
    encoding: file.encoding,
    fieldname: file.fieldname
  };
};
