import { nanoid } from 'nanoid';
import type { User, Tenant, Document, Workspace } from '@arcqubit/shared';

/**
 * Test data factories
 */

export function createMockTenant(overrides?: Partial<Tenant>): Tenant {
  return {
    id: nanoid(),
    name: 'Test Tenant',
    slug: 'test-tenant',
    plan: 'enterprise',
    maxUsers: 100,
    maxStorage: BigInt(1099511627776), // 1TB
    settings: {},
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

export function createMockUser(overrides?: Partial<User>): User {
  return {
    id: nanoid(),
    tenantId: nanoid(),
    email: 'test@example.com',
    name: 'Test User',
    passwordHash: '$2b$12$test.hash',
    role: 'contributor',
    emailVerified: true,
    mfaEnabled: false,
    mfaSecret: null,
    ssoProvider: null,
    ssoId: null,
    lastLoginAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

export function createMockDocument(overrides?: Partial<Document>): Document {
  return {
    id: nanoid(),
    tenantId: nanoid(),
    workspaceId: nanoid(),
    name: 'test-document.pdf',
    fileType: 'application/pdf',
    fileSize: BigInt(1024),
    storagePath: '/test/path/document.pdf',
    version: 1,
    classification: 'internal',
    metadata: {},
    encryptionAlgorithm: 'AES-256-GCM',
    wrappedKey: Buffer.from('test-key'),
    pqcSignature: Buffer.from('test-signature'),
    contentText: 'Test document content',
    embedding: null,
    createdBy: nanoid(),
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

export function createMockWorkspace(overrides?: Partial<Workspace>): Workspace {
  return {
    id: nanoid(),
    tenantId: nanoid(),
    name: 'Test Workspace',
    description: 'A test workspace',
    parentId: null,
    classification: 'internal',
    metadata: {},
    createdBy: nanoid(),
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * Test utilities
 */

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function mockAsyncFunction<T>(returnValue: T, delayMs = 0) {
  return vi.fn(async () => {
    if (delayMs > 0) await delay(delayMs);
    return returnValue;
  });
}

export function mockAsyncError(error: Error, delayMs = 0) {
  return vi.fn(async () => {
    if (delayMs > 0) await delay(delayMs);
    throw error;
  });
}

/**
 * Database test utilities
 */

export async function cleanupDatabase() {
  // TODO: Implement database cleanup for tests
  // This would delete all test data after tests
}

export async function seedTestData() {
  // TODO: Implement test data seeding
  // This would create consistent test data
}
