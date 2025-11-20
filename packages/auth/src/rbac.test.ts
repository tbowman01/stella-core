import { describe, it, expect, beforeEach } from 'vitest';
import { hasPermission, getPermissionsForRole, ROLE_PERMISSIONS } from '../src/rbac';

describe('@arcqubit/auth - RBAC', () => {
  describe('hasPermission', () => {
    it('should allow admin all permissions', () => {
      expect(hasPermission('admin', 'document', 'create')).toBe(true);
      expect(hasPermission('admin', 'document', 'read')).toBe(true);
      expect(hasPermission('admin', 'document', 'update')).toBe(true);
      expect(hasPermission('admin', 'document', 'delete')).toBe(true);
      expect(hasPermission('admin', 'user', 'create')).toBe(true);
      expect(hasPermission('admin', 'tenant', 'update')).toBe(true);
    });

    it('should allow manager to manage documents', () => {
      expect(hasPermission('manager', 'document', 'create')).toBe(true);
      expect(hasPermission('manager', 'document', 'read')).toBe(true);
      expect(hasPermission('manager', 'document', 'update')).toBe(true);
      expect(hasPermission('manager', 'document', 'delete')).toBe(true);
    });

    it('should allow manager to manage workspaces', () => {
      expect(hasPermission('manager', 'workspace', 'create')).toBe(true);
      expect(hasPermission('manager', 'workspace', 'update')).toBe(true);
    });

    it('should restrict manager from user management', () => {
      expect(hasPermission('manager', 'user', 'create')).toBe(false);
      expect(hasPermission('manager', 'user', 'delete')).toBe(false);
    });

    it('should allow contributor to create and update documents', () => {
      expect(hasPermission('contributor', 'document', 'create')).toBe(true);
      expect(hasPermission('contributor', 'document', 'read')).toBe(true);
      expect(hasPermission('contributor', 'document', 'update')).toBe(true);
    });

    it('should restrict contributor from deleting documents', () => {
      expect(hasPermission('contributor', 'document', 'delete')).toBe(false);
    });

    it('should allow viewer read-only access', () => {
      expect(hasPermission('viewer', 'document', 'read')).toBe(true);
      expect(hasPermission('viewer', 'workspace', 'read')).toBe(true);
      expect(hasPermission('viewer', 'document', 'create')).toBe(false);
      expect(hasPermission('viewer', 'document', 'update')).toBe(false);
      expect(hasPermission('viewer', 'document', 'delete')).toBe(false);
    });

    it('should handle unknown roles gracefully', () => {
      expect(hasPermission('unknown' as any, 'document', 'read')).toBe(false);
    });

    it('should handle unknown resources gracefully', () => {
      // Admin has wildcard permissions so can access any resource
      expect(hasPermission('admin', 'unknown' as any, 'read')).toBe(true);
      // Non-admin roles should not have access to unknown resources
      expect(hasPermission('viewer', 'unknown' as any, 'read')).toBe(false);
    });

    it('should handle unknown actions gracefully', () => {
      // Even admin cannot perform unknown actions (only defined actions are allowed)
      expect(hasPermission('admin', 'document', 'unknown' as any)).toBe(false);
      expect(hasPermission('viewer', 'document', 'unknown' as any)).toBe(false);
    });
  });

  describe('getPermissionsForRole', () => {
    it('should return all permissions for admin', () => {
      const permissions = getPermissionsForRole('admin');

      expect(permissions).toBeDefined();
      expect(permissions).toBeInstanceOf(Array);
      expect(permissions.some(p => p.resource === '*' && p.action === 'create')).toBe(true);
      expect(permissions.some(p => p.resource === '*' && p.action === 'read')).toBe(true);
      expect(permissions.some(p => p.resource === '*' && p.action === 'update')).toBe(true);
      expect(permissions.some(p => p.resource === '*' && p.action === 'delete')).toBe(true);
    });

    it('should return limited permissions for viewer', () => {
      const permissions = getPermissionsForRole('viewer');

      expect(permissions).toBeDefined();
      expect(permissions).toBeInstanceOf(Array);
      expect(permissions.some(p => p.resource === 'document' && p.action === 'read')).toBe(true);
      expect(permissions.some(p => p.resource === 'document' && p.action === 'create')).toBe(false);
      expect(permissions.some(p => p.resource === 'document' && p.action === 'update')).toBe(false);
      expect(permissions.some(p => p.resource === 'document' && p.action === 'delete')).toBe(false);
    });

    it('should return empty permissions for unknown role', () => {
      const permissions = getPermissionsForRole('unknown' as any);

      expect(permissions).toEqual([]);
    });
  });

  describe('ROLE_PERMISSIONS structure', () => {
    it('should have permissions for all standard roles', () => {
      expect(ROLE_PERMISSIONS.admin).toBeDefined();
      expect(ROLE_PERMISSIONS.manager).toBeDefined();
      expect(ROLE_PERMISSIONS.contributor).toBeDefined();
      expect(ROLE_PERMISSIONS.viewer).toBeDefined();
    });

    it('should have array of permissions for each role', () => {
      expect(Array.isArray(ROLE_PERMISSIONS.admin)).toBe(true);
      expect(Array.isArray(ROLE_PERMISSIONS.manager)).toBe(true);
      expect(Array.isArray(ROLE_PERMISSIONS.contributor)).toBe(true);
      expect(Array.isArray(ROLE_PERMISSIONS.viewer)).toBe(true);
    });

    it('should have permissions with resource and action properties', () => {
      const adminPerms = ROLE_PERMISSIONS.admin;
      expect(adminPerms.length).toBeGreaterThan(0);
      adminPerms.forEach(perm => {
        expect(perm).toHaveProperty('resource');
        expect(perm).toHaveProperty('action');
      });
    });
  });
});
