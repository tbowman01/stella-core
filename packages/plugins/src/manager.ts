import { nanoid } from 'nanoid';
import semver from 'semver';
import prisma from '@arcqubit/database';
import type {
  Plugin,
  PluginManifest,
  PluginContext,
  PluginInstance,
  PluginStatus,
  RegisteredPlugin,
  PluginExecutionResult,
} from './types';
import { PluginManifestSchema } from './types';

/**
 * Plugin Manager
 * Handles plugin lifecycle, registration, and execution
 */
export class PluginManager {
  private plugins = new Map<string, RegisteredPlugin>();
  private instances = new Map<string, Plugin>();

  /**
   * Register a plugin
   */
  registerPlugin(manifest: PluginManifest, factory: () => Plugin, isBuiltIn = false): void {
    // Validate manifest
    const validated = PluginManifestSchema.parse(manifest);

    // Check if plugin already registered
    if (this.plugins.has(validated.id)) {
      throw new Error(`Plugin ${validated.id} is already registered`);
    }

    // Check version format
    if (!semver.valid(validated.version)) {
      throw new Error(`Invalid version format: ${validated.version}`);
    }

    this.plugins.set(validated.id, {
      manifest: validated,
      factory,
      isBuiltIn,
    });

    console.log(`✅ Registered plugin: ${validated.name} v${validated.version}`);
  }

  /**
   * Install plugin for a tenant
   */
  async installPlugin(
    pluginId: string,
    tenantId: string,
    userId: string,
    config: Record<string, unknown> = {}
  ): Promise<PluginInstance> {
    const registered = this.plugins.get(pluginId);
    if (!registered) {
      throw new Error(`Plugin ${pluginId} is not registered`);
    }

    // Check if already installed
    const existing = await prisma.plugin.findFirst({
      where: { tenantId, pluginId },
    });

    if (existing) {
      throw new Error(`Plugin ${pluginId} is already installed for this tenant`);
    }

    // Check dependencies
    if (registered.manifest.dependencies) {
      for (const [depId, depVersion] of Object.entries(registered.manifest.dependencies)) {
        const depPlugin = await prisma.plugin.findFirst({
          where: { tenantId, pluginId: depId },
        });

        if (!depPlugin) {
          throw new Error(`Missing dependency: ${depId}`);
        }

        if (!semver.satisfies(depPlugin.version, depVersion)) {
          throw new Error(
            `Dependency version mismatch: ${depId} requires ${depVersion}, got ${depPlugin.version}`
          );
        }
      }
    }

    // Validate config against schema
    if (registered.manifest.configSchema) {
      // TODO: Implement config validation using manifest.configSchema
    }

    // Create plugin instance
    const instance = registered.factory();

    // Create plugin context
    const context: PluginContext = {
      tenantId,
      userId,
      pluginId,
      permissions: registered.manifest.permissions,
      config,
    };

    // Call onInstall hook
    if (instance.onInstall) {
      await instance.onInstall(context);
    }

    // Save to database
    const pluginRecord = await prisma.plugin.create({
      data: {
        id: nanoid(),
        tenantId,
        pluginId,
        name: registered.manifest.name,
        version: registered.manifest.version,
        status: 'installed',
        config,
        metadata: registered.manifest as any,
        installedBy: userId,
      },
    });

    // Store instance
    this.instances.set(`${tenantId}:${pluginId}`, instance);

    // Create audit log
    await prisma.auditLog.create({
      data: {
        id: nanoid(),
        tenantId,
        userId,
        action: 'plugin.install',
        resourceType: 'plugin',
        resourceId: pluginRecord.id,
        metadata: {
          pluginId,
          version: registered.manifest.version,
        },
      },
    });

    return pluginRecord as PluginInstance;
  }

