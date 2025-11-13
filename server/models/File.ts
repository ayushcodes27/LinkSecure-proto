import mongoose, { Document, Schema, Model } from "mongoose";
import { randomUUID } from "crypto";

export interface IFile extends Document {
  fileId: string;
  originalName: string;
  fileName: string;
  blobName: string; // Azure blob name - always unique and never null
  filePath: string;
  fileUrl: string;
  mimeType: string;
  fileSize: number;
  uploadedBy: mongoose.Types.ObjectId;
  uploadMethod: 'drag-drop' | 'choose-files' | 'upload-button';
  metadata?: {
    description?: string;
    tags?: string[];
    category?: string;
  };
  isPublic: boolean;
  downloadCount: number;
  viewCount: number;
  shareCount: number;
  lastAccessedAt?: Date;
  expiresAt?: Date;
  accessHistory: Array<{
    accessedAt: Date;
    accessType: 'view' | 'download' | 'share';
    ipAddress?: string;
    userAgent?: string;
    userId?: mongoose.Types.ObjectId;
    device?: string;
    browser?: string;
    location?: string;
  }>;
  downloadHistory: Array<{
    downloadedAt: Date;
    ipAddress?: string;
    userAgent?: string;
    userId?: mongoose.Types.ObjectId;
  }>;
  createdAt: Date;
  updatedAt: Date;
  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: mongoose.Types.ObjectId;
}

export interface IFileModel extends Model<IFile> {
  createFile(fileData: Partial<IFile>): Promise<IFile>;
}

const FileSchema = new Schema<IFile>(
  {
    fileId: { 
      type: String, 
      required: true, 
      unique: true
    },
    originalName: { 
      type: String, 
      required: true 
    },
    fileName: { 
      type: String, 
      required: true 
    },
    blobName: { 
      type: String, 
      required: true,
      unique: true,
      default: function() {
        // Generate a unique blob name if not provided
        return `blob_${Date.now()}_${randomUUID().substring(0, 8)}`;
      }
    },
    filePath: { 
      type: String, 
      required: true 
    },
    fileUrl: { 
      type: String, 
      required: true 
    },
    mimeType: { 
      type: String, 
      required: true 
    },
    fileSize: { 
      type: Number, 
      required: true 
    },
    uploadedBy: { 
      type: Schema.Types.ObjectId, 
      ref: 'User', 
      required: true 
    },
    uploadMethod: { 
      type: String, 
      enum: ['drag-drop', 'choose-files', 'upload-button'], 
      required: true 
    },
    metadata: {
      description: { type: String },
      tags: [{ type: String }],
      category: { type: String }
    },
    isPublic: { 
      type: Boolean, 
      default: false 
    },
    downloadCount: { 
      type: Number, 
      default: 0 
    },
    viewCount: { 
      type: Number, 
      default: 0 
    },
    shareCount: { 
      type: Number, 
      default: 0 
    },
    lastAccessedAt: { 
      type: Date 
    },
    expiresAt: { 
      type: Date 
    },
    accessHistory: [{
      accessedAt: { type: Date, required: true },
      accessType: { type: String, enum: ['view', 'download', 'share'], required: true },
      ipAddress: { type: String },
      userAgent: { type: String },
      userId: { type: Schema.Types.ObjectId, ref: 'User' },
      device: { type: String },
      browser: { type: String },
      location: { type: String }
    }],
    downloadHistory: [{
      downloadedAt: { type: Date, required: true },
      ipAddress: { type: String },
      userAgent: { type: String },
      userId: { type: Schema.Types.ObjectId, ref: 'User' }
    }],
    isDeleted: {
      type: Boolean,
      default: false
    },
    deletedAt: {
      type: Date
    },
    deletedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  { 
    timestamps: true,
    toJSON: {
      transform: function(doc, ret: any) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        return ret;
      }
    }
  }
);

// Pre-save middleware to ensure blobName is always set
FileSchema.pre('save', function(next) {
  if (!this.blobName || this.blobName === null) {
    this.blobName = `blob_${Date.now()}_${randomUUID().substring(0, 8)}`;
  }
  next();
});

// Static method for safe file creation with automatic blobName generation
FileSchema.statics.createFile = async function(fileData: Partial<IFile>) {
  // Ensure blobName is always provided
  if (!fileData.blobName) {
    fileData.blobName = `blob_${Date.now()}_${randomUUID().substring(0, 8)}`;
  }
  
  // Ensure fileId is always provided
  if (!fileData.fileId) {
    fileData.fileId = randomUUID();
  }
  
  try {
    const file = new this(fileData);
    return await file.save();
  } catch (error: any) {
    // Handle duplicate key errors by retrying with a new blobName
    if (error.code === 11000 && error.keyPattern?.blobName) {
      console.log('Duplicate blobName detected, generating new one...');
      fileData.blobName = `blob_${Date.now()}_${randomUUID().substring(0, 8)}`;
      const retryFile = new this(fileData);
      return await retryFile.save();
    }
    throw error;
  }
};

// Index for efficient queries
FileSchema.index({ uploadedBy: 1, createdAt: -1 });
FileSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
FileSchema.index({ isDeleted: 1, deletedAt: 1 });

const FileModel = mongoose.model<IFile, IFileModel>("File", FileSchema);
export default FileModel;
