import mongoose, { Document, Schema } from "mongoose";

export interface INotification extends Document {
  userId: mongoose.Types.ObjectId;
  type: 'file_shared' | 'file_downloaded' | 'access_request' | 'access_approved' | 'access_denied' | 'comment' | 'system';
  title: string;
  message: string;
  data?: {
    fileId?: string;
    fileName?: string;
    linkId?: string;
    requestId?: string;
    userId?: string;
    userName?: string;
  };
  read: boolean;
  readAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { 
      type: String, 
      enum: ['file_shared', 'file_downloaded', 'access_request', 'access_approved', 'access_denied', 'comment', 'system'],
      required: true 
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    data: {
      type: {
        fileId: String,
        fileName: String,
        linkId: String,
        requestId: String,
        userId: String,
        userName: String
      },
      default: {}
    },
    read: { type: Boolean, default: false, index: true },
    readAt: { type: Date }
  },
  { timestamps: true }
);

// Index for efficient queries
NotificationSchema.index({ userId: 1, read: 1, createdAt: -1 });

const NotificationModel = mongoose.models.Notification || mongoose.model<INotification>("Notification", NotificationSchema);
export default NotificationModel;