  /**
   * Enable plugin
   */
  async enablePlugin(pluginId: string, tenantId: string, userId: string): Promise<void> {
    const pluginRecord = await prisma.plugin.findFirst({
      where: { tenantId, pluginId },
    });

    if (!pluginRecord) {
      throw new Error(`Plugin ${pluginId} is not installed`);
    }

    if (pluginRecord.status === 'enabled') {
      throw new Error(`Plugin ${pluginId} is already enabled`);
    }

    // Get plugin instance
    let instance = this.instances.get(`${tenantId}:${pluginId}`);
    if (!instance) {
      const registered = this.plugins.get(pluginId);
      if (!registered) {
        throw new Error(`Plugin ${pluginId} is not registered`);
      }
      instance = registered.factory();
      this.instances.set(`${tenantId}:${pluginId}`, instance);
    }

    // Create context
    const context: PluginContext = {
      tenantId,
      userId,
      pluginId,
      permissions: (pluginRecord.metadata as PluginManifest).permissions,
      config: pluginRecord.config as Record<string, unknown>,
    };

    // Call onEnable hook
    if (instance.onEnable) {
      await instance.onEnable(context);
    }

    // Update status
    await prisma.plugin.update({
      where: { id: pluginRecord.id },
      data: {
        status: 'enabled',
        enabledAt: new Date(),
      },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        id: nanoid(),
        tenantId,
        userId,
        action: 'plugin.enable',
        resourceType: 'plugin',
        resourceId: pluginRecord.id,
        metadata: { pluginId },
      },
    });
  }

  /**
   * Disable plugin
   */
  async disablePlugin(pluginId: string, tenantId: string, userId: string): Promise<void> {
    const pluginRecord = await prisma.plugin.findFirst({
      where: { tenantId, pluginId },
    });

    if (!pluginRecord) {
      throw new Error(`Plugin ${pluginId} is not installed`);
    }

    if (pluginRecord.status === 'disabled') {
      throw new Error(`Plugin ${pluginId} is already disabled`);
    }

    // Get instance
    const instance = this.instances.get(`${tenantId}:${pluginId}`);
    if (instance) {
      const context: PluginContext = {
        tenantId,
        userId,
        pluginId,
        permissions: (pluginRecord.metadata as PluginManifest).permissions,
        config: pluginRecord.config as Record<string, unknown>,
      };

      // Call onDisable hook
      if (instance.onDisable) {
        await instance.onDisable(context);
      }
    }

    // Update status
    await prisma.plugin.update({
      where: { id: pluginRecord.id },
      data: {
        status: 'disabled',
        disabledAt: new Date(),
      },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        id: nanoid(),
        tenantId,
        userId,
        action: 'plugin.disable',
        resourceType: 'plugin',
        resourceId: pluginRecord.id,
        metadata: { pluginId },
      },
    });
  }

  /**
   * Uninstall plugin
   */
  async uninstallPlugin(pluginId: string, tenantId: string, userId: string): Promise<void> {
    const pluginRecord = await prisma.plugin.findFirst({
      where: { tenantId, pluginId },
    });

    if (!pluginRecord) {
      throw new Error(`Plugin ${pluginId} is not installed`);
    }

    // Check if other plugins depend on this one
    const dependents = await prisma.plugin.findMany({
      where: { tenantId },
    });

    for (const dep of dependents) {
      const manifest = dep.metadata as PluginManifest;
      if (manifest.dependencies && pluginId in manifest.dependencies) {
        throw new Error(
          `Cannot uninstall ${pluginId}: plugin ${dep.pluginId} depends on it`
        );
      }
    }

    // Get instance
    const instance = this.instances.get(`${tenantId}:${pluginId}`);
    if (instance) {
      const context: PluginContext = {
        tenantId,
        userId,
        pluginId,
        permissions: (pluginRecord.metadata as PluginManifest).permissions,
        config: pluginRecord.config as Record<string, unknown>,
      };

      // Call onUninstall hook
      if (instance.onUninstall) {
        await instance.onUninstall(context);
      }

      // Remove from instances
      this.instances.delete(`${tenantId}:${pluginId}`);
    }

    // Delete from database
    await prisma.plugin.delete({
      where: { id: pluginRecord.id },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        id: nanoid(),
        tenantId,
        userId,
        action: 'plugin.uninstall',
        resourceType: 'plugin',
        resourceId: pluginRecord.id,
        metadata: { pluginId },
      },
    });
  }

  /**
   * Execute plugin hook
   */
  async executeHook<T = unknown>(
    hookName: string,
    event: T,
    tenantId: string,
    userId: string
  ): Promise<PluginExecutionResult[]> {
    const results: PluginExecutionResult[] = [];

    // Get all enabled plugins for tenant that subscribe to this hook
    const plugins = await prisma.plugin.findMany({
      where: {
        tenantId,
        status: 'enabled',
      },
    });

    for (const pluginRecord of plugins) {
      const manifest = pluginRecord.metadata as PluginManifest;

      // Check if plugin subscribes to this hook
      if (!manifest.hooks.includes(hookName as any)) {
        continue;
      }

      const instance = this.instances.get(`${tenantId}:${pluginRecord.pluginId}`);
      if (!instance) {
        continue;
      }

      const handler = (instance as any)[hookName];
      if (typeof handler !== 'function') {
        continue;
      }

      const context: PluginContext = {
        tenantId,
        userId,
        pluginId: pluginRecord.pluginId,
        permissions: manifest.permissions,
        config: pluginRecord.config as Record<string, unknown>,
      };

      const startTime = Date.now();
      try {
        await handler.call(instance, event, context);
        results.push({
          success: true,
          duration: Date.now() - startTime,
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        results.push({
          success: false,
          error: errorMessage,
          duration: Date.now() - startTime,
        });

        // Update plugin with error
        await prisma.plugin.update({
          where: { id: pluginRecord.id },
          data: {
            status: 'error',
            lastError: errorMessage,
          },
        });
      }
    }

    return results;
  }

  /**
   * List all registered plugins
   */
  listRegistered(): PluginManifest[] {
    return Array.from(this.plugins.values()).map((p) => p.manifest);
  }

  /**
   * List installed plugins for tenant
   */
  async listInstalled(tenantId: string): Promise<PluginInstance[]> {
    const plugins = await prisma.plugin.findMany({
      where: { tenantId },
      orderBy: { installedAt: 'desc' },
    });

    return plugins as PluginInstance[];
  }

  /**
   * Get plugin details
   */
  async getPlugin(pluginId: string, tenantId: string): Promise<PluginInstance | null> {
    const plugin = await prisma.plugin.findFirst({
      where: { tenantId, pluginId },
    });

    return plugin as PluginInstance | null;
  }

  /**
   * Update plugin configuration
   */
  async updateConfig(
    pluginId: string,
    tenantId: string,
    userId: string,
    config: Record<string, unknown>
  ): Promise<void> {
    const pluginRecord = await prisma.plugin.findFirst({
      where: { tenantId, pluginId },
    });

    if (!pluginRecord) {
      throw new Error(`Plugin ${pluginId} is not installed`);
    }

    // Get instance
    const instance = this.instances.get(`${tenantId}:${pluginId}`);
    if (instance && instance.onConfigure) {
      const context: PluginContext = {
        tenantId,
        userId,
        pluginId,
        permissions: (pluginRecord.metadata as PluginManifest).permissions,
        config,
      };

      await instance.onConfigure(config, context);
    }

    // Update config
    await prisma.plugin.update({
      where: { id: pluginRecord.id },
      data: { config },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        id: nanoid(),
        tenantId,
        userId,
        action: 'plugin.configure',
        resourceType: 'plugin',
        resourceId: pluginRecord.id,
        metadata: { pluginId, config },
      },
    });
  }
}

// Singleton instance
export const pluginManager = new PluginManager();
