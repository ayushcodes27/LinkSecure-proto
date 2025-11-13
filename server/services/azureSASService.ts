import { 
  BlobServiceClient, 
  StorageSharedKeyCredential,
  BlobSASPermissions,
  generateBlobSASQueryParameters,
  SASProtocol
} from '@azure/storage-blob';

/**
 * Azure SAS Service - Generates time-limited Shared Access Signatures
 * for secure, temporary access to Azure Blob Storage files
 */
export interface AzureSASConfig {
  accountName: string;
  accountKey: string;
  containerName: string;
}

export interface SASOptions {
  expiryMinutes?: number;  // How long the SAS token is valid (default: 1 minute for immediate use)
  permissions?: string;     // Default: 'r' (read-only)
}

export class AzureSASService {
  private accountName: string;
  private accountKey: string;
  private containerName: string;
  private sharedKeyCredential: StorageSharedKeyCredential;
  private blobServiceClient: BlobServiceClient;

  constructor(config: AzureSASConfig) {
    this.accountName = config.accountName;
    this.accountKey = config.accountKey;
    this.containerName = config.containerName;

    // Initialize credentials
    this.sharedKeyCredential = new StorageSharedKeyCredential(
      this.accountName,
      this.accountKey
    );

    // Initialize blob service client
    this.blobServiceClient = new BlobServiceClient(
      `https://${this.accountName}.blob.core.windows.net`,
      this.sharedKeyCredential
    );

    console.log('✅ Azure SAS Service initialized');
    console.log(`  📦 Container: ${this.containerName}`);
    console.log(`  🏢 Account: ${this.accountName}`);
  }

  /**
   * Generate a time-limited SAS URL for a blob
   * @param blobPath - The path to the blob in Azure (e.g., "user_id/file.pdf")
   * @param options - SAS options (expiry time, permissions)
   * @returns Complete URL with SAS token
   */
  async generateSASUrl(blobPath: string, options: SASOptions = {}): Promise<string> {
    const {
      expiryMinutes = 1,  // Default: 60 seconds for immediate redirection use
      permissions = 'r'    // Default: read-only
    } = options;

    try {
      // Remove leading slash if present
      const cleanBlobPath = blobPath.startsWith('/') ? blobPath.substring(1) : blobPath;
      
      // Get container client
      const containerClient = this.blobServiceClient.getContainerClient(this.containerName);
      
      // Get blob client
      const blobClient = containerClient.getBlobClient(cleanBlobPath);

      // Check if blob exists
      const exists = await blobClient.exists();
      if (!exists) {
        throw new Error(`Blob not found: ${cleanBlobPath}`);
      }

      // Set SAS token expiry time
      // Subtract 10 minutes from start time to account for clock skew between server and Azure
      const startsOn = new Date(Date.now() - 10 * 60 * 1000);
      const expiresOn = new Date(Date.now() + expiryMinutes * 60 * 1000);

      // Configure SAS permissions
      const blobSASPermissions = new BlobSASPermissions();
      if (permissions.includes('r')) blobSASPermissions.read = true;
      if (permissions.includes('w')) blobSASPermissions.write = true;
      if (permissions.includes('d')) blobSASPermissions.delete = true;

      // Generate SAS token
      const sasToken = generateBlobSASQueryParameters(
        {
          containerName: this.containerName,
          blobName: cleanBlobPath,
          permissions: blobSASPermissions,
          startsOn,
          expiresOn,
          protocol: SASProtocol.Https, // Force HTTPS only
        },
        this.sharedKeyCredential
      ).toString();

      // Construct the complete SAS URL
      const sasUrl = `${blobClient.url}?${sasToken}`;

      console.log('🔐 Generated SAS URL:');
      console.log(`  📄 Blob: ${cleanBlobPath}`);
      console.log(`  ⏱️  Expires in: ${expiryMinutes} minute(s)`);
      console.log(`  🔑 Permissions: ${permissions}`);

      return sasUrl;
    } catch (error) {
      console.error('❌ Error generating SAS URL:', error);
      throw new Error(`Failed to generate SAS URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate a SAS URL with extended expiry (for sharing purposes)
   * @param blobPath - The path to the blob in Azure
   * @param expiryHours - Number of hours the link should be valid
   * @returns Complete URL with SAS token
   */
  async generateExtendedSASUrl(blobPath: string, expiryHours: number = 24): Promise<string> {
    return this.generateSASUrl(blobPath, {
      expiryMinutes: expiryHours * 60,
      permissions: 'r'
    });
  }

  /**
   * Generate a short-lived SAS URL for immediate redirection
   * This is used in the GET /s/:short_code endpoint
   * @param blobPath - The path to the blob in Azure
   * @returns Complete URL with 60-second SAS token
   */
  async generateRedirectSASUrl(blobPath: string): Promise<string> {
    return this.generateSASUrl(blobPath, {
      expiryMinutes: 1, // 60 seconds - only for immediate use
      permissions: 'r'
    });
  }

  /**
   * Validate if a blob exists in Azure Storage
   * @param blobPath - The path to check
   * @returns true if blob exists, false otherwise
   */
  async blobExists(blobPath: string): Promise<boolean> {
    try {
      const cleanBlobPath = blobPath.startsWith('/') ? blobPath.substring(1) : blobPath;
      const containerClient = this.blobServiceClient.getContainerClient(this.containerName);
      const blobClient = containerClient.getBlobClient(cleanBlobPath);
      return await blobClient.exists();
    } catch (error) {
      console.error('Error checking blob existence:', error);
      return false;
    }
  }

  /**
   * Get blob properties (size, content type, etc.)
   * @param blobPath - The path to the blob
   * @returns Blob properties
   */
  async getBlobProperties(blobPath: string): Promise<any> {
    try {
      const cleanBlobPath = blobPath.startsWith('/') ? blobPath.substring(1) : blobPath;
      const containerClient = this.blobServiceClient.getContainerClient(this.containerName);
      const blobClient = containerClient.getBlobClient(cleanBlobPath);
      const properties = await blobClient.getProperties();
      
      return {
        contentLength: properties.contentLength,
        contentType: properties.contentType,
        lastModified: properties.lastModified,
        metadata: properties.metadata
      };
    } catch (error) {
      console.error('Error getting blob properties:', error);
      throw error;
    }
  }
}

// Singleton instance
let azureSASServiceInstance: AzureSASService | null = null;

/**
 * Initialize the Azure SAS Service with environment configuration
 */
export function initializeAzureSASService(): AzureSASService {
  if (!azureSASServiceInstance) {
    const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME;
    const accountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY;
    const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME;

    if (!accountName || !accountKey || !containerName) {
      throw new Error('Azure Storage configuration missing. Please check your .env file.');
    }

    azureSASServiceInstance = new AzureSASService({
      accountName,
      accountKey,
      containerName
    });
  }

  return azureSASServiceInstance;
}

/**
 * Get the singleton instance of Azure SAS Service
 */
export function getAzureSASService(): AzureSASService {
  if (!azureSASServiceInstance) {
    return initializeAzureSASService();
  }
  return azureSASServiceInstance;
}

export default AzureSASService;
