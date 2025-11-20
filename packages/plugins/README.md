# @arcqubit/plugins

Plugin framework for the ArcQubit Knowledge Work Platform.

## Overview

The plugin system provides a flexible, secure way to extend platform functionality without modifying core code. Plugins can hook into various system events, analyze documents, enhance search, integrate with external services, and more.

## Architecture

### Plugin Lifecycle

```
Register → Install → Enable → [Execute Hooks] → Disable → Uninstall
```

### Components

- **Plugin Manager**: Centralized plugin registry and lifecycle management
- **Hook System**: Event-driven architecture for plugin integration points
- **Sandbox**: Isolated execution environment for plugin code
- **Manifest**: Plugin metadata, capabilities, and permissions

## Plugin Manifest

Every plugin must define a manifest:

```typescript
{
  id: 'my-plugin',
  name: 'My Plugin',
  version: '1.0.0',
  description: 'Does something cool',
  author: 'Your Name',
  capabilities: ['document-analysis'],
  permissions: {
    readDocuments: true,
    writeDocuments: false,
    // ... other permissions
  },
  hooks: ['onDocumentUpload', 'onSearchQuery'],
  dependencies: {
    'other-plugin': '^1.0.0'
  }
}
```

## Available Hooks

Plugins can subscribe to the following hooks:

### Document Hooks
- `onDocumentUpload` - After document upload
- `onDocumentUpdate` - After document update
- `onDocumentDelete` - Before document deletion
- `onDocumentClassify` - During classification (can modify)

### Search Hooks
- `onSearchQuery` - Before search execution (can modify query)
- `onSearchResults` - After search completion (can re-rank)

### AI Hooks
- `onAIQuery` - Before AI query processing
- `onAIResponse` - After AI response generation

### Compliance Hooks
- `onComplianceCheck` - During compliance evaluation
- `onAuditEvent` - After audit log creation

### User Hooks
- `onUserLogin` - After successful login
- `onUserLogout` - After logout

### Workspace Hooks
- `onWorkspaceCreate` - After workspace creation
- `onWorkspaceUpdate` - After workspace update

## Built-in Plugins

### 1. PQC Scanner

Scans documents and code for cryptographic algorithm usage.

**Capabilities:**
- Detects classical, post-quantum, and vulnerable crypto algorithms
- Generates Quantum Bill of Materials (QBOM)
- Provides migration recommendations
- Alerts on vulnerable algorithm usage

**Configuration:**
```typescript
{
  scanOnUpload: true,
  autoGenerateQBOM: true,
  notifyOnVulnerable: true
}
```

**Usage:**
```typescript
import { pluginManager } from '@arcqubit/plugins';

// Install for tenant
await pluginManager.installPlugin(
  'pqc-scanner',
  tenantId,
  userId,
  { scanOnUpload: true }
);

// Enable
await pluginManager.enablePlugin('pqc-scanner', tenantId, userId);
```

### 2. Q-CMM Assessment

Quantum Capability Maturity Model assessment tool.

**Capabilities:**
- Evaluates organizational quantum readiness
- Provides maturity scoring (0-5)
- Generates migration roadmap
- Tracks progress over time

**Maturity Levels:**
- **Level 0**: Unaware
- **Level 1**: Aware
- **Level 2**: Planning
- **Level 3**: Implementing
- **Level 4**: Optimizing
- **Level 5**: Leading

**Assessment Domains:**
1. Cryptographic Inventory
2. PQC Readiness
3. Risk Assessment
4. Migration Planning
5. Governance & Compliance

## Creating Custom Plugins

### 1. Define Plugin Class

```typescript
import { Plugin, PluginManifest, PluginContext } from '@arcqubit/plugins';

export class MyPlugin implements Plugin {
  manifest: PluginManifest = {
    id: 'my-plugin',
    name: 'My Custom Plugin',
    version: '1.0.0',
    description: 'My plugin description',
    author: 'Your Name',
    capabilities: ['document-analysis'],
    permissions: {
      readDocuments: true,
      writeDocuments: false,
    },
    hooks: ['onDocumentUpload'],
  };

  async onInstall(context: PluginContext): Promise<void> {
    console.log('Plugin installed!');
  }

  async onEnable(context: PluginContext): Promise<void> {
    console.log('Plugin enabled!');
  }

  async onDocumentUpload(event: DocumentUploadEvent, context: PluginContext): Promise<void> {
    // Your logic here
    console.log(`Processing document: ${event.name}`);
  }
}
```

