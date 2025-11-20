/**
 * Workspace management operations
 */

import { prisma } from '@arcqubit/database';
import { DocumentClassification } from '@arcqubit/shared';
import { Workspace, WorkspaceWithChildren } from './types';

/**
 * Create workspace
 */
export async function createWorkspace(params: {
  tenantId: string;
  name: string;
  description?: string;
  parentId?: string;
  classification?: DocumentClassification;
  metadata?: Record<string, unknown>;
  createdBy: string;
}): Promise<Workspace> {
  // Verify parent exists if specified
  if (params.parentId) {
    const parent = await prisma.workspace.findFirst({
      where: {
        id: params.parentId,
        tenantId: params.tenantId,
      },
    });

    if (!parent) {
      throw new Error('Parent workspace not found');
    }
  }

  const workspace = await prisma.workspace.create({
    data: {
      tenantId: params.tenantId,
      name: params.name,
      description: params.description,
      parentId: params.parentId,
      classification: params.classification || 'internal',
      metadata: params.metadata || {},
      createdBy: params.createdBy,
    },
  });

  // Create audit log
  await prisma.auditLog.create({
    data: {
      tenantId: params.tenantId,
      userId: params.createdBy,
      action: 'create_workspace',
      resourceType: 'workspace',
      resourceId: workspace.id,
      metadata: {
        workspaceName: workspace.name,
        parentId: params.parentId,
      },
    },
  });

  return {
    ...workspace,
    description: workspace.description || undefined,
    parentId: workspace.parentId || undefined,
  };
}

/**
 * Get workspace by ID
 */
export async function getWorkspace(
  workspaceId: string,
  tenantId: string
): Promise<Workspace | null> {
  const workspace = await prisma.workspace.findFirst({
    where: {
      id: workspaceId,
      tenantId,
    },
  });

  if (!workspace) {
    return null;
  }

  return {
    ...workspace,
    description: workspace.description || undefined,
    parentId: workspace.parentId || undefined,
  };
}

/**
 * List workspaces for tenant
 */
export async function listWorkspaces(
  tenantId: string,
  options: {
    parentId?: string | null;
    includeChildren?: boolean;
    classification?: DocumentClassification;
  } = {}
): Promise<Workspace[]> {
  const where: any = { tenantId };

  if (options.parentId !== undefined) {
    where.parentId = options.parentId;
  }

  if (options.classification) {
    where.classification = options.classification;
  }

  const workspaces = await prisma.workspace.findMany({
    where,
    orderBy: { name: 'asc' },
  });

  return workspaces.map((w) => ({
    ...w,
    description: w.description || undefined,
    parentId: w.parentId || undefined,
  }));
}

/**
 * Update workspace
 */
export async function updateWorkspace(
  workspaceId: string,
  tenantId: string,
  userId: string,
  updates: {
    name?: string;
    description?: string;
    classification?: DocumentClassification;
    metadata?: Record<string, unknown>;
  }
): Promise<Workspace> {
  const workspace = await prisma.workspace.findFirst({
    where: { id: workspaceId, tenantId },
  });

  if (!workspace) {
    throw new Error('Workspace not found');
  }

  const updated = await prisma.workspace.update({
    where: { id: workspaceId },
    data: {
      name: updates.name,
      description: updates.description,
      classification: updates.classification,
      metadata: updates.metadata
        ? {
            ...(workspace.metadata as object),
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
      resourceType: 'workspace',
      resourceId: workspaceId,
      metadata: { updates },
    },
  });

  return {
    ...updated,
    description: updated.description || undefined,
    parentId: updated.parentId || undefined,
  };
}

/**
 * Delete workspace
 */
export async function deleteWorkspace(
  workspaceId: string,
  tenantId: string,
  userId: string
): Promise<void> {
  const workspace = await prisma.workspace.findFirst({
    where: { id: workspaceId, tenantId },
    include: {
      children: true,
      documents: true,
    },
  });

  if (!workspace) {
    throw new Error('Workspace not found');
  }

  // Check if workspace has children
  if (workspace.children.length > 0) {
    throw new Error('Cannot delete workspace with children. Delete children first.');
  }

  // Check if workspace has documents
  if (workspace.documents.length > 0) {
    throw new Error('Cannot delete workspace with documents. Move or delete documents first.');
  }

  await prisma.workspace.delete({
    where: { id: workspaceId },
  });

  // Create audit log
  await prisma.auditLog.create({
    data: {
      tenantId,
      userId,
      action: 'delete',
      resourceType: 'workspace',
      resourceId: workspaceId,
      metadata: {
        workspaceName: workspace.name,
      },
    },
  });
}

/**
 * Move workspace to new parent
 */
export async function moveWorkspace(
  workspaceId: string,
  newParentId: string | null,
  tenantId: string,
  userId: string
): Promise<void> {
  // Verify workspace exists
  const workspace = await prisma.workspace.findFirst({
    where: { id: workspaceId, tenantId },
  });

  if (!workspace) {
    throw new Error('Workspace not found');
  }

  // Verify new parent exists (if not null)
  if (newParentId) {
    const newParent = await prisma.workspace.findFirst({
      where: { id: newParentId, tenantId },
    });

    if (!newParent) {
      throw new Error('New parent workspace not found');
    }

    // Check for circular reference
    const isCircular = await wouldCreateCircularReference(workspaceId, newParentId, tenantId);
    if (isCircular) {
      throw new Error('Cannot move workspace - would create circular reference');
    }
  }

  await prisma.workspace.update({
    where: { id: workspaceId },
    data: { parentId: newParentId },
  });

  // Create audit log
  await prisma.auditLog.create({
    data: {
      tenantId,
      userId,
      action: 'update',
      resourceType: 'workspace',
      resourceId: workspaceId,
      metadata: {
        action: 'moved',
        oldParentId: workspace.parentId,
        newParentId,
      },
    },
  });
}

/**
 * Check if moving workspace would create circular reference
 */
async function wouldCreateCircularReference(
  workspaceId: string,
  newParentId: string,
  tenantId: string
): Promise<boolean> {
  let currentId: string | null = newParentId;

  // Walk up the tree
  while (currentId) {
    if (currentId === workspaceId) {
      return true; // Circular reference detected
    }

    const parent = await prisma.workspace.findFirst({
      where: { id: currentId, tenantId },
      select: { parentId: true },
    });

    currentId = parent?.parentId || null;
  }

  return false;
}

/**
 * Get workspace statistics
 */
export async function getWorkspaceStats(
  workspaceId: string,
  tenantId: string
): Promise<{
  documentCount: number;
  totalSize: bigint;
  childWorkspaceCount: number;
}> {
  const [documents, children] = await Promise.all([
    prisma.document.findMany({
      where: { workspaceId, tenantId },
      select: { fileSize: true },
    }),
    prisma.workspace.count({
      where: { parentId: workspaceId, tenantId },
    }),
  ]);

  const totalSize = documents.reduce((sum, doc) => sum + doc.fileSize, BigInt(0));

  return {
    documentCount: documents.length,
    totalSize,
    childWorkspaceCount: children,
  };
}
