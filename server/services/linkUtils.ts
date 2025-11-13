import * as crypto from 'crypto';
import LinkMapping from '../models/LinkMapping';

/**
 * Generate a cryptographically secure 8-character alphanumeric short code
 * Characters used: a-z, A-Z, 0-9 (62 possible characters)
 * This gives us 62^8 = ~218 trillion possible combinations
 */
export function generateShortCode(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const codeLength = 8;
  let shortCode = '';
  
  // Use crypto.randomBytes for cryptographically secure randomness
  const randomBytes = crypto.randomBytes(codeLength);
  
  for (let i = 0; i < codeLength; i++) {
    const randomIndex = randomBytes[i] % chars.length;
    shortCode += chars[randomIndex];
  }
  
  return shortCode;
}

/**
 * Generate a unique short code that doesn't exist in the database
 * Retries up to maxAttempts times if collision occurs
 * @param maxAttempts - Maximum number of generation attempts (default: 5)
 * @returns A unique 8-character short code
 */
export async function generateUniqueShortCode(maxAttempts: number = 5): Promise<string> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const shortCode = generateShortCode();
    
    // Check if this code already exists in the database
    const existing = await LinkMapping.findOne({ short_code: shortCode });
    
    if (!existing) {
      console.log(`✅ Generated unique short code: ${shortCode} (attempt ${attempt})`);
      return shortCode;
    }
    
    console.warn(`⚠️  Short code collision detected: ${shortCode} (attempt ${attempt}/${maxAttempts})`);
  }
  
  throw new Error('Failed to generate unique short code after maximum attempts');
}

/**
 * Validate short code format
 * Must be exactly 8 alphanumeric characters
 */
export function isValidShortCode(shortCode: string): boolean {
  const regex = /^[a-zA-Z0-9]{8}$/;
  return regex.test(shortCode);
}

/**
 * Calculate expiry timestamp from minutes
 * @param expiryMinutes - Number of minutes until expiry (default: 24 hours)
 * @returns Date object representing the expiry time
 */
export function calculateExpiryTime(expiryMinutes: number = 1440): Date {
  const now = new Date();
  return new Date(now.getTime() + expiryMinutes * 60 * 1000);
}

/**
 * Check if a link has expired
 * @param expiresAt - The expiry timestamp
 * @returns true if expired, false otherwise
 */
export function isExpired(expiresAt: Date): boolean {
  return new Date() > expiresAt;
}

/**
 * Format blob path for Azure Storage
 * Ensures the path is properly formatted without leading slashes
 * @param userId - The owner's user ID
 * @param fileName - The file name
 * @returns Formatted blob path
 */
export function formatBlobPath(userId: string, fileName: string): string {
  // Remove any leading slashes
  const cleanFileName = fileName.startsWith('/') ? fileName.substring(1) : fileName;
  const cleanUserId = userId.startsWith('/') ? userId.substring(1) : userId;
  
  // Return path in format: userId/fileName
  return `${cleanUserId}/${cleanFileName}`;
}

/**
 * Parse blob path to extract components
 * @param blobPath - The blob path (e.g., "userId/fileName.pdf")
 * @returns Object with userId and fileName
 */
export function parseBlobPath(blobPath: string): { userId: string; fileName: string } | null {
  const parts = blobPath.split('/');
  
  if (parts.length < 2) {
    return null;
  }
  
  const userId = parts[0];
  const fileName = parts.slice(1).join('/'); // Handle filenames with slashes
  
  return { userId, fileName };
}

export default {
  generateShortCode,
  generateUniqueShortCode,
  isValidShortCode,
  calculateExpiryTime,
  isExpired,
  formatBlobPath,
  parseBlobPath
};
