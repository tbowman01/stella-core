import { describe, it, expect } from 'vitest';
import { createMockTenant, createMockUser, createMockDocument, createMockWorkspace } from './utils';

describe('Test Utilities', () => {
  describe('createMockTenant', () => {
    it('should create mock tenant with defaults', () => {
      const tenant = createMockTenant();

      expect(tenant.id).toBeDefined();
      expect(tenant.name).toBe('Test Tenant');
      expect(tenant.slug).toBe('test-tenant');
      expect(tenant.plan).toBe('enterprise');
      expect(tenant.createdAt).toBeInstanceOf(Date);
    });

    it('should allow overriding defaults', () => {
      const tenant = createMockTenant({
        name: 'Custom Tenant',
        plan: 'pro',
      });

      expect(tenant.name).toBe('Custom Tenant');
      expect(tenant.plan).toBe('pro');
    });
  });

  describe('createMockUser', () => {
    it('should create mock user with defaults', () => {
      const user = createMockUser();

      expect(user.id).toBeDefined();
      expect(user.email).toBe('test@example.com');
      expect(user.name).toBe('Test User');
      expect(user.role).toBe('contributor');
      expect(user.emailVerified).toBe(true);
    });

    it('should allow overriding defaults', () => {
      const user = createMockUser({
        email: 'custom@example.com',
        role: 'admin',
      });

      expect(user.email).toBe('custom@example.com');
      expect(user.role).toBe('admin');
    });
  });

  describe('createMockDocument', () => {
    it('should create mock document with defaults', () => {
      const document = createMockDocument();

      expect(document.id).toBeDefined();
      expect(document.name).toBe('test-document.pdf');
      expect(document.fileType).toBe('application/pdf');
      expect(document.classification).toBe('internal');
      expect(document.version).toBe(1);
    });

    it('should allow overriding defaults', () => {
      const document = createMockDocument({
        name: 'custom.docx',
        classification: 'confidential',
      });

      expect(document.name).toBe('custom.docx');
      expect(document.classification).toBe('confidential');
    });
  });

  describe('createMockWorkspace', () => {
    it('should create mock workspace with defaults', () => {
      const workspace = createMockWorkspace();

      expect(workspace.id).toBeDefined();
      expect(workspace.name).toBe('Test Workspace');
      expect(workspace.description).toBe('A test workspace');
      expect(workspace.parentId).toBeNull();
    });

    it('should allow overriding defaults', () => {
      const workspace = createMockWorkspace({
        name: 'Custom Workspace',
        parentId: 'parent-123',
      });

      expect(workspace.name).toBe('Custom Workspace');
      expect(workspace.parentId).toBe('parent-123');
    });
  });
});
