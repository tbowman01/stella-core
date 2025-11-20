/**
 * Workflow Integration Tests
 * Tests complete end-to-end workflows with all systems integrated
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { prisma } from '@arcqubit/database';
import { Cache, getRedisClient } from '@arcqubit/cache';
import { hashPassword, verifyPassword, generateAccessToken, verifyToken } from '@arcqubit/auth';
import { PluginManager } from '@arcqubit/plugins';
import { nanoid } from 'nanoid';

describe('Full Workflow Integration Tests', () => {
  let cache: Cache;
  let redis: any;
  let tenantId: string;
  let adminId: string;
  let managerId: string;
  let contributorId: string;
  let workspaceId: string;

  beforeEach(async () => {
    // Clean up
    await prisma.document.deleteMany({});
    await prisma.workspace.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.tenant.deleteMany({});

    redis = getRedisClient();
    await redis.flushdb();

    cache = new Cache('workflow');

    // Create test tenant and users
    const tenant = await prisma.tenant.create({
      data: {
        id: nanoid(),
        name: 'Workflow Test Corp',
        slug: 'workflow-test',
        pqcEnabled: true,
        settings: {
          maxFileSize: 100000000,
          retentionDays: 365,
        },
      },
    });
    tenantId = tenant.id;

    const admin = await prisma.user.create({
      data: {
        id: nanoid(),
        tenantId,
        email: 'admin@workflow.test',
        passwordHash: await hashPassword('SecureP@ssw0rd123'),
        fullName: 'Admin User',
        role: 'admin',
        emailVerified: true,
      },
    });
    adminId = admin.id;

    const manager = await prisma.user.create({
      data: {
        id: nanoid(),
        tenantId,
        email: 'manager@workflow.test',
        passwordHash: await hashPassword('SecureP@ssw0rd123'),
        fullName: 'Manager User',
        role: 'manager',
        emailVerified: true,
      },
    });
    managerId = manager.id;

    const contributor = await prisma.user.create({
      data: {
        id: nanoid(),
        tenantId,
        email: 'contributor@workflow.test',
        passwordHash: await hashPassword('SecureP@ssw0rd123'),
        fullName: 'Contributor User',
        role: 'contributor',
        emailVerified: true,
      },
    });
    contributorId = contributor.id;

    const workspace = await prisma.workspace.create({
      data: {
        id: nanoid(),
        tenantId,
        name: 'Main Workspace',
        classification: 'internal',
        createdBy: adminId,
      },
    });
    workspaceId = workspace.id;
  });

  describe('User Registration and Authentication Workflow', () => {
    it('should complete full user registration flow', async () => {
      // Step 1: Create new user
      const newUser = await prisma.user.create({
        data: {
          id: nanoid(),
          tenantId,
          email: 'newuser@workflow.test',
          passwordHash: await hashPassword('NewUserP@ss123'),
          fullName: 'New User',
          role: 'viewer',
          emailVerified: false,
        },
      });

      expect(newUser.emailVerified).toBe(false);

      // Step 2: Verify email
      const updatedUser = await prisma.user.update({
        where: { id: newUser.id },
        data: { emailVerified: true },
      });

      expect(updatedUser.emailVerified).toBe(true);

      // Step 3: First login - verify password
      const validPassword = await verifyPassword('NewUserP@ss123', updatedUser.passwordHash);
      expect(validPassword).toBe(true);

      // Step 4: Generate JWT token
      const token = generateAccessToken({
        userId: updatedUser.id,
        tenantId: updatedUser.tenantId,
        email: updatedUser.email,
        role: updatedUser.role,
        sessionId: nanoid(),
      });

      expect(token).toBeDefined();

      // Step 5: Verify token
      const decoded = verifyToken(token);
      expect(decoded.userId).toBe(updatedUser.id);
      expect(decoded.role).toBe('viewer');

      // Step 6: Cache user session
      const sessionId = decoded.sessionId;
      await cache.set(`session:${sessionId}`, {
        userId: updatedUser.id,
        tenantId: updatedUser.tenantId,
        role: updatedUser.role,
        lastActivity: Date.now(),
      }, 3600);

      const cachedSession = await cache.get<any>(`session:${sessionId}`);
      expect(cachedSession?.userId).toBe(updatedUser.id);

      // Step 7: Create audit log
      const auditLog = await prisma.auditLog.create({
        data: {
          id: nanoid(),
          tenantId,
          userId: updatedUser.id,
          action: 'login',
          resourceType: 'user',
          resourceId: updatedUser.id,
          metadata: {
            ipAddress: '192.168.1.1',
            userAgent: 'Test Browser',
          },
          ipAddress: '192.168.1.1',
          userAgent: 'Test Browser',
        },
      });

      expect(auditLog.action).toBe('login');
    });

    it('should reject invalid credentials', async () => {
      const user = await prisma.user.findFirst({
        where: { email: 'admin@workflow.test' },
      });

      const wrongPassword = await verifyPassword('WrongPassword123!', user!.passwordHash);
      expect(wrongPassword).toBe(false);

      // Create failed login audit log
      await prisma.auditLog.create({
        data: {
          id: nanoid(),
          tenantId,
          userId: user!.id,
          action: 'login_failed',
          resourceType: 'user',
          resourceId: user!.id,
          metadata: {
            reason: 'invalid_password',
          },
        },
      });

      const failedAttempts = await prisma.auditLog.count({
        where: {
          userId: user!.id,
          action: 'login_failed',
        },
      });

      expect(failedAttempts).toBeGreaterThan(0);
    });
  });

  describe('Document Lifecycle Workflow', () => {
    it('should complete full document upload and access workflow', async () => {
      // Step 1: User uploads document
      const document = await prisma.document.create({
        data: {
          id: nanoid(),
          tenantId,
          workspaceId,
          name: 'quarterly-report-q4-2024.pdf',
          fileType: 'pdf',
          fileSize: 2048000,
          storagePath: `/storage/${tenantId}/documents/report.pdf`,
          classification: 'confidential',
          version: 1,
          metadata: {
            uploadedAt: new Date().toISOString(),
            tags: ['quarterly', 'finance', 'q4'],
            department: 'Finance',
          },
          createdBy: contributorId,
        },
      });

      expect(document.id).toBeDefined();

      // Step 2: Cache document metadata
      await cache.set(`document:${document.id}`, {
        id: document.id,
        name: document.name,
        classification: document.classification,
        workspaceId: document.workspaceId,
      }, 300);

      // Step 3: Create audit log for upload
      await prisma.auditLog.create({
        data: {
          id: nanoid(),
          tenantId,
          userId: contributorId,
          action: 'upload',
          resourceType: 'document',
          resourceId: document.id,
          metadata: {
            fileName: document.name,
            fileSize: document.fileSize,
            classification: document.classification,
          },
        },
      });

      // Step 4: Manager views document
      const viewedDoc = await prisma.document.findUnique({
        where: { id: document.id },
        include: {
          workspace: true,
          creator: true,
        },
      });

      expect(viewedDoc).toBeDefined();
      expect(viewedDoc?.creator.id).toBe(contributorId);

      // Step 5: Create view audit log
      await prisma.auditLog.create({
        data: {
          id: nanoid(),
          tenantId,
          userId: managerId,
          action: 'view',
          resourceType: 'document',
          resourceId: document.id,
          metadata: {
            documentName: document.name,
          },
        },
      });

      // Step 6: Manager downloads document
      await prisma.auditLog.create({
        data: {
          id: nanoid(),
          tenantId,
          userId: managerId,
          action: 'download',
          resourceType: 'document',
          resourceId: document.id,
          metadata: {
            downloadedAt: new Date().toISOString(),
          },
        },
      });

      // Verify complete audit trail
      const auditTrail = await prisma.auditLog.findMany({
        where: {
          resourceType: 'document',
          resourceId: document.id,
        },
        orderBy: { timestamp: 'asc' },
      });

      expect(auditTrail).toHaveLength(3);
      expect(auditTrail[0].action).toBe('upload');
      expect(auditTrail[1].action).toBe('view');
      expect(auditTrail[2].action).toBe('download');
    });

    it('should handle document version updates', async () => {
      // Create initial version
      const document = await prisma.document.create({
        data: {
          id: nanoid(),
          tenantId,
          workspaceId,
          name: 'policy-document.pdf',
          fileType: 'pdf',
          fileSize: 1000000,
          storagePath: `/storage/${tenantId}/policy-v1.pdf`,
          classification: 'internal',
          version: 1,
          createdBy: adminId,
        },
      });

      // Update to version 2
      const v2 = await prisma.document.update({
        where: { id: document.id },
        data: {
          version: 2,
          storagePath: `/storage/${tenantId}/policy-v2.pdf`,
          fileSize: 1100000,
          metadata: {
            updateReason: 'Policy changes',
            previousVersion: 1,
          },
        },
      });

      expect(v2.version).toBe(2);

      // Invalidate cached version
      await cache.delete(`document:${document.id}`);

      // Audit the update
      await prisma.auditLog.create({
        data: {
          id: nanoid(),
          tenantId,
          userId: adminId,
          action: 'update',
          resourceType: 'document',
          resourceId: document.id,
          metadata: {
            previousVersion: 1,
            newVersion: 2,
          },
        },
      });

      const updates = await prisma.auditLog.count({
        where: {
          resourceId: document.id,
          action: 'update',
        },
      });

      expect(updates).toBe(1);
    });
  });

  describe('Workspace Management Workflow', () => {
    it('should create hierarchical workspace structure', async () => {
      // Create parent workspace
      const parent = await prisma.workspace.create({
        data: {
          id: nanoid(),
          tenantId,
          name: 'Engineering',
          classification: 'internal',
          createdBy: adminId,
        },
      });

      // Create child workspaces
      const frontend = await prisma.workspace.create({
        data: {
          id: nanoid(),
          tenantId,
          name: 'Frontend Team',
          parentId: parent.id,
          classification: 'internal',
          createdBy: adminId,
        },
      });

      const backend = await prisma.workspace.create({
        data: {
          id: nanoid(),
          tenantId,
          name: 'Backend Team',
          parentId: parent.id,
          classification: 'internal',
          createdBy: adminId,
        },
      });

      // Verify hierarchy
      const parentWithChildren = await prisma.workspace.findUnique({
        where: { id: parent.id },
        include: { children: true },
      });

      expect(parentWithChildren?.children).toHaveLength(2);
      expect(parentWithChildren?.children.map(c => c.name)).toContain('Frontend Team');
      expect(parentWithChildren?.children.map(c => c.name)).toContain('Backend Team');

      // Add documents to child workspaces
      await prisma.document.create({
        data: {
          id: nanoid(),
          tenantId,
          workspaceId: frontend.id,
          name: 'ui-components.md',
          fileType: 'md',
          fileSize: 5000,
          storagePath: `/storage/${tenantId}/frontend/ui.md`,
          classification: 'internal',
          version: 1,
          createdBy: contributorId,
        },
      });

      // Cache workspace structure
      await cache.set(`workspace:${parent.id}:children`, [frontend.id, backend.id], 600);

      const cachedChildren = await cache.get<string[]>(`workspace:${parent.id}:children`);
      expect(cachedChildren).toHaveLength(2);
    });

    it('should enforce classification inheritance in workspaces', async () => {
      // Create confidential parent
      const confidentialParent = await prisma.workspace.create({
        data: {
          id: nanoid(),
          tenantId,
          name: 'Confidential Projects',
          classification: 'confidential',
          createdBy: adminId,
        },
      });

      // Child should maintain or increase classification level
      const child = await prisma.workspace.create({
        data: {
          id: nanoid(),
          tenantId,
          name: 'Top Secret Project',
          parentId: confidentialParent.id,
          classification: 'restricted', // Higher classification
          createdBy: adminId,
        },
      });

      expect(child.classification).toBe('restricted');
      expect(child.parentId).toBe(confidentialParent.id);
    });
  });

  describe('Search and Discovery Workflow', () => {
    it('should support full-text search with caching', async () => {
      // Create searchable documents
      const docs = await Promise.all([
        prisma.document.create({
          data: {
            id: nanoid(),
            tenantId,
            workspaceId,
            name: 'quantum-computing-guide.pdf',
            fileType: 'pdf',
            fileSize: 1000000,
            storagePath: '/storage/quantum-guide.pdf',
            classification: 'public',
            version: 1,
            contentText: 'Quantum computing leverages quantum mechanics for computation. Post-quantum cryptography protects against quantum attacks.',
            createdBy: contributorId,
          },
        }),
        prisma.document.create({
          data: {
            id: nanoid(),
            tenantId,
            workspaceId,
            name: 'pqc-implementation.md',
            fileType: 'md',
            fileSize: 50000,
            storagePath: '/storage/pqc-impl.md',
            classification: 'internal',
            version: 1,
            contentText: 'Implementing post-quantum cryptography using ML-KEM and ML-DSA algorithms.',
            createdBy: contributorId,
          },
        }),
      ]);

      // Simulate search query
      const searchQuery = 'quantum cryptography';
      const results = await prisma.document.findMany({
        where: {
          tenantId,
          contentText: {
            contains: 'quantum',
          },
        },
      });

      expect(results).toHaveLength(2);

      // Cache search results
      const queryHash = Buffer.from(searchQuery).toString('base64');
      await cache.set(`search:${queryHash}`, {
        query: searchQuery,
        results: results.map(r => ({ id: r.id, name: r.name })),
        timestamp: Date.now(),
      }, 60);

      // Retrieve from cache
      const cached = await cache.get<any>(`search:${queryHash}`);
      expect(cached?.results).toHaveLength(2);

      // Audit search
      await prisma.auditLog.create({
        data: {
          id: nanoid(),
          tenantId,
          userId: managerId,
          action: 'search',
          metadata: {
            query: searchQuery,
            resultsCount: results.length,
          },
        },
      });
    });
  });

  describe('Multi-Tenant Isolation Workflow', () => {
    it('should strictly isolate tenant data', async () => {
      // Create second tenant
      const tenant2 = await prisma.tenant.create({
        data: {
          id: nanoid(),
          name: 'Other Corp',
          slug: 'other-corp',
        },
      });

      const tenant2User = await prisma.user.create({
        data: {
          id: nanoid(),
          tenantId: tenant2.id,
          email: 'user@other-corp.test',
          passwordHash: await hashPassword('Password123!'),
          role: 'admin',
        },
      });

      const tenant2Workspace = await prisma.workspace.create({
        data: {
          id: nanoid(),
          tenantId: tenant2.id,
          name: 'Other Corp Workspace',
          classification: 'internal',
          createdBy: tenant2User.id,
        },
      });

      // Create documents in both tenants
      await prisma.document.create({
        data: {
          id: nanoid(),
          tenantId,
          workspaceId,
          name: 'tenant1-doc.pdf',
          fileType: 'pdf',
          fileSize: 1000,
          storagePath: '/storage/t1-doc.pdf',
          classification: 'internal',
          version: 1,
          createdBy: adminId,
        },
      });

      await prisma.document.create({
        data: {
          id: nanoid(),
          tenantId: tenant2.id,
          workspaceId: tenant2Workspace.id,
          name: 'tenant2-doc.pdf',
          fileType: 'pdf',
          fileSize: 1000,
          storagePath: '/storage/t2-doc.pdf',
          classification: 'internal',
          version: 1,
          createdBy: tenant2User.id,
        },
      });

      // Query should only return tenant1 documents
      const tenant1Docs = await prisma.document.findMany({
        where: { tenantId },
      });

      const tenant2Docs = await prisma.document.findMany({
        where: { tenantId: tenant2.id },
      });

      expect(tenant1Docs).toHaveLength(1);
      expect(tenant2Docs).toHaveLength(1);
      expect(tenant1Docs[0].tenantId).toBe(tenantId);
      expect(tenant2Docs[0].tenantId).toBe(tenant2.id);

      // Cache should be isolated
      await cache.set(`${tenantId}:setting`, 'tenant1-value');
      await cache.set(`${tenant2.id}:setting`, 'tenant2-value');

      const t1Setting = await cache.get(`${tenantId}:setting`);
      const t2Setting = await cache.get(`${tenant2.id}:setting`);

      expect(t1Setting).toBe('tenant1-value');
      expect(t2Setting).toBe('tenant2-value');
    });
  });

  describe('Compliance and Audit Workflow', () => {
    it('should maintain comprehensive audit trail', async () => {
      // Simulate a day of activity
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      // User actions throughout the day
      const actions = [
        { action: 'login', userId: adminId, hour: 9 },
        { action: 'view', userId: adminId, hour: 9, resourceId: nanoid() },
        { action: 'upload', userId: contributorId, hour: 10, resourceId: nanoid() },
        { action: 'search', userId: managerId, hour: 11 },
        { action: 'download', userId: managerId, hour: 14, resourceId: nanoid() },
        { action: 'update', userId: adminId, hour: 15, resourceId: nanoid() },
        { action: 'logout', userId: adminId, hour: 17 },
      ];

      for (const { action, userId, hour, resourceId } of actions) {
        const timestamp = new Date(startOfDay);
        timestamp.setHours(hour);

        await prisma.auditLog.create({
          data: {
            id: nanoid(),
            tenantId,
            userId,
            action: action as any,
            resourceType: resourceId ? 'document' : null,
            resourceId,
            metadata: {
              hour,
              automated: false,
            },
            timestamp,
          },
        });
      }

      // Query audit logs for compliance
      const allLogs = await prisma.auditLog.findMany({
        where: {
          tenantId,
          timestamp: {
            gte: startOfDay,
          },
        },
        orderBy: { timestamp: 'asc' },
      });

      expect(allLogs).toHaveLength(7);

      // Generate compliance report
      const userActivity = await prisma.auditLog.groupBy({
        by: ['userId'],
        where: {
          tenantId,
          timestamp: {
            gte: startOfDay,
          },
        },
        _count: true,
      });

      expect(userActivity.length).toBeGreaterThan(0);

      // Cache report
      await cache.set(`compliance:report:${tenantId}:${startOfDay.toISOString()}`, {
        date: startOfDay,
        totalActions: allLogs.length,
        userActivity,
        generatedAt: new Date(),
      }, 86400); // 24 hours
    });
  });
});
