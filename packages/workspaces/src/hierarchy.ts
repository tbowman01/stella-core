/**
 * Workspace hierarchy operations
 */

import { prisma } from '@arcqubit/database';
import { WorkspaceWithChildren } from './types';

/**
 * Build workspace tree
 */
export async function buildWorkspaceTree(
  tenantId: string,
  rootId?: string
): Promise<WorkspaceWithChildren[]> {
  const workspaces = await prisma.workspace.findMany({
    where: { tenantId },
    include: {
      _count: {
        select: { documents: true },
      },
    },
    orderBy: { name: 'asc' },
  });

  const workspaceMap = new Map<string, WorkspaceWithChildren>();

  // Convert to WorkspaceWithChildren
  workspaces.forEach((w) => {
    workspaceMap.set(w.id, {
      ...w,
      description: w.description || undefined,
      parentId: w.parentId || undefined,
      children: [],
      documentCount: w._count.documents,
    });
  });

  // Build tree
  const roots: WorkspaceWithChildren[] = [];

  workspaces.forEach((w) => {
    const workspace = workspaceMap.get(w.id)!;

    if (!w.parentId || (rootId && w.parentId === rootId)) {
      roots.push(workspace);
    } else {
      const parent = workspaceMap.get(w.parentId);
      if (parent) {
        parent.children.push(workspace);
      }
    }
  });

  return rootId ? workspaceMap.get(rootId)?.children || [] : roots;
}

/**
 * Get workspace path (breadcrumb)
 */
export async function getWorkspacePath(
  workspaceId: string,
  tenantId: string
): Promise<Array<{ id: string; name: string }>> {
  const path: Array<{ id: string; name: string }> = [];

  let currentId: string | null = workspaceId;

  while (currentId) {
    const workspace = await prisma.workspace.findFirst({
      where: { id: currentId, tenantId },
      select: { id: true, name: true, parentId: true },
    });

    if (!workspace) break;

    path.unshift({ id: workspace.id, name: workspace.name });
    currentId = workspace.parentId;
  }

  return path;
}

/**
 * Get all descendant workspace IDs
 */
export async function getDescendantWorkspaceIds(
  workspaceId: string,
  tenantId: string
): Promise<string[]> {
  const descendants: string[] = [];

  const children = await prisma.workspace.findMany({
    where: { parentId: workspaceId, tenantId },
    select: { id: true },
  });

  for (const child of children) {
    descendants.push(child.id);

    // Recursively get children's descendants
    const childDescendants = await getDescendantWorkspaceIds(child.id, tenantId);
    descendants.push(...childDescendants);
  }

  return descendants;
}

/**
 * Count total documents in workspace and children
 */
export async function countDocumentsRecursive(
  workspaceId: string,
  tenantId: string
): Promise<number> {
  const workspaceIds = [workspaceId, ...(await getDescendantWorkspaceIds(workspaceId, tenantId))];

  const count = await prisma.document.count({
    where: {
      workspaceId: { in: workspaceIds },
      tenantId,
    },
  });

  return count;
}

/**
 * Flatten workspace tree
 */
export function flattenWorkspaceTree(tree: WorkspaceWithChildren[]): WorkspaceWithChildren[] {
  const flat: WorkspaceWithChildren[] = [];

  function traverse(nodes: WorkspaceWithChildren[]) {
    for (const node of nodes) {
      flat.push(node);
      if (node.children.length > 0) {
        traverse(node.children);
      }
    }
  }

  traverse(tree);
  return flat;
}

/**
 * Get workspace level (depth in tree)
 */
export async function getWorkspaceLevel(workspaceId: string, tenantId: string): Promise<number> {
  let level = 0;
  let currentId: string | null = workspaceId;

  while (currentId) {
    const workspace = await prisma.workspace.findFirst({
      where: { id: currentId, tenantId },
      select: { parentId: true },
    });

    if (!workspace || !workspace.parentId) break;

    level++;
    currentId = workspace.parentId;
  }

  return level;
}
