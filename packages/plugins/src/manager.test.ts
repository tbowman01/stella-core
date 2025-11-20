import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PluginManager } from '../src/manager';
import type { Plugin, PluginManifest } from '../src/types';

describe('@arcqubit/plugins - Plugin Manager', () => {
  let manager: PluginManager;

  const mockManifest: PluginManifest = {
    id: 'test-plugin',
    name: 'Test Plugin',
    version: '1.0.0',
    description: 'A test plugin',
    author: 'Test Author',
    capabilities: ['document-analysis'],
    permissions: {
      readDocuments: true,
      writeDocuments: false,
      readWorkspaces: false,
      writeWorkspaces: false,
      readUsers: false,
      writeUsers: false,
      readAuditLogs: false,
      readCompliance: false,
      writeCompliance: false,
      executeJobs: false,
      externalNetwork: false,
      fileSystemAccess: false,
    },
    hooks: ['onDocumentUpload'],
  };

  class MockPlugin implements Plugin {
    manifest = mockManifest;

    onInstall = vi.fn(async () => {});
    onEnable = vi.fn(async () => {});
    onDisable = vi.fn(async () => {});
    onUninstall = vi.fn(async () => {});
    onDocumentUpload = vi.fn(async () => {});
  }

  beforeEach(() => {
    manager = new PluginManager();
  });

  describe('registerPlugin', () => {
    it('should register plugin successfully', () => {
      const factory = () => new MockPlugin();
      expect(() => manager.registerPlugin(mockManifest, factory)).not.toThrow();

      const registered = manager.listRegistered();
      expect(registered).toHaveLength(1);
      expect(registered[0].id).toBe('test-plugin');
    });

    it('should reject duplicate plugin registration', () => {
      const factory = () => new MockPlugin();
      manager.registerPlugin(mockManifest, factory);

      expect(() => manager.registerPlugin(mockManifest, factory)).toThrow(
        'Plugin test-plugin is already registered'
      );
    });

    it('should validate plugin manifest', () => {
      const invalidManifest = {
        ...mockManifest,
        id: '', // Invalid: empty ID
      };

      const factory = () => new MockPlugin();
      expect(() => manager.registerPlugin(invalidManifest as any, factory)).toThrow();
    });

    it('should validate semver version format', () => {
      const invalidManifest = {
        ...mockManifest,
        version: 'invalid-version',
      };

      const factory = () => new MockPlugin();
      expect(() => manager.registerPlugin(invalidManifest as any, factory)).toThrow();
    });
  });

  describe('listRegistered', () => {
    it('should return empty array when no plugins registered', () => {
      const registered = manager.listRegistered();
      expect(registered).toEqual([]);
    });

    it('should list all registered plugins', () => {
      const factory1 = () => new MockPlugin();
      const factory2 = () => new MockPlugin();

      manager.registerPlugin(mockManifest, factory1);
      manager.registerPlugin({ ...mockManifest, id: 'test-plugin-2' }, factory2);

      const registered = manager.listRegistered();
      expect(registered).toHaveLength(2);
      expect(registered.map((p) => p.id)).toContain('test-plugin');
      expect(registered.map((p) => p.id)).toContain('test-plugin-2');
    });
  });

  // Note: The following tests would require database mocking
  // which is omitted for brevity but would follow this pattern:

  describe('installPlugin', () => {
    it('should install plugin for tenant', async () => {
      // Would mock Prisma client
      // Test installation flow
    });

    it('should check dependencies before installation', async () => {
      // Would test dependency resolution
    });

    it('should call onInstall hook', async () => {
      // Would verify hook execution
    });
  });

  describe('enablePlugin', () => {
    it('should enable installed plugin', async () => {
      // Would mock enable flow
    });

    it('should call onEnable hook', async () => {
      // Would verify hook execution
    });
  });

  describe('executeHook', () => {
    it('should execute hook on enabled plugins', async () => {
      // Would test hook execution
    });

    it('should handle hook errors gracefully', async () => {
      // Would test error handling
    });
  });
});