### 2. Register Plugin

```typescript
import { pluginManager } from '@arcqubit/plugins';
import { MyPlugin } from './my-plugin';

const plugin = new MyPlugin();
pluginManager.registerPlugin(plugin.manifest, () => new MyPlugin());
```

### 3. Install for Tenant

```typescript
await pluginManager.installPlugin('my-plugin', tenantId, userId, {
  // Plugin configuration
});

await pluginManager.enablePlugin('my-plugin', tenantId, userId);
```

## Plugin Permissions

Plugins must declare required permissions:

- `readDocuments` - Read document content
- `writeDocuments` - Modify/create documents
- `readWorkspaces` - Read workspace data
- `writeWorkspaces` - Modify workspaces
- `readUsers` - Read user information
- `writeUsers` - Modify users
- `readAuditLogs` - Access audit logs
- `readCompliance` - Read compliance data
- `writeCompliance` - Modify compliance data
- `executeJobs` - Schedule background jobs
- `externalNetwork` - Make external API calls
- `fileSystemAccess` - Access file system

## Plugin Context

Every hook receives a plugin context:

```typescript
interface PluginContext {
  tenantId: string;
  userId: string;
  pluginId: string;
  permissions: PluginManifest['permissions'];
  config: Record<string, unknown>;
}
```

## Security

- Plugins run in isolated contexts
- Permissions are enforced at runtime
- All plugin actions are audited
- Plugins cannot access data outside their tenant
- External network access requires explicit permission

## API Reference

### Plugin Manager

```typescript
// Register plugin
pluginManager.registerPlugin(manifest, factory, isBuiltIn);

// Install plugin
await pluginManager.installPlugin(pluginId, tenantId, userId, config);

// Enable/disable
await pluginManager.enablePlugin(pluginId, tenantId, userId);
await pluginManager.disablePlugin(pluginId, tenantId, userId);

// Uninstall
await pluginManager.uninstallPlugin(pluginId, tenantId, userId);

// List plugins
const registered = pluginManager.listRegistered();
const installed = await pluginManager.listInstalled(tenantId);

// Execute hook
await pluginManager.executeHook('onDocumentUpload', event, tenantId, userId);
```

### Hook Utilities

```typescript
import {
  triggerDocumentUploadHook,
  triggerSearchQueryHook,
  triggerAIResponseHook,
} from '@arcqubit/plugins';

await triggerDocumentUploadHook(event, tenantId, userId);
await triggerSearchQueryHook(event, tenantId, userId);
await triggerAIResponseHook(event, tenantId, userId);
```

## Testing Plugins

```typescript
import { describe, it, expect } from 'vitest';
import { MyPlugin } from './my-plugin';

describe('MyPlugin', () => {
  it('should process document upload', async () => {
    const plugin = new MyPlugin();
    const context = {
      tenantId: 'test-tenant',
      userId: 'test-user',
      pluginId: 'my-plugin',
      permissions: plugin.manifest.permissions,
      config: {},
    };

    await plugin.onDocumentUpload(
      {
        documentId: '123',
        name: 'test.pdf',
        fileType: 'application/pdf',
        fileSize: 1024,
        workspaceId: 'ws-1',
        uploadedBy: 'user-1',
      },
      context
    );

    // Add assertions
  });
});
```

## Best Practices

1. **Keep plugins focused** - One plugin, one purpose
2. **Handle errors gracefully** - Don't crash the platform
3. **Respect permissions** - Only request what you need
4. **Document configuration** - Provide clear config schemas
5. **Test thoroughly** - Unit test all hook handlers
6. **Audit important actions** - Log security-relevant events
7. **Optimize performance** - Hooks should complete quickly (<100ms)
8. **Version carefully** - Follow semantic versioning

## Troubleshooting

### Plugin not executing

- Check if plugin is enabled
- Verify hook subscription in manifest
- Check permissions
- Review plugin error logs

### Permission denied

- Review plugin permissions in manifest
- Check if tenant has approved permissions
- Verify context permissions

### Dependency errors

- Ensure dependencies are installed first
- Check version compatibility
- Review dependency chain

## License

Proprietary - ArcQubit Platform
