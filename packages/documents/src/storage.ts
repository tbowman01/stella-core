/**
 * Cloud storage abstraction layer
 * Supports Azure Blob Storage, MinIO, and AWS S3
 */

import { BlobServiceClient, ContainerClient } from '@azure/storage-blob';
import { StorageConfig } from './types';
import { randomString } from '@arcqubit/shared';

let storageClient: ContainerClient | null = null;

/**
 * Initialize storage client
 */
export function initializeStorage(config: StorageConfig): void {
  if (config.provider === 'azure') {
    const connectionString =
      config.connectionString ||
      `DefaultEndpointsProtocol=https;AccountName=${config.accountName};AccountKey=${config.accountKey};EndpointSuffix=core.windows.net`;

    const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
    storageClient = blobServiceClient.getContainerClient(config.containerName || 'documents');
  } else if (config.provider === 'minio') {
    // MinIO uses S3-compatible API
    // In production, use @aws-sdk/client-s3
    throw new Error('MinIO support requires @aws-sdk/client-s3 implementation');
  } else if (config.provider === 's3') {
    throw new Error('S3 support requires @aws-sdk/client-s3 implementation');
  }
}

/**
 * Get storage client
 */
function getStorageClient(): ContainerClient {
  if (!storageClient) {
    // Initialize with environment variables
    const config: StorageConfig = {
      provider: (process.env.STORAGE_PROVIDER as 'azure' | 'minio' | 's3') || 'azure',
      accountName: process.env.AZURE_STORAGE_ACCOUNT_NAME,
      accountKey: process.env.AZURE_STORAGE_ACCOUNT_KEY,
      containerName: process.env.AZURE_STORAGE_CONTAINER_NAME || 'documents',
    };
    initializeStorage(config);
  }

  if (!storageClient) {
    throw new Error('Storage client not initialized');
  }

  return storageClient;
}

/**
 * Generate storage path for a document
 */
export function generateStoragePath(
  tenantId: string,
  workspaceId: string,
  filename: string
): string {
  const timestamp = Date.now();
  const random = randomString(8);
  const sanitizedFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_');

  return `${tenantId}/${workspaceId}/${timestamp}-${random}-${sanitizedFilename}`;
}

/**
 * Upload file to storage
 */
export async function uploadToStorage(
  path: string,
  buffer: Buffer,
  mimeType: string
): Promise<string> {
  const client = getStorageClient();
  const blockBlobClient = client.getBlockBlobClient(path);

  await blockBlobClient.upload(buffer, buffer.length, {
    blobHTTPHeaders: {
      blobContentType: mimeType,
    },
  });

  return blockBlobClient.url;
}

/**
 * Download file from storage
 */
export async function downloadFromStorage(path: string): Promise<Buffer> {
  const client = getStorageClient();
  const blockBlobClient = client.getBlockBlobClient(path);

  const downloadResponse = await blockBlobClient.download(0);

  if (!downloadResponse.readableStreamBody) {
    throw new Error('Failed to download file');
  }

  const chunks: Buffer[] = [];
  for await (const chunk of downloadResponse.readableStreamBody) {
    chunks.push(Buffer.from(chunk));
  }

  return Buffer.concat(chunks);
}

/**
 * Delete file from storage
 */
export async function deleteFromStorage(path: string): Promise<void> {
  const client = getStorageClient();
  const blockBlobClient = client.getBlockBlobClient(path);

  await blockBlobClient.delete();
}

/**
 * Check if file exists in storage
 */
export async function existsInStorage(path: string): Promise<boolean> {
  const client = getStorageClient();
  const blockBlobClient = client.getBlockBlobClient(path);

  return blockBlobClient.exists();
}

/**
 * Get file metadata from storage
 */
export async function getStorageMetadata(path: string): Promise<{
  size: number;
  mimeType: string;
  lastModified: Date;
}> {
  const client = getStorageClient();
  const blockBlobClient = client.getBlockBlobClient(path);

  const properties = await blockBlobClient.getProperties();

  return {
    size: properties.contentLength || 0,
    mimeType: properties.contentType || 'application/octet-stream',
    lastModified: properties.lastModified || new Date(),
  };
}

/**
 * Copy file within storage (for versioning)
 */
export async function copyInStorage(sourcePath: string, destPath: string): Promise<void> {
  const client = getStorageClient();
  const sourceClient = client.getBlockBlobClient(sourcePath);
  const destClient = client.getBlockBlobClient(destPath);

  await destClient.beginCopyFromURL(sourceClient.url);
}

/**
 * List files in a directory
 */
export async function listFiles(prefix: string): Promise<string[]> {
  const client = getStorageClient();
  const files: string[] = [];

  for await (const blob of client.listBlobsFlat({ prefix })) {
    files.push(blob.name);
  }

  return files;
}
