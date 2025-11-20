/**
 * Database Integration Tests
 * Tests real database operations with PostgreSQL and Prisma
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { prisma } from '@arcqubit/database';
import { nanoid } from 'nanoid';

describe('Database Integration Tests', () => {
  let testTenantId: string;
  let testUserId: string;
  let testWorkspaceId: string;

  beforeEach(async () => {
    // Clean up any existing test data
    await prisma.document.deleteMany({});
    await prisma.workspace.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.tenant.deleteMany({});
  });

  describe('Tenant Operations', () => {
    it('should create a tenant with all fields', async () => {
      const tenant = await prisma.tenant.create({
        data: {
          id: nanoid(),
          name: 'Test Corporation',
          slug: 'test-corp',
          pqcEnabled: true,
          settings: {
            maxFileSize: 500000000,
            allowedFileTypes: ['pdf', 'docx'],
          },
        },
      });

      expect(tenant.id).toBeDefined();
      expect(tenant.name).toBe('Test Corporation');
      expect(tenant.slug).toBe('test-corp');
      expect(tenant.pqcEnabled).toBe(true);
      expect(tenant.settings).toHaveProperty('maxFileSize');
      expect(tenant.createdAt).toBeInstanceOf(Date);

      testTenantId = tenant.id;
    });

    it('should enforce unique slug constraint', async () => {
      await prisma.tenant.create({
        data: {
          id: nanoid(),
          name: 'Test Corp 1',
          slug: 'unique-slug',
        },
      });

      await expect(
        prisma.tenant.create({
          data: {
            id: nanoid(),
            name: 'Test Corp 2',
            slug: 'unique-slug', // Duplicate slug
          },
        })
      ).rejects.toThrow();
    });

    it('should update tenant settings', async () => {
      const tenant = await prisma.tenant.create({
        data: {
          id: nanoid(),
          name: 'Update Test Corp',
          slug: 'update-test',
          settings: { version: 1 },
        },
      });

      const updated = await prisma.tenant.update({
        where: { id: tenant.id },
        data: {
          settings: { version: 2, newSetting: true },
        },
      });

      expect(updated.settings).toHaveProperty('version', 2);
      expect(updated.settings).toHaveProperty('newSetting', true);
    });
  });

  describe('User Operations', () => {
    beforeEach(async () => {
      const tenant = await prisma.tenant.create({
        data: {
          id: nanoid(),
          name: 'User Test Corp',
          slug: 'user-test',
        },
      });
      testTenantId = tenant.id;
    });

    it('should create a user with all required fields', async () => {
      const user = await prisma.user.create({
        data: {
          id: nanoid(),
          tenantId: testTenantId,
          email: 'test@example.com',
          passwordHash: '$2a$12$hashed_password',
          fullName: 'Test User',
          role: 'contributor',
        },
      });

      expect(user.id).toBeDefined();
      expect(user.email).toBe('test@example.com');
      expect(user.role).toBe('contributor');
      expect(user.tenantId).toBe(testTenantId);
      expect(user.emailVerified).toBe(false); // Default
      expect(user.mfaEnabled).toBe(false); // Default

      testUserId = user.id;
    });

    it('should enforce unique email per tenant', async () => {
      await prisma.user.create({
        data: {
          id: nanoid(),
          tenantId: testTenantId,
          email: 'duplicate@example.com',
          passwordHash: '$2a$12$hashed',
        },
      });

      await expect(
        prisma.user.create({
          data: {
            id: nanoid(),
            tenantId: testTenantId,
            email: 'duplicate@example.com', // Duplicate in same tenant
            passwordHash: '$2a$12$hashed',
          },
        })
      ).rejects.toThrow();
    });

    it('should allow same email in different tenants', async () => {
      const tenant2 = await prisma.tenant.create({
        data: {
          id: nanoid(),
          name: 'Another Corp',
          slug: 'another-corp',
        },
      });

      await prisma.user.create({
        data: {
          id: nanoid(),
          tenantId: testTenantId,
          email: 'shared@example.com',
          passwordHash: '$2a$12$hashed',
        },
      });

      const user2 = await prisma.user.create({
        data: {
          id: nanoid(),
          tenantId: tenant2.id,
          email: 'shared@example.com', // Same email, different tenant
          passwordHash: '$2a$12$hashed',
        },
      });

      expect(user2).toBeDefined();
      expect(user2.tenantId).toBe(tenant2.id);
    });

    it('should update user role and MFA settings', async () => {
      const user = await prisma.user.create({
        data: {
          id: nanoid(),
          tenantId: testTenantId,
          email: 'update@example.com',
          passwordHash: '$2a$12$hashed',
          role: 'viewer',
        },
      });

      const updated = await prisma.user.update({
        where: { id: user.id },
        data: {
          role: 'manager',
          mfaEnabled: true,
          mfaSecret: 'encrypted_secret',
        },
      });

      expect(updated.role).toBe('manager');
      expect(updated.mfaEnabled).toBe(true);
      expect(updated.mfaSecret).toBe('encrypted_secret');
    });
  });

  describe('Workspace Operations', () => {
    beforeEach(async () => {
      const tenant = await prisma.tenant.create({
        data: {
          id: nanoid(),
          name: 'Workspace Test Corp',
          slug: 'workspace-test',
        },
      });
      testTenantId = tenant.id;

      const user = await prisma.user.create({
        data: {
          id: nanoid(),
          tenantId: testTenantId,
          email: 'workspace@example.com',
          passwordHash: '$2a$12$hashed',
        },
      });
      testUserId = user.id;
    });

    it('should create a root workspace', async () => {
      const workspace = await prisma.workspace.create({
        data: {
          id: nanoid(),
          tenantId: testTenantId,
          name: 'Root Workspace',
          description: 'Top level workspace',
          classification: 'internal',
          createdBy: testUserId,
        },
      });

      expect(workspace.id).toBeDefined();
      expect(workspace.name).toBe('Root Workspace');
      expect(workspace.parentId).toBeNull();
      expect(workspace.classification).toBe('internal');

      testWorkspaceId = workspace.id;
    });

    it('should create nested workspaces', async () => {
      const parent = await prisma.workspace.create({
        data: {
          id: nanoid(),
          tenantId: testTenantId,
          name: 'Parent Workspace',
          classification: 'confidential',
          createdBy: testUserId,
        },
      });

      const child = await prisma.workspace.create({
        data: {
          id: nanoid(),
          tenantId: testTenantId,
          name: 'Child Workspace',
          parentId: parent.id,
          classification: 'confidential',
          createdBy: testUserId,
        },
      });

      expect(child.parentId).toBe(parent.id);

      // Verify relationship
      const parentWithChildren = await prisma.workspace.findUnique({
        where: { id: parent.id },
        include: { children: true },
      });

      expect(parentWithChildren?.children).toHaveLength(1);
      expect(parentWithChildren?.children[0].id).toBe(child.id);
    });

    it('should query workspaces by classification', async () => {
      await prisma.workspace.createMany({
        data: [
          {
            id: nanoid(),
            tenantId: testTenantId,
            name: 'Public Workspace',
            classification: 'public',
            createdBy: testUserId,
          },
          {
            id: nanoid(),
            tenantId: testTenantId,
            name: 'Confidential Workspace',
            classification: 'confidential',
            createdBy: testUserId,
          },
          {
            id: nanoid(),
            tenantId: testTenantId,
            name: 'Restricted Workspace',
            classification: 'restricted',
            createdBy: testUserId,
          },
        ],
      });

      const confidentialWorkspaces = await prisma.workspace.findMany({
        where: {
          tenantId: testTenantId,
          classification: 'confidential',
        },
      });

      expect(confidentialWorkspaces).toHaveLength(1);
      expect(confidentialWorkspaces[0].name).toBe('Confidential Workspace');
    });
  });

  describe('Document Operations', () => {
    beforeEach(async () => {
      const tenant = await prisma.tenant.create({
        data: {
          id: nanoid(),
          name: 'Document Test Corp',
          slug: 'document-test',
        },
      });
      testTenantId = tenant.id;

      const user = await prisma.user.create({
        data: {
          id: nanoid(),
          tenantId: testTenantId,
          email: 'document@example.com',
          passwordHash: '$2a$12$hashed',
        },
      });
      testUserId = user.id;

      const workspace = await prisma.workspace.create({
        data: {
          id: nanoid(),
          tenantId: testTenantId,
          name: 'Document Workspace',
          classification: 'internal',
          createdBy: testUserId,
        },
      });
      testWorkspaceId = workspace.id;
    });

    it('should create a document with all metadata', async () => {
      const document = await prisma.document.create({
        data: {
          id: nanoid(),
          tenantId: testTenantId,
          workspaceId: testWorkspaceId,
          name: 'test-document.pdf',
          fileType: 'pdf',
          fileSize: 1024000,
          storagePath: '/storage/test/document.pdf',
          classification: 'internal',
          version: 1,
          metadata: {
            author: 'Test User',
            tags: ['test', 'integration'],
            customField: 'value',
          },
          createdBy: testUserId,
        },
      });

      expect(document.id).toBeDefined();
      expect(document.name).toBe('test-document.pdf');
      expect(document.fileSize).toBe(1024000);
      expect(document.version).toBe(1);
      expect(document.metadata).toHaveProperty('author', 'Test User');
      expect(document.metadata).toHaveProperty('tags');
    });

    it('should handle document versioning', async () => {
      const docId = nanoid();

      // Create version 1
      const v1 = await prisma.document.create({
        data: {
          id: docId,
          tenantId: testTenantId,
          workspaceId: testWorkspaceId,
          name: 'versioned-doc.pdf',
          fileType: 'pdf',
          fileSize: 1000,
          storagePath: '/storage/v1.pdf',
          classification: 'internal',
          version: 1,
          createdBy: testUserId,
        },
      });

      // Update to version 2
      const v2 = await prisma.document.update({
        where: { id: docId },
        data: {
          version: 2,
          storagePath: '/storage/v2.pdf',
          fileSize: 2000,
        },
      });

      expect(v2.version).toBe(2);
      expect(v2.fileSize).toBe(2000);
      expect(v2.id).toBe(v1.id); // Same document
    });

    it('should query documents by workspace and classification', async () => {
      await prisma.document.createMany({
        data: [
          {
            id: nanoid(),
            tenantId: testTenantId,
            workspaceId: testWorkspaceId,
            name: 'doc1.pdf',
            fileType: 'pdf',
            fileSize: 1000,
            storagePath: '/doc1.pdf',
            classification: 'internal',
            version: 1,
            createdBy: testUserId,
          },
          {
            id: nanoid(),
            tenantId: testTenantId,
            workspaceId: testWorkspaceId,
            name: 'doc2.pdf',
            fileType: 'pdf',
            fileSize: 2000,
            storagePath: '/doc2.pdf',
            classification: 'confidential',
            version: 1,
            createdBy: testUserId,
          },
        ],
      });

      const internalDocs = await prisma.document.findMany({
        where: {
          workspaceId: testWorkspaceId,
          classification: 'internal',
        },
      });

      expect(internalDocs).toHaveLength(1);
      expect(internalDocs[0].name).toBe('doc1.pdf');
    });

    it('should support document relationships with workspace and user', async () => {
      const document = await prisma.document.create({
        data: {
          id: nanoid(),
          tenantId: testTenantId,
          workspaceId: testWorkspaceId,
          name: 'related-doc.pdf',
          fileType: 'pdf',
          fileSize: 1000,
          storagePath: '/related.pdf',
          classification: 'internal',
          version: 1,
          createdBy: testUserId,
        },
        include: {
          workspace: true,
          creator: true,
        },
      });

      expect(document.workspace).toBeDefined();
      expect(document.workspace.name).toBe('Document Workspace');
      expect(document.creator).toBeDefined();
      expect(document.creator.email).toBe('document@example.com');
    });
  });

  describe('Audit Log Operations', () => {
    beforeEach(async () => {
      const tenant = await prisma.tenant.create({
        data: {
          id: nanoid(),
          name: 'Audit Test Corp',
          slug: 'audit-test',
        },
      });
      testTenantId = tenant.id;

      const user = await prisma.user.create({
        data: {
          id: nanoid(),
          tenantId: testTenantId,
          email: 'audit@example.com',
          passwordHash: '$2a$12$hashed',
        },
      });
      testUserId = user.id;
    });

    it('should create audit log entries', async () => {
      const auditLog = await prisma.auditLog.create({
        data: {
          id: nanoid(),
          tenantId: testTenantId,
          userId: testUserId,
          action: 'login',
          resourceType: 'user',
          resourceId: testUserId,
          metadata: {
            ipAddress: '192.168.1.1',
            userAgent: 'Mozilla/5.0',
          },
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
        },
      });

      expect(auditLog.id).toBeDefined();
      expect(auditLog.action).toBe('login');
      expect(auditLog.timestamp).toBeInstanceOf(Date);
    });

    it('should query audit logs by user and action', async () => {
      const actions = ['login', 'upload', 'download', 'delete'];

      for (const action of actions) {
        await prisma.auditLog.create({
          data: {
            id: nanoid(),
            tenantId: testTenantId,
            userId: testUserId,
            action: action as any,
            metadata: {},
          },
        });
      }

      const uploadLogs = await prisma.auditLog.findMany({
        where: {
          userId: testUserId,
          action: 'upload',
        },
      });

      expect(uploadLogs).toHaveLength(1);
      expect(uploadLogs[0].action).toBe('upload');

      // Query all logs for user
      const allUserLogs = await prisma.auditLog.findMany({
        where: { userId: testUserId },
        orderBy: { timestamp: 'desc' },
      });

      expect(allUserLogs).toHaveLength(4);
    });

    it('should filter audit logs by date range', async () => {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      await prisma.auditLog.create({
        data: {
          id: nanoid(),
          tenantId: testTenantId,
          userId: testUserId,
          action: 'login',
          metadata: {},
          timestamp: yesterday,
        },
      });

      await prisma.auditLog.create({
        data: {
          id: nanoid(),
          tenantId: testTenantId,
          userId: testUserId,
          action: 'logout',
          metadata: {},
          timestamp: now,
        },
      });

      const recentLogs = await prisma.auditLog.findMany({
        where: {
          tenantId: testTenantId,
          timestamp: {
            gte: new Date(now.getTime() - 60 * 60 * 1000), // Last hour
          },
        },
      });

      expect(recentLogs).toHaveLength(1);
      expect(recentLogs[0].action).toBe('logout');
    });
  });

  describe('Transaction Operations', () => {
    it('should rollback on transaction failure', async () => {
      const tenant = await prisma.tenant.create({
        data: {
          id: nanoid(),
          name: 'Transaction Test',
          slug: 'transaction-test',
        },
      });

      try {
        await prisma.$transaction(async (tx) => {
          // Create user
          await tx.user.create({
            data: {
              id: nanoid(),
              tenantId: tenant.id,
              email: 'tx-test@example.com',
              passwordHash: '$2a$12$hashed',
            },
          });

          // This should fail due to duplicate slug
          await tx.tenant.create({
            data: {
              id: nanoid(),
              name: 'Duplicate',
              slug: 'transaction-test', // Duplicate!
            },
          });
        });

        // Should not reach here
        expect(true).toBe(false);
      } catch (error) {
        // Transaction should be rolled back
        const users = await prisma.user.findMany({
          where: { email: 'tx-test@example.com' },
        });

        expect(users).toHaveLength(0); // User creation should be rolled back
      }
    });

    it('should commit successful transaction', async () => {
      const tenant = await prisma.tenant.create({
        data: {
          id: nanoid(),
          name: 'Success Transaction Test',
          slug: 'success-tx',
        },
      });

      await prisma.$transaction(async (tx) => {
        // Create user
        const user = await tx.user.create({
          data: {
            id: nanoid(),
            tenantId: tenant.id,
            email: 'success@example.com',
            passwordHash: '$2a$12$hashed',
          },
        });

        // Create workspace
        await tx.workspace.create({
          data: {
            id: nanoid(),
            tenantId: tenant.id,
            name: 'Transaction Workspace',
            classification: 'internal',
            createdBy: user.id,
          },
        });
      });

      // Both should be created
      const user = await prisma.user.findFirst({
        where: { email: 'success@example.com' },
      });
      const workspace = await prisma.workspace.findFirst({
        where: { name: 'Transaction Workspace' },
      });

      expect(user).toBeDefined();
      expect(workspace).toBeDefined();
    });
  });
});
