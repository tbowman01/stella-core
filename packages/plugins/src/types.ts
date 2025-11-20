import { z } from 'zod';

// Plugin metadata schema
export const PluginManifestSchema = z.object({
  id: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/),
  name: z.string().min(1).max(200),
  version: z.string().regex(/^\d+\.\d+\.\d+$/), // Semantic versioning
  description: z.string().max(1000),
  author: z.string().max(200),
  homepage: z.string().url().optional(),
  repository: z.string().url().optional(),
  license: z.string().max(50).default('MIT'),

  // Plugin capabilities and requirements
  capabilities: z.array(z.enum([
    'document-analysis',
    'crypto-scanning',
    'compliance-assessment',
    'search-enhancement',
    'ai-enhancement',
    'data-export',
    'data-import',
    'workflow-automation',
  ])),

  // Required permissions
  permissions: z.object({
    readDocuments: z.boolean().default(false),
    writeDocuments: z.boolean().default(false),
    readWorkspaces: z.boolean().default(false),
    writeWorkspaces: z.boolean().default(false),
    readUsers: z.boolean().default(false),
    writeUsers: z.boolean().default(false),
    readAuditLogs: z.boolean().default(false),
    readCompliance: z.boolean().default(false),
    writeCompliance: z.boolean().default(false),
    executeJobs: z.boolean().default(false),
    externalNetwork: z.boolean().default(false),
    fileSystemAccess: z.boolean().default(false),
  }),

  // Configuration schema for plugin settings
  configSchema: z.record(z.any()).optional(),

  // Hooks that the plugin subscribes to
  hooks: z.array(z.enum([
    'onDocumentUpload',
    'onDocumentUpdate',
    'onDocumentDelete',
    'onDocumentClassify',
    'onSearchQuery',
    'onSearchResults',
    'onAIQuery',
    'onAIResponse',
    'onComplianceCheck',
    'onAuditEvent',
    'onUserLogin',
    'onUserLogout',
    'onWorkspaceCreate',
    'onWorkspaceUpdate',
  ])),

  // Dependencies on other plugins
  dependencies: z.record(z.string()).optional(),

  // Minimum platform version required
  minPlatformVersion: z.string().regex(/^\d+\.\d+\.\d+$/).optional(),
});

export type PluginManifest = z.infer<typeof PluginManifestSchema>;

// Plugin installation status
export enum PluginStatus {
  INSTALLED = 'installed',
  ENABLED = 'enabled',
  DISABLED = 'disabled',
  ERROR = 'error',
  UPDATING = 'updating',
}

// Plugin instance in database
export interface PluginInstance {
  id: string;
  tenantId: string;
  pluginId: string;
  name: string;
  version: string;
  status: PluginStatus;
  config: Record<string, unknown>;
  installedAt: Date;
  enabledAt: Date | null;
  disabledAt: Date | null;
  lastError: string | null;
  metadata: PluginManifest;
}

// Plugin execution context
export interface PluginContext {
  tenantId: string;
  userId: string;
  pluginId: string;
  permissions: PluginManifest['permissions'];
  config: Record<string, unknown>;
}

// Hook event payloads
export interface DocumentUploadEvent {
  documentId: string;
  name: string;
  fileType: string;
  fileSize: number;
  workspaceId: string;
  uploadedBy: string;
}

export interface DocumentClassifyEvent {
  documentId: string;
  content: string;
  suggestedClassification: string;
  confidence: number;
}

export interface SearchQueryEvent {
  query: string;
  mode: 'fulltext' | 'semantic' | 'hybrid';
  filters: Record<string, unknown>;
}

export interface SearchResultsEvent {
  query: string;
  results: Array<{
    documentId: string;
    score: number;
    snippet: string;
  }>;
}

export interface AIQueryEvent {
  conversationId: string;
  query: string;
  context: Array<{
    documentId: string;
    content: string;
  }>;
}

export interface AIResponseEvent {
  conversationId: string;
  query: string;
  response: string;
  citations: Array<{
    documentId: string;
    snippet: string;
  }>;
}

export interface ComplianceCheckEvent {
  controlId: string;
  framework: string;
  status: string;
}

export interface AuditEventPayload {
  action: string;
  resourceType: string;
  resourceId: string;
  userId: string;
  metadata: Record<string, unknown>;
}

// Plugin hook handlers
export type PluginHookHandler<T = unknown> = (
  event: T,
  context: PluginContext
) => Promise<void | T>;

// Plugin interface that all plugins must implement
export interface Plugin {
  manifest: PluginManifest;

  // Lifecycle hooks
  onInstall?(context: PluginContext): Promise<void>;
  onEnable?(context: PluginContext): Promise<void>;
  onDisable?(context: PluginContext): Promise<void>;
  onUninstall?(context: PluginContext): Promise<void>;
  onConfigure?(config: Record<string, unknown>, context: PluginContext): Promise<void>;

  // Event hooks
  onDocumentUpload?: PluginHookHandler<DocumentUploadEvent>;
  onDocumentUpdate?: PluginHookHandler<DocumentUploadEvent>;
  onDocumentDelete?: PluginHookHandler<{ documentId: string }>;
  onDocumentClassify?: PluginHookHandler<DocumentClassifyEvent>;
  onSearchQuery?: PluginHookHandler<SearchQueryEvent>;
  onSearchResults?: PluginHookHandler<SearchResultsEvent>;
  onAIQuery?: PluginHookHandler<AIQueryEvent>;
  onAIResponse?: PluginHookHandler<AIResponseEvent>;
  onComplianceCheck?: PluginHookHandler<ComplianceCheckEvent>;
  onAuditEvent?: PluginHookHandler<AuditEventPayload>;
  onUserLogin?: PluginHookHandler<{ userId: string }>;
  onUserLogout?: PluginHookHandler<{ userId: string }>;
  onWorkspaceCreate?: PluginHookHandler<{ workspaceId: string; name: string }>;
  onWorkspaceUpdate?: PluginHookHandler<{ workspaceId: string; name: string }>;
}

// Plugin execution result
export interface PluginExecutionResult {
  success: boolean;
  error?: string;
  data?: unknown;
  duration: number;
}

// Plugin registry entry
export interface RegisteredPlugin {
  manifest: PluginManifest;
  factory: () => Plugin;
  isBuiltIn: boolean;
}
