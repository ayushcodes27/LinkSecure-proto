import mongoose, { Document, Schema, Model } from "mongoose";
import { randomUUID } from "crypto";

export interface ISecureLink extends Document {
  linkId: string;
  fileId: string;
  fileName: string;
  originalName: string;
  secureToken: string;
  createdBy: mongoose.Types.ObjectId;
  expiresAt: Date;
  isActive: boolean;
  accessCount: number;
  maxAccessCount?: number;
  // Policy fields
  passwordHash?: string;
  requireEmail?: boolean;
  allowPreview?: boolean;
  watermarkEnabled?: boolean;
  lastAccessedAt?: Date;
  accessHistory: Array<{
    accessedAt: Date;
    ipAddress?: string;
    userAgent?: string;
    accessType: 'view' | 'download';
  }>;
  createdAt: Date;
  updatedAt: Date;
}

export interface ISecureLinkModel extends Model<ISecureLink> {
  createSecureLink(linkData: Partial<ISecureLink>): Promise<ISecureLink>;
  findByToken(token: string): Promise<ISecureLink | null>;
  isLinkValid(link: ISecureLink): boolean;
}

const SecureLinkSchema = new Schema<ISecureLink>(
  {
    linkId: { 
      type: String, 
      required: true, 
      unique: true,
      default: () => randomUUID()
    },
    fileId: { 
      type: String, 
      required: true,
      ref: 'File'
    },
    fileName: { 
      type: String, 
      required: true 
    },
    originalName: { 
      type: String, 
      required: true 
    },
    secureToken: { 
      type: String, 
      required: true, 
      unique: true,
      default: () => randomUUID()
    },
    createdBy: { 
      type: Schema.Types.ObjectId, 
      ref: 'User', 
      required: true 
    },
    expiresAt: { 
      type: Date, 
      required: true 
    },
    isActive: { 
      type: Boolean, 
      default: true 
    },
    accessCount: { 
      type: Number, 
      default: 0 
    },
    maxAccessCount: { 
      type: Number 
    },
    // Policy fields
    passwordHash: {
      type: String
    },
    requireEmail: {
      type: Boolean,
      default: false
    },
    allowPreview: {
      type: Boolean,
      default: true
    },
    watermarkEnabled: {
      type: Boolean,
      default: false
    },
    lastAccessedAt: { 
      type: Date 
    },
    accessHistory: [{
      accessedAt: { type: Date, required: true },
      ipAddress: { type: String },
      userAgent: { type: String },
      accessType: { type: String, enum: ['view', 'download'], required: true }
    }]
  },
  { 
    timestamps: true,
    toJSON: {
      transform: function(doc, ret: any) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        delete ret.passwordHash;
        return ret;
      }
    }
  }
);

// Static method for creating secure links
SecureLinkSchema.statics.createSecureLink = async function(linkData: Partial<ISecureLink>) {
  // Ensure linkId is always provided
  if (!linkData.linkId) {
    linkData.linkId = randomUUID();
  }
  
  // Ensure secureToken is always provided
  if (!linkData.secureToken) {
    linkData.secureToken = randomUUID();
  }
  
  try {
    const link = new this(linkData);
    return await link.save();
  } catch (error: any) {
    // Handle duplicate key errors by retrying with a new token
    if (error.code === 11000 && error.keyPattern?.secureToken) {
      console.log('Duplicate secureToken detected, generating new one...');
      linkData.secureToken = randomUUID();
      const retryLink = new this(linkData);
      return await retryLink.save();
    }
    throw error;
  }
};

// Static method to find link by token
SecureLinkSchema.statics.findByToken = async function(token: string) {
  return await this.findOne({ secureToken: token, isActive: true });
};

// Static method to check if link is valid
SecureLinkSchema.statics.isLinkValid = function(link: ISecureLink) {
  if (!link.isActive) return false;
  if (new Date() > link.expiresAt) return false;
  if (link.maxAccessCount && link.accessCount >= link.maxAccessCount) return false;
  return true;
};

// Instance method to record access
SecureLinkSchema.methods.recordAccess = function(ipAddress?: string, userAgent?: string, accessType: 'view' | 'download' = 'view') {
  this.accessCount += 1;
  this.lastAccessedAt = new Date();
  this.accessHistory.push({
    accessedAt: new Date(),
    ipAddress,
    userAgent,
    accessType
  });
  return this.save();
};

// Indexes for efficient queries
SecureLinkSchema.index({ secureToken: 1 });
SecureLinkSchema.index({ fileId: 1, createdBy: 1 });
SecureLinkSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
SecureLinkSchema.index({ isActive: 1, expiresAt: 1 });

const SecureLinkModel = mongoose.model<ISecureLink, ISecureLinkModel>("SecureLink", SecureLinkSchema);
export default SecureLinkModel;
