import mongoose, { Document, Schema } from "mongoose";

export interface IFileAccess extends Document {
  fileId: string;
  userId: mongoose.Types.ObjectId;
  grantedBy: mongoose.Types.ObjectId;
  accessLevel: 'view' | 'edit' | 'admin';
  grantedAt: Date;
  lastAccessedAt?: Date;
  isActive: boolean;
  accessHistory: Array<{
    accessedAt: Date;
    accessType: 'view' | 'download' | 'share';
    ipAddress?: string;
    userAgent?: string;
  }>;
}

const FileAccessSchema = new Schema<IFileAccess>(
  {
    fileId: { type: String, required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    grantedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    accessLevel: {
      type: String,
      enum: ['view', 'edit', 'admin'],
      required: true
    },
    grantedAt: { type: Date, default: Date.now },
    lastAccessedAt: { type: Date },
    isActive: { type: Boolean, default: true },
    accessHistory: [{
      accessedAt: { type: Date, required: true },
      accessType: { type: String, enum: ['view', 'download', 'share'], required: true },
      ipAddress: { type: String },
      userAgent: { type: String }
    }]
  },
  { timestamps: true }
);

// Compound indexes for efficient queries
FileAccessSchema.index({ fileId: 1, userId: 1 }, { unique: true });
FileAccessSchema.index({ userId: 1, isActive: 1 });
FileAccessSchema.index({ fileId: 1, isActive: 1 });

const FileAccessModel = mongoose.models.FileAccess || mongoose.model<IFileAccess>("FileAccess", FileAccessSchema);
export default FileAccessModel;
