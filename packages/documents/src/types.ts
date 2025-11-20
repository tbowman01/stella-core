/**
 * Document management types
 */

export interface UploadOptions {
  tenantId: string;
  workspaceId: string;
  userId: string;
  file: {
    name: string;
    buffer: Buffer;
    mimeType: string;
    size: number;
  };
  classification?: 'public' | 'internal' | 'confidential' | 'restricted';
  metadata?: Record<string, unknown>;
  encrypt?: boolean;
}

export interface UploadResult {
  documentId: string;
  name: string;
  storagePath: string;
  fileSize: number;
  fileType: string;
  classification: string;
  encrypted: boolean;
  version: number;
}

export interface DownloadOptions {
  documentId: string;
  userId: string;
  tenantId: string;
  version?: number;
  watermark?: boolean;
}

export interface DownloadResult {
  buffer: Buffer;
  mimeType: string;
  filename: string;
  watermarked: boolean;
}

export interface ExtractionResult {
  text: string;
  metadata: {
    title?: string;
    author?: string;
    pages?: number;
    createdDate?: Date;
    modifiedDate?: Date;
    wordCount?: number;
  };
  language?: string;
}

export interface VersionInfo {
  version: number;
  documentId: string;
  createdAt: Date;
  createdBy: string;
  changes?: string;
  fileSize: number;
  storagePath: string;
}

export interface ClassificationResult {
  classification: 'public' | 'internal' | 'confidential' | 'restricted';
  confidence: number;
  reasons: string[];
  detectedPHI: boolean;
  detectedPII: boolean;
}

export interface StorageConfig {
  provider: 'azure' | 'minio' | 's3';
  connectionString?: string;
  accountName?: string;
  accountKey?: string;
  containerName?: string;
  endpoint?: string;
  accessKey?: string;
  secretKey?: string;
  bucket?: string;
  region?: string;
}
