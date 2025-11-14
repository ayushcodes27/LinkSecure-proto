import mongoose, { Document, Schema, Model } from "mongoose";

/**
 * LinkMapping Interface - Maps short codes to Azure Blob Storage paths
 * This is the core model for the LinkSecure short URL service
 */
export interface ILinkMapping extends Document {
  id: string;                    // MongoDB _id (UUID)
  short_code: string;            // Unique 8-character alphanumeric code (e.g., "xyz123ab")
  blob_path: string;             // Full path to file in Azure (e.g., "container/user_id/file.pdf")
  owner_id: string;              // User ID who created the link
  created_at: Date;              // Timestamp when link was created
  expires_at: Date;              // Timestamp when link expires
  access_count: number;          // Number of times the link has been accessed
  last_accessed_at?: Date;       // Last time the link was accessed
  is_active: boolean;            // Whether the link is still active
  passwordHash?: string;         // Optional bcrypt hash for password-protected links
  metadata?: {                   // Optional metadata
    original_file_name?: string;
    file_size?: number;
    mime_type?: string;
  };
}

export interface ILinkMappingModel extends Model<ILinkMapping> {
  findByShortCode(shortCode: string): Promise<ILinkMapping | null>;
  isLinkExpired(link: ILinkMapping): boolean;
  incrementAccessCount(shortCode: string): Promise<void>;
}

const LinkMappingSchema = new Schema<ILinkMapping>(
  {
    short_code: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
      minlength: 8,
      maxlength: 8,
      match: /^[a-zA-Z0-9]{8}$/,
      description: "Unique 8-character alphanumeric identifier"
    },
    blob_path: {
      type: String,
      required: true,
      trim: true,
      description: "Full path to the file in Azure Blob Storage"
    },
    owner_id: {
      type: String,
      required: true,
      index: true,
      description: "User ID of the link creator"
    },
    created_at: {
      type: Date,
      default: Date.now,
      immutable: true,
      description: "Timestamp when the link was created"
    },
    expires_at: {
      type: Date,
      required: true,
      index: true,
      description: "Timestamp when the link expires"
    },
    access_count: {
      type: Number,
      default: 0,
      min: 0,
      description: "Number of times the link has been accessed"
    },
    last_accessed_at: {
      type: Date,
      description: "Last time the link was accessed"
    },
    is_active: {
      type: Boolean,
      default: true,
      index: true,
      description: "Whether the link is active or has been deactivated"
    },
    passwordHash: {
      type: String,
      required: false,
      description: "Optional bcrypt hash for password-protected links"
    },
    metadata: {
      original_file_name: String,
      file_size: Number,
      mime_type: String
    }
  },
  {
    timestamps: false, // We're using custom created_at/expires_at
    collection: 'linkmappings',
    versionKey: false
  }
);

// Index for efficient queries
LinkMappingSchema.index({ short_code: 1 });
LinkMappingSchema.index({ owner_id: 1, created_at: -1 });
LinkMappingSchema.index({ expires_at: 1, is_active: 1 });

// Static method: Find link by short code
LinkMappingSchema.statics.findByShortCode = async function(
  shortCode: string
): Promise<ILinkMapping | null> {
  return this.findOne({ short_code: shortCode, is_active: true });
};

// Static method: Check if link is expired
LinkMappingSchema.statics.isLinkExpired = function(link: ILinkMapping): boolean {
  return new Date() > link.expires_at;
};

// Static method: Increment access count
LinkMappingSchema.statics.incrementAccessCount = async function(
  shortCode: string
): Promise<void> {
  await this.updateOne(
    { short_code: shortCode },
    { 
      $inc: { access_count: 1 },
      $set: { last_accessed_at: new Date() }
    }
  );
};

// Instance method: Check if this specific link is valid
LinkMappingSchema.methods.isValid = function(): boolean {
  return this.is_active && new Date() <= this.expires_at;
};

const LinkMapping = mongoose.model<ILinkMapping, ILinkMappingModel>(
  'LinkMapping',
  LinkMappingSchema
);

export default LinkMapping;
