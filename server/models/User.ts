import mongoose, { Document, Schema, Model } from "mongoose";

export interface IUser extends Document {
  firstName: string;
  lastName: string;
  email: string;
  passwordHash: string;
  profileImage?: string; // URL or path to profile image
  emailVerified: boolean;
  emailVerificationToken?: string;
  emailVerificationExpires?: Date;
  twoFactorEnabled: boolean;
  twoFactorCode?: string;
  twoFactorExpires?: Date;
  // Settings
  notificationPreferences?: {
    emailNotifications: boolean;
    fileShared: boolean;
    fileDownloaded: boolean;
    accessRequestReceived: boolean;
    accessRequestApproved: boolean;
    comments: boolean;
    digestFrequency: 'daily' | 'weekly' | 'never';
  };
  privacySettings?: {
    defaultFilePrivacy: 'public' | 'private';
    profileVisibility: 'public' | 'private';
    activityVisibility: 'public' | 'private';
  };
  appearanceSettings?: {
    theme: 'light' | 'dark' | 'system';
    language: string;
    timezone: string;
    dateFormat: string;
  };
  storageLimit: number; // in bytes
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, index: true },
    passwordHash: { type: String, required: true },
    profileImage: { type: String },
    emailVerified: { type: Boolean, default: false },
    emailVerificationToken: { type: String },
    emailVerificationExpires: { type: Date },
    twoFactorEnabled: { type: Boolean, default: false },
    twoFactorCode: { type: String },
    twoFactorExpires: { type: Date },
    notificationPreferences: {
      type: {
        emailNotifications: { type: Boolean, default: true },
        fileShared: { type: Boolean, default: true },
        fileDownloaded: { type: Boolean, default: true },
        accessRequestReceived: { type: Boolean, default: true },
        accessRequestApproved: { type: Boolean, default: true },
        comments: { type: Boolean, default: true },
        digestFrequency: { type: String, enum: ['daily', 'weekly', 'never'], default: 'daily' }
      },
      default: {}
    },
    privacySettings: {
      type: {
        defaultFilePrivacy: { type: String, enum: ['public', 'private'], default: 'private' },
        profileVisibility: { type: String, enum: ['public', 'private'], default: 'public' },
        activityVisibility: { type: String, enum: ['public', 'private'], default: 'public' }
      },
      default: {}
    },
    appearanceSettings: {
      type: {
        theme: { type: String, enum: ['light', 'dark', 'system'], default: 'system' },
        language: { type: String, default: 'en' },
        timezone: { type: String, default: 'UTC' },
        dateFormat: { type: String, default: 'MM/DD/YYYY' }
      },
      default: {}
    },
    storageLimit: { type: Number, default: 5 * 1024 * 1024 * 1024 } // 5GB default
  },
  { timestamps: true }
);

export interface IUserModel extends Model<IUser> {}

const UserModel = (mongoose.models.User || mongoose.model<IUser, IUserModel>("User", UserSchema)) as IUserModel;
export default UserModel;


