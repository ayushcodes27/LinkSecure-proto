import mongoose, { Document, Schema, Model } from 'mongoose';

export interface IAccessRequest extends Document {
  fileId: string;
  userId: mongoose.Types.ObjectId;
  status: 'pending' | 'approved' | 'denied';
  requestedRole: 'view' | 'edit' | 'admin';
  message?: string;
  actionedBy?: mongoose.Types.ObjectId;
  actionedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const AccessRequestSchema = new Schema<IAccessRequest>(
  {
    fileId: {
      type: String,
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'denied'],
      default: 'pending',
      required: true,
    },
    requestedRole: {
      type: String,
      enum: ['view', 'edit', 'admin'],
      required: true,
    },
    message: {
      type: String,
    },
    actionedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    actionedAt: {
      type: Date,
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt timestamps
  }
);

// Index for efficient querying of pending requests for a file
AccessRequestSchema.index({ fileId: 1, status: 1 });

const AccessRequest = mongoose.model<IAccessRequest>('AccessRequest', AccessRequestSchema);

export default AccessRequest;