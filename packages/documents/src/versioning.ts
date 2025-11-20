/**
 * Document versioning service
 */

import { prisma } from '@arcqubit/database';
import { VersionInfo } from './types';
import { copyInStorage, generateStoragePath } from './storage';

/**
 * Create new version of a document
 */
export async function createVersion(
  documentId: string,
  tenantId: string,
  userId: string,
  newFileBuffer: Buffer,
  changes?: string
): Promise<VersionInfo> {
  const document = await prisma.document.findFirst({
    where: {
      id: documentId,
      tenantId,
    },
  });

  if (!document) {
    throw new Error('Document not found or access denied');
  }

  // Copy current version to archive
  const archivePath = `${document.storagePath}.v${document.version}`;
  await copyInStorage(document.storagePath, archivePath);

  // Increment version
  const newVersion = document.version + 1;

  // Update document with new version
  await prisma.document.update({
    where: { id: documentId },
    data: {
      version: newVersion,
      fileSize: BigInt(newFileBuffer.length),
      metadata: {
        ...(document.metadata as object),
        versionHistory: [
          ...((document.metadata as any)?.versionHistory || []),
          {
            version: document.version,
            createdAt: new Date().toISOString(),
            createdBy: userId,
            changes,
            archivedPath: archivePath,
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
        action: 'version_created',
        newVersion,
        changes,
      },
    },
  });

  return {
    version: newVersion,
    documentId,
    createdAt: new Date(),
    createdBy: userId,
    changes,
    fileSize: newFileBuffer.length,
    storagePath: document.storagePath,
  };
}

/**
 * Get version history for a document
 */
export async function getVersionHistory(
  documentId: string,
  tenantId: string
): Promise<VersionInfo[]> {
  const document = await prisma.document.findFirst({
    where: {
      id: documentId,
      tenantId,
    },
  });

  if (!document) {
    throw new Error('Document not found or access denied');
  }

  const versionHistory = (document.metadata as any)?.versionHistory || [];

  // Add current version
  const versions: VersionInfo[] = [
    {
      version: document.version,
      documentId: document.id,
      createdAt: document.updatedAt,
      createdBy: document.createdBy,
      fileSize: Number(document.fileSize),
      storagePath: document.storagePath,
    },
    ...versionHistory.map((v: any) => ({
      version: v.version,
      documentId: document.id,
      createdAt: new Date(v.createdAt),
      createdBy: v.createdBy,
      changes: v.changes,
      fileSize: v.fileSize || 0,
      storagePath: v.archivedPath,
    })),
  ];

  return versions.sort((a, b) => b.version - a.version);
}

/**
 * Restore a previous version
 */
export async function restoreVersion(
  documentId: string,
  tenantId: string,
  userId: string,
  versionNumber: number
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

  const versionHistory = (document.metadata as any)?.versionHistory || [];
  const targetVersion = versionHistory.find((v: any) => v.version === versionNumber);

  if (!targetVersion) {
    throw new Error(`Version ${versionNumber} not found`);
  }

  // Copy archived version back to current
  await copyInStorage(targetVersion.archivedPath, document.storagePath);

  // Update document
  await prisma.document.update({
    where: { id: documentId },
    data: {
      version: document.version + 1,
      metadata: {
        ...(document.metadata as object),
        restoredFrom: versionNumber,
        restoredAt: new Date().toISOString(),
        restoredBy: userId,
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
        action: 'version_restored',
        restoredVersion: versionNumber,
      },
    },
  });
}

/**
 * Compare two versions (returns diff summary)
 */
export async function compareVersions(
  documentId: string,
  tenantId: string,
  version1: number,
  version2: number
): Promise<{
  version1: VersionInfo;
  version2: VersionInfo;
  sizeDiff: number;
  timeDiff: number; // milliseconds
}> {
  const versions = await getVersionHistory(documentId, tenantId);

  const v1 = versions.find((v) => v.version === version1);
  const v2 = versions.find((v) => v.version === version2);

  if (!v1 || !v2) {
    throw new Error('Version not found');
  }

  return {
    version1: v1,
    version2: v2,
    sizeDiff: v2.fileSize - v1.fileSize,
    timeDiff: v2.createdAt.getTime() - v1.createdAt.getTime(),
  };
}
