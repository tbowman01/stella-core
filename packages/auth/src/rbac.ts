/**
 * Role-Based Access Control (RBAC)
 */

import { UserRole, DocumentClassification } from '@arcqubit/shared';
import { hasRole, canAccessClassification } from '@arcqubit/shared';
import { Permission, AuthContext } from './types';

/**
 * Role hierarchy (higher index = more privilege)
 */
const ROLE_HIERARCHY: UserRole[] = ['viewer', 'contributor', 'manager', 'admin'];

/**
 * Permission matrix for each role
 */
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  viewer: [
    { resource: 'document', action: 'read' },
    { resource: 'workspace', action: 'read' },
  ],
  contributor: [
    { resource: 'document', action: 'read' },
    { resource: 'document', action: 'create' },
    { resource: 'document', action: 'update' },
    { resource: 'workspace', action: 'read' },
    { resource: 'ai', action: 'execute' },
    { resource: 'search', action: 'execute' },
  ],
  manager: [
    { resource: 'document', action: 'read' },
    { resource: 'document', action: 'create' },
    { resource: 'document', action: 'update' },
    { resource: 'document', action: 'delete' },
    { resource: 'workspace', action: 'read' },
    { resource: 'workspace', action: 'create' },
    { resource: 'workspace', action: 'update' },
    { resource: 'compliance', action: 'read' },
    { resource: 'compliance', action: 'update' },
    { resource: 'ai', action: 'execute' },
    { resource: 'search', action: 'execute' },
  ],
  admin: [
    { resource: '*', action: 'create' },
    { resource: '*', action: 'read' },
    { resource: '*', action: 'update' },
    { resource: '*', action: 'delete' },
    { resource: '*', action: 'execute' },
  ],
};

/**
 * Get permissions for a role
 */
export function getPermissionsForRole(role: UserRole): Permission[] {
  return ROLE_PERMISSIONS[role] || [];
}

/**
 * Check if a role has a specific permission
 */
export function hasPermission(
  role: UserRole,
  resource: string,
  action: Permission['action']
): boolean {
  const permissions = getPermissionsForRole(role);

  // Check for wildcard permission (admin)
  if (permissions.some((p) => p.resource === '*' && p.action === action)) {
    return true;
  }

  // Check for wildcard action on specific resource
  if (permissions.some((p) => p.resource === resource && p.action === '*')) {
    return true;
  }

  // Check for specific permission
  return permissions.some((p) => p.resource === resource && p.action === action);
}

/**
 * Check if user can access a document based on classification
 */
export function canAccessDocument(
  userRole: UserRole,
  userClearance: DocumentClassification,
  documentClassification: DocumentClassification
): boolean {
  // Check role permission first
  if (!hasPermission(userRole, 'document', 'read')) {
    return false;
  }

  // Check classification clearance
  return canAccessClassification(userClearance, documentClassification);
}

/**
 * Check if user can perform action on resource
 */
export function authorize(
  context: AuthContext,
  resource: string,
  action: Permission['action']
): boolean {
  // Check if role has permission
  if (!hasPermission(context.role, resource, action)) {
    return false;
  }

  // Additional checks can be added here (e.g., resource ownership)
  return true;
}

/**
 * Require specific role or higher
 */
export function requireRole(userRole: UserRole, requiredRole: UserRole): boolean {
  return hasRole(userRole, requiredRole);
}

/**
 * Get maximum classification level a user can access
 */
export function getMaxClassificationLevel(role: UserRole): DocumentClassification {
  switch (role) {
    case 'admin':
      return 'restricted';
    case 'manager':
      return 'confidential';
    case 'contributor':
      return 'internal';
    case 'viewer':
      return 'public';
    default:
      return 'public';
  }
}

/**
 * Check if user can export documents
 */
export function canExportDocuments(
  role: UserRole,
  classification: DocumentClassification
): boolean {
  // Only managers and admins can export confidential/restricted
  if (classification === 'restricted' || classification === 'confidential') {
    return hasRole(role, 'manager');
  }

  // Contributors can export internal/public
  return hasRole(role, 'contributor');
}

/**
 * Check if user can manage compliance controls
 */
export function canManageCompliance(role: UserRole): boolean {
  return hasRole(role, 'manager');
}

/**
 * Check if user can configure plugins
 */
export function canConfigurePlugins(role: UserRole): boolean {
  return hasRole(role, 'admin');
}

/**
 * Check if user can manage other users
 */
export function canManageUsers(role: UserRole): boolean {
  return hasRole(role, 'admin');
}

/**
 * Check if user can view audit logs
 */
export function canViewAuditLogs(role: UserRole): boolean {
  return hasRole(role, 'manager');
}
