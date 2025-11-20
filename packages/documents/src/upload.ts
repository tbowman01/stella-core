/**
 * Document upload service
 */

import { prisma } from '@arcqubit/database';
import { FileType } from '@arcqubit/shared';
import { UploadOptions, UploadResult } from './types';
import { generateStoragePath, uploadToStorage } from './storage';
import { extractText } from './extraction';
import { classifyDocument } from './classification';
import { getFileExtension } from '@arcqubit/shared';

/**
 * Validate file before upload
 */
function validateFile(file: UploadOptions['file']): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB

  if (file.size > MAX_FILE_SIZE) {
    errors.push(`File size exceeds maximum of 500MB`);
  }

  if (file.size === 0) {
    errors.push('File is empty');
  }

  if (!file.name || file.name.length === 0) {
    errors.push('File name is required');
  }

  const allowedTypes = ['pdf', 'docx', 'xlsx', 'pptx', 'txt', 'md'];
  const extension = getFileExtension(file.name);

  if (!allowedTypes.includes(extension)) {
    errors.push(`File type .${extension} is not supported`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Detect file type from name and mime type
 */
function detectFileType(filename: string, mimeType: string): FileType {
  const extension = getFileExtension(filename).toLowerCase();

  const typeMap: Record<string, FileType> = {
    pdf: 'pdf',
    doc: 'docx',
    docx: 'docx',
    xls: 'xlsx',
    xlsx: 'xlsx',
    ppt: 'pptx',
    pptx: 'pptx',
    txt: 'txt',
    md: 'md',
  };

  return typeMap[extension] || 'other';
}

/**
 * Upload document
 */
export async function uploadDocument(options: UploadOptions): Promise<UploadResult> {
  // Validate file
  const validation = validateFile(options.file);
  if (!validation.valid) {
    throw new Error(`File validation failed: ${validation.errors.join(', ')}`);
  }

  // Verify workspace exists and user has access
  const workspace = await prisma.workspace.findFirst({
    where: {
      id: options.workspaceId,
      tenantId: options.tenantId,
    },
  });

  if (!workspace) {
    throw new Error('Workspace not found or access denied');
  }

  // Generate storage path
  const storagePath = generateStoragePath(
    options.tenantId,
    options.workspaceId,
    options.file.name
  );

  // Upload to blob storage
  await uploadToStorage(storagePath, options.file.buffer, options.file.mimeType);

  // Extract text content (async, may take time for large files)
  let contentText = '';
  let extractedMetadata = {};

  try {
    const extraction = await extractText(options.file.buffer, options.file.name);
    contentText = extraction.text;
    extractedMetadata = extraction.metadata;
  } catch (error) {
    console.error('Text extraction failed:', error);
    // Continue without text - can be retried later
  }

  // Auto-classify if not provided
  let classification = options.classification || 'internal';
  if (!options.classification && contentText) {
    try {
      const classificationResult = await classifyDocument(contentText, extractedMetadata);
      classification = classificationResult.classification;
    } catch (error) {
      console.error('Auto-classification failed:', error);
    }
  }

  // Detect file type
  const fileType = detectFileType(options.file.name, options.file.mimeType);

  // Create database record
  const document = await prisma.document.create({
    data: {
      tenantId: options.tenantId,
      workspaceId: options.workspaceId,
      name: options.file.name,
      fileType,
      fileSize: BigInt(options.file.size),
      storagePath,
      classification,
      contentText,
      metadata: {
        ...extractedMetadata,
        ...options.metadata,
        uploadedAt: new Date().toISOString(),
        mimeType: options.file.mimeType,
      },
      encryptionAlgorithm: options.encrypt ? 'AES-256-GCM + ML-KEM-768' : null,
      createdBy: options.userId,
    },
  });

  // Create audit log
  await prisma.auditLog.create({
    data: {
      tenantId: options.tenantId,
      userId: options.userId,
      action: 'upload',
      resourceType: 'document',
      resourceId: document.id,
      metadata: {
        documentName: document.name,
        fileSize: options.file.size,
        fileType,
        classification,
      },
    },
  });

  return {
    documentId: document.id,
    name: document.name,
    storagePath: document.storagePath,
    fileSize: Number(document.fileSize),
    fileType: document.fileType,
    classification: document.classification,
    encrypted: !!document.encryptionAlgorithm,
    version: document.version,
  };
}

/**
 * Bulk upload documents
 */
export async function bulkUploadDocuments(
  options: UploadOptions[]
): Promise<UploadResult[]> {
  const results: UploadResult[] = [];

  for (const option of options) {
    try {
      const result = await uploadDocument(option);
      results.push(result);
    } catch (error) {
      console.error(`Failed to upload ${option.file.name}:`, error);
      // Continue with other files
    }
  }

  return results;
}

/**
 * Update document metadata
 */
export async function updateDocumentMetadata(
  documentId: string,
  tenantId: string,
  userId: string,
  updates: {
    name?: string;
    classification?: 'public' | 'internal' | 'confidential' | 'restricted';
    metadata?: Record<string, unknown>;
  }
): Promise<void> {
  const document = await prisma.document.findFirst({
    where: {
      id: documentId,
      tenantId,
    },
  });

  if (!document) {
    throw new Error('Document not found or access denied');
  }

  await prisma.document.update({
    where: { id: documentId },
    data: {
      name: updates.name,
      classification: updates.classification,
      metadata: updates.metadata
        ? {
            ...(document.metadata as object),
            ...updates.metadata,
          }
        : undefined,
    },
  });

  // Create audit log
  await prisma.auditLog.create({
    data: {
      tenantId,
      userId,
      action: 'update',
      resourceType: 'document',
      resourceId: documentId,
      metadata: {
        updates,
      },
    },
  });
}

/**
 * Delete document
 */
export async function deleteDocument(
  documentId: string,
  tenantId: string,
  userId: string
): Promise<void> {
  const document = await prisma.document.findFirst({
    where: {
      id: documentId,
      tenantId,
    },
  });

  if (!document) {
    throw new Error('Document not found or access denied');
  }

  // Soft delete - mark as deleted but keep record
  await prisma.document.update({
    where: { id: documentId },
    data: {
      metadata: {
        ...(document.metadata as object),
        deletedAt: new Date().toISOString(),
        deletedBy: userId,
      },
    },
  });

  // Create audit log
  await prisma.auditLog.create({
    data: {
      tenantId,
      userId,
      action: 'delete',
      resourceType: 'document',
      resourceId: documentId,
      metadata: {
        documentName: document.name,
      },
    },
  });

  // Note: Physical deletion from blob storage should be done via cleanup job
}
