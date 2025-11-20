/**
 * Workspace permissions (placeholder for RBAC extension)
 */

import { prisma } from '@arcqubit/database';

/**
 * Check if user has permission to access workspace
 */
export async function canAccessWorkspace(
  userId: string,
  workspaceId: string,
  tenantId: string
): Promise<boolean> {
  // Verify user belongs to tenant
  const user = await prisma.user.findFirst({
    where: { id: userId, tenantId },
  });

  if (!user) {
    return false;
  }

  // Verify workspace exists in tenant
  const workspace = await prisma.workspace.findFirst({
    where: { id: workspaceId, tenantId },
  });

  if (!workspace) {
    return false;
  }

  // For MVP, all users in tenant can access all workspaces
  // In production, implement granular permissions
  return true;
}

/**
 * Check if user can create workspace
 */
export async function canCreateWorkspace(userId: string, tenantId: string): Promise<boolean> {
  const user = await prisma.user.findFirst({
    where: { id: userId, tenantId },
  });

  if (!user) {
    return false;
  }

  // Contributors and above can create workspaces
  return ['contributor', 'manager', 'admin'].includes(user.role);
}

/**
 * Check if user can modify workspace
 */
export async function canModifyWorkspace(
  userId: string,
  workspaceId: string,
  tenantId: string
): Promise<boolean> {
  const user = await prisma.user.findFirst({
    where: { id: userId, tenantId },
  });

  if (!user) {
    return false;
  }

  const workspace = await prisma.workspace.findFirst({
    where: { id: workspaceId, tenantId },
  });

  if (!workspace) {
    return false;
  }

  // Workspace creator, managers, and admins can modify
  if (workspace.createdBy === userId) {
    return true;
  }

  return ['manager', 'admin'].includes(user.role);
}

/**
 * Check if user can delete workspace
 */
export async function canDeleteWorkspace(
  userId: string,
  workspaceId: string,
  tenantId: string
): Promise<boolean> {
  const user = await prisma.user.findFirst({
    where: { id: userId, tenantId },
  });

  if (!user) {
    return false;
  }

  // Only managers and admins can delete
  return ['manager', 'admin'].includes(user.role);
}
