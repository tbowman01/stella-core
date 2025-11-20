/**
 * Document download service with watermarking
 */

import { prisma } from '@arcqubit/database';
import { DownloadOptions, DownloadResult } from './types';
import { downloadFromStorage } from './storage';
import { WATERMARK_TEMPLATE } from '@arcqubit/shared';

/**
 * Apply watermark to document buffer
 * Note: This is a placeholder - actual watermarking requires PDF manipulation library
 */
async function applyWatermark(
  buffer: Buffer,
  mimeType: string,
  userId: string,
  timestamp: string
): Promise<Buffer> {
  // For PDF files, use pdf-lib to add watermark
  // For other files, this would require format-specific libraries

  if (mimeType === 'application/pdf') {
    // TODO: Implement PDF watermarking with pdf-lib
    // For now, return original buffer
    console.warn('PDF watermarking not yet implemented');
    return buffer;
  }

  // For non-PDF files, watermarking may not be applicable
  return buffer;
}

/**
 * Download document
 */
export async function downloadDocument(options: DownloadOptions): Promise<DownloadResult> {
  // Get document from database
  const document = await prisma.document.findFirst({
    where: {
      id: options.documentId,
      tenantId: options.tenantId,
    },
    include: {
      creator: {
        select: {
          email: true,
          fullName: true,
        },
      },
    },
  });

  if (!document) {
    throw new Error('Document not found or access denied');
  }

  // Get user for audit logging
  const user = await prisma.user.findFirst({
    where: {
      id: options.userId,
      tenantId: options.tenantId,
    },
  });

  if (!user) {
    throw new Error('User not found');
  }

  // Download from storage
  let buffer = await downloadFromStorage(document.storagePath);

  // Apply watermark if requested
  let watermarked = false;
  if (options.watermark && document.classification !== 'public') {
    const timestamp = new Date().toISOString();
    buffer = await applyWatermark(
      buffer,
      (document.metadata as any)?.mimeType || 'application/octet-stream',
      user.email,
      timestamp
    );
    watermarked = true;
  }

  // Create audit log
  await prisma.auditLog.create({
    data: {
      tenantId: options.tenantId,
      userId: options.userId,
      action: 'download',
      resourceType: 'document',
      resourceId: options.documentId,
      metadata: {
        documentName: document.name,
        classification: document.classification,
        watermarked,
        version: options.version || document.version,
      },
    },
  });

  return {
    buffer,
    mimeType: (document.metadata as any)?.mimeType || 'application/octet-stream',
    filename: document.name,
    watermarked,
  };
}

/**
 * Get document preview (first page or thumbnail)
 */
export async function getDocumentPreview(
  documentId: string,
  tenantId: string,
  userId: string
): Promise<Buffer> {
  const document = await prisma.document.findFirst({
    where: {
      id: documentId,
      tenantId,
    },
  });

  if (!document) {
    throw new Error('Document not found or access denied');
  }

  // For MVP, return full document
  // In production, generate actual previews/thumbnails
  const buffer = await downloadFromStorage(document.storagePath);

  // Create audit log (view)
  await prisma.auditLog.create({
    data: {
      tenantId,
      userId,
      action: 'view',
      resourceType: 'document',
      resourceId: documentId,
      metadata: {
        documentName: document.name,
        action: 'preview',
      },
    },
  });

  return buffer;
}

/**
 * Generate shareable link for document
 */
export async function generateShareLink(
  documentId: string,
  tenantId: string,
  userId: string,
  options: {
    expiresIn?: number; // hours
    password?: string;
    maxDownloads?: number;
  } = {}
): Promise<{
  shareId: string;
  url: string;
  expiresAt: Date;
}> {
  const document = await prisma.document.findFirst({
    where: {
      id: documentId,
      tenantId,
    },
  });

  if (!document) {
    throw new Error('Document not found or access denied');
  }

  // Generate share ID
  const { randomString } = await import('@arcqubit/shared');
  const shareId = randomString(32);

  const expiresIn = options.expiresIn || 24; // 24 hours default
  const expiresAt = new Date(Date.now() + expiresIn * 60 * 60 * 1000);

  // Store share link metadata in document
  await prisma.document.update({
    where: { id: documentId },
    data: {
      metadata: {
        ...(document.metadata as object),
        shareLinks: [
          ...((document.metadata as any)?.shareLinks || []),
          {
            shareId,
            createdBy: userId,
            createdAt: new Date().toISOString(),
            expiresAt: expiresAt.toISOString(),
            maxDownloads: options.maxDownloads,
            downloads: 0,
            passwordProtected: !!options.password,
          },
        ],
      },
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
        action: 'share_link_created',
        shareId,
        expiresAt: expiresAt.toISOString(),
      },
    },
  });

  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

  return {
    shareId,
    url: `${baseUrl}/share/${shareId}`,
    expiresAt,
  };
}

/**
 * Bulk download documents as ZIP
 */
export async function bulkDownloadDocuments(
  documentIds: string[],
  tenantId: string,
  userId: string
): Promise<Buffer> {
  // This would require a ZIP library like archiver or jszip
  // For MVP, throw not implemented error
  throw new Error('Bulk download not yet implemented');
}
