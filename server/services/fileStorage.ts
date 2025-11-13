import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import mime from 'mime-types';
import { BlobServiceClient, StorageSharedKeyCredential, BlockBlobClient } from '@azure/storage-blob';

export interface FileStorageConfig {
  storageType: 'local' | 'azure';
  localPath?: string;
  azureConfig?: {
    accountName: string;
    accountKey: string;
    containerName: string;
  };
  baseUrl: string;
}

export interface StoredFile {
  fileId: string;
  fileName: string;
  filePath: string;
  fileUrl: string;
  mimeType: string;
  fileSize: number;
}

export class FileStorageService {
  private config: FileStorageConfig;
  private uploadDir: string;
  private blobServiceClient?: BlobServiceClient;

  constructor(config: FileStorageConfig) {
    this.config = config;
    this.uploadDir = config.localPath || path.join(process.cwd(), 'uploads');
    this.ensureUploadDirectory();
    this.initializeAzureClient();
  }

  private ensureUploadDirectory(): void {
    if (this.config.storageType === 'local' && !fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  private initializeAzureClient(): void {
    if (this.config.storageType === 'azure' && this.config.azureConfig) {
      const { accountName, accountKey, containerName } = this.config.azureConfig;
      
      console.log('🔧 Initializing Azure Blob Storage Client:');
      console.log('  🏢 Account Name:', accountName);
      console.log('  📦 Container Name:', containerName);
      console.log('  🔑 Account Key:', accountKey ? `${accountKey.substring(0, 10)}...` : 'NOT SET');
      
      const sharedKeyCredential = new StorageSharedKeyCredential(accountName, accountKey);
      this.blobServiceClient = new BlobServiceClient(
        `https://${accountName}.blob.core.windows.net`,
        sharedKeyCredential
      );
      
      console.log('✅ Azure Blob Storage Client initialized successfully');
    } else {
      console.log('⚠️ Azure configuration not found, using local storage');
    }
  }

  private generateUniqueFileName(originalName: string): string {
    const ext = path.extname(originalName);
    const baseName = path.basename(originalName, ext);
    const sanitizedBaseName = baseName.replace(/[^a-zA-Z0-9-_]/g, '_');
    const timestamp = Date.now();
    const uuid = randomUUID().substring(0, 8);
    
    return `${sanitizedBaseName}_${timestamp}_${uuid}${ext}`;
  }

  private getMimeType(fileName: string): string {
    return mime.lookup(fileName) || 'application/octet-stream';
  }

  async storeFile(
    buffer: Buffer, 
    originalName: string, 
    uploadMethod: 'drag-drop' | 'choose-files' | 'upload-button'
  ): Promise<StoredFile> {
    const fileId = randomUUID();
    const fileName = this.generateUniqueFileName(originalName);
    const mimeType = this.getMimeType(originalName);
    const fileSize = buffer.length;

    if (this.config.storageType === 'local') {
      return this.storeFileLocally(buffer, fileId, fileName, originalName, mimeType, fileSize, uploadMethod);
    } else if (this.config.storageType === 'azure') {
      return this.storeFileAzure(buffer, fileId, fileName, originalName, mimeType, fileSize, uploadMethod);
    } else {
      throw new Error('Unsupported storage type');
    }
  }

  private async storeFileLocally(
    buffer: Buffer,
    fileId: string,
    fileName: string,
    originalName: string,
    mimeType: string,
    fileSize: number,
    uploadMethod: 'drag-drop' | 'choose-files' | 'upload-button'
  ): Promise<StoredFile> {
    const filePath = path.join(this.uploadDir, fileName);
    
    try {
      fs.writeFileSync(filePath, buffer);
      
      const fileUrl = `${this.config.baseUrl}/uploads/${fileName}`;
      
      return {
        fileId,
        fileName,
        filePath,
        fileUrl,
        mimeType,
        fileSize
      };
    } catch (error) {
      throw new Error(`Failed to store file locally: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async storeFileAzure(
    buffer: Buffer,
    fileId: string,
    fileName: string,
    originalName: string,
    mimeType: string,
    fileSize: number,
    uploadMethod: 'drag-drop' | 'choose-files' | 'upload-button'
  ): Promise<StoredFile> {
    if (!this.blobServiceClient || !this.config.azureConfig) {
      throw new Error('Azure configuration is missing');
    }

    try {
      const containerName = this.config.azureConfig.containerName;
      const blobName = fileName; // Use fileName as blob name
      
      console.log('🔍 Azure Upload Debug Info:');
      console.log('  📦 Container Name:', containerName);
      console.log('  📄 Blob Name:', blobName);
      console.log('  🏷️ Original Name:', originalName);
      console.log('  📊 File Size:', fileSize, 'bytes');
      console.log('  🔗 Account Name:', this.config.azureConfig.accountName);
      
      const containerClient = this.blobServiceClient.getContainerClient(containerName);
      
      // Ensure container exists (no public access)
      console.log('🔧 Creating container if not exists...');
      await containerClient.createIfNotExists();
      console.log('✅ Container ready:', containerName);

      const blockBlobClient = containerClient.getBlockBlobClient(blobName);
      
      console.log('📤 Uploading file to Azure...');
      console.log('  🎯 Full Blob URL:', blockBlobClient.url);
      
      // Upload the file
      await blockBlobClient.upload(buffer, buffer.length, {
        blobHTTPHeaders: {
          blobContentType: mimeType
        },
        metadata: {
          originalName,
          fileId,
          uploadMethod,
          uploadedAt: new Date().toISOString()
        }
      });

      const fileUrl = blockBlobClient.url;
      
      console.log('✅ File uploaded successfully!');
      console.log('  🔗 File URL:', fileUrl);
      
      return {
        fileId,
        fileName,
        filePath: blobName, // For Azure, the file path is just the blob name
        fileUrl,
        mimeType,
        fileSize
      };
    } catch (error) {
      console.error('❌ Azure upload error:', error);
      throw new Error(`Failed to store file in Azure: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async deleteFile(filePath: string): Promise<void> {
    if (this.config.storageType === 'local') {
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (error) {
        throw new Error(`Failed to delete file: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    } else if (this.config.storageType === 'azure') {
      if (!this.blobServiceClient || !this.config.azureConfig) {
        throw new Error('Azure configuration is missing');
      }

      try {
        const containerClient = this.blobServiceClient.getContainerClient(this.config.azureConfig.containerName);
        const blockBlobClient = containerClient.getBlockBlobClient(filePath);
        await blockBlobClient.delete();
      } catch (error) {
        throw new Error(`Failed to delete file from Azure: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    } else {
      throw new Error('Unsupported storage type');
    }
  }

  async getFile(filePath: string): Promise<Buffer> {
    if (this.config.storageType === 'local') {
      try {
        if (!fs.existsSync(filePath)) {
          throw new Error('File not found');
        }
        return fs.readFileSync(filePath);
      } catch (error) {
        throw new Error(`Failed to read file: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    } else if (this.config.storageType === 'azure') {
      if (!this.blobServiceClient || !this.config.azureConfig) {
        throw new Error('Azure configuration is missing');
      }

      try {
        const containerClient = this.blobServiceClient.getContainerClient(this.config.azureConfig.containerName);
        const blockBlobClient = containerClient.getBlockBlobClient(filePath);
        const downloadResponse = await blockBlobClient.download();
        
        if (!downloadResponse.readableStreamBody) {
          throw new Error('File not found in Azure storage');
        }

        const chunks: Buffer[] = [];
        for await (const chunk of downloadResponse.readableStreamBody) {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        }
        
        return Buffer.concat(chunks);
      } catch (error) {
        throw new Error(`Failed to read file from Azure: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    } else {
      throw new Error('Unsupported storage type');
    }
  }

  getFileUrl(fileName: string): string {
    if (this.config.storageType === 'local') {
      return `${this.config.baseUrl}/uploads/${fileName}`;
    } else if (this.config.storageType === 'azure') {
      if (!this.config.azureConfig) {
        throw new Error('Azure configuration is missing');
      }
      return `https://${this.config.azureConfig.accountName}.blob.core.windows.net/${this.config.azureConfig.containerName}/${fileName}`;
    } else {
      throw new Error('Unsupported storage type');
    }
  }

  async listAzureBlobs(): Promise<Array<{ name: string; size: number; lastModified: Date; metadata?: Record<string, string> }>> {
    if (this.config.storageType !== 'azure' || !this.blobServiceClient || !this.config.azureConfig) {
      throw new Error('Azure configuration is missing or storage type is not Azure');
    }

    try {
      const containerClient = this.blobServiceClient.getContainerClient(this.config.azureConfig.containerName);
      const blobs = [];

      for await (const blob of containerClient.listBlobsFlat({ includeMetadata: true })) {
        blobs.push({
          name: blob.name,
          size: blob.properties.contentLength || 0,
          lastModified: blob.properties.lastModified || new Date(),
          metadata: blob.metadata
        });
      }

      return blobs;
    } catch (error) {
      throw new Error(`Failed to list Azure blobs: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

// Function to create configuration (called after env is loaded)
function createFileStorageConfig(): FileStorageConfig {
  console.log('🔍 Environment Variables Check:');
  console.log('  STORAGE_TYPE:', process.env.STORAGE_TYPE);
  console.log('  AZURE_STORAGE_ACCOUNT_NAME:', process.env.AZURE_STORAGE_ACCOUNT_NAME);
  console.log('  AZURE_STORAGE_ACCOUNT_KEY:', process.env.AZURE_STORAGE_ACCOUNT_KEY ? `${process.env.AZURE_STORAGE_ACCOUNT_KEY.substring(0, 10)}...` : 'NOT SET');
  console.log('  AZURE_STORAGE_CONTAINER_NAME:', process.env.AZURE_STORAGE_CONTAINER_NAME);

  const config: FileStorageConfig = {
    storageType: (process.env.STORAGE_TYPE as 'local' | 'azure') || 'local',
    localPath: path.join(process.cwd(), 'uploads'),
    baseUrl: process.env.BASE_URL || 'http://localhost:5000',
    azureConfig: process.env.STORAGE_TYPE === 'azure' ? {
      accountName: process.env.AZURE_STORAGE_ACCOUNT_NAME || '',
      accountKey: process.env.AZURE_STORAGE_ACCOUNT_KEY || '',
      containerName: process.env.AZURE_STORAGE_CONTAINER_NAME || 'linksecure-files'
    } : undefined
  };

  console.log('🔧 File Storage Configuration:');
  console.log('  Storage Type:', config.storageType);
  console.log('  Azure Config:', config.azureConfig ? 'Present' : 'Missing');
  
  return config;
}

// Initialize service with lazy loading
let _fileStorageService: FileStorageService | null = null;

export const fileStorageService = {
  get instance(): FileStorageService {
    if (!_fileStorageService) {
      const config = createFileStorageConfig();
      _fileStorageService = new FileStorageService(config);
    }
    return _fileStorageService;
  },
  
  // Delegate all methods to the instance
  async storeFile(buffer: Buffer, originalName: string, uploadMethod: 'drag-drop' | 'choose-files' | 'upload-button'): Promise<StoredFile> {
    return this.instance.storeFile(buffer, originalName, uploadMethod);
  },
  
  async deleteFile(filePath: string): Promise<void> {
    return this.instance.deleteFile(filePath);
  },
  
  async getFile(filePath: string): Promise<Buffer> {
    return this.instance.getFile(filePath);
  },
  
  getFileUrl(fileName: string): string {
    return this.instance.getFileUrl(fileName);
  },

  async listAzureBlobs() {
    return this.instance.listAzureBlobs();
  }
};
