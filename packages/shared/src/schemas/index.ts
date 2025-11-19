/**
 * Zod validation schemas
 */

import { z } from 'zod';

// User schemas
export const userRoleSchema = z.enum(['admin', 'manager', 'contributor', 'viewer']);

export const createUserSchema = z.object({
  email: z.string().email(),
  fullName: z.string().min(1).max(255),
  role: userRoleSchema,
  mfaEnabled: z.boolean().optional().default(false),
});

export const updateUserSchema = createUserSchema.partial();

// Tenant schemas
export const createTenantSchema = z.object({
  name: z.string().min(1).max(255),
  slug: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens'),
  pqcEnabled: z.boolean().optional().default(true),
  settings: z.record(z.unknown()).optional().default({}),
});

// Document schemas
export const classificationSchema = z.enum(['public', 'internal', 'confidential', 'restricted']);

export const fileTypeSchema = z.enum(['pdf', 'docx', 'xlsx', 'pptx', 'txt', 'md', 'other']);

export const uploadDocumentSchema = z.object({
  name: z.string().min(1).max(255),
  workspaceId: z.string().uuid(),
  classification: classificationSchema.optional().default('internal'),
  metadata: z.record(z.unknown()).optional().default({}),
});

export const updateDocumentSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  classification: classificationSchema.optional(),
  metadata: z.record(z.unknown()).optional(),
});

// Workspace schemas
export const createWorkspaceSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
  parentId: z.string().uuid().optional(),
  classification: classificationSchema.optional().default('internal'),
  metadata: z.record(z.unknown()).optional().default({}),
});

export const updateWorkspaceSchema = createWorkspaceSchema.partial();

// Search schemas
export const searchQuerySchema = z.object({
  query: z.string().min(1).max(500),
  filters: z
    .object({
      workspaceId: z.string().uuid().optional(),
      classification: z.array(classificationSchema).optional(),
      fileType: z.array(fileTypeSchema).optional(),
      dateRange: z
        .object({
          start: z.coerce.date(),
          end: z.coerce.date(),
        })
        .optional(),
    })
    .optional(),
  limit: z.number().min(1).max(100).optional().default(20),
  offset: z.number().min(0).optional().default(0),
});

// AI schemas
export const aiQuerySchema = z.object({
  query: z.string().min(1).max(2000),
  workspaceId: z.string().uuid().optional(),
  contextDocumentIds: z.array(z.string().uuid()).max(10).optional(),
});

// Compliance schemas
export const complianceFrameworkSchema = z.enum(['soc2', 'cmmc', 'nist_rmf', 'hipaa', 'pci']);

export const controlStatusSchema = z.enum(['met', 'partial', 'not_met']);

export const createComplianceControlSchema = z.object({
  framework: complianceFrameworkSchema,
  controlId: z.string().min(1).max(100),
  controlName: z.string().min(1).max(255),
  description: z.string().max(2000),
  ownerId: z.string().uuid().optional(),
  status: controlStatusSchema.optional().default('not_met'),
  evidenceIds: z.array(z.string().uuid()).optional().default([]),
});

// Plugin schemas
export const pluginNameSchema = z.enum(['pqc-scanner', 'q-cmm', 'deep-research']);

export const configurePluginSchema = z.object({
  pluginName: pluginNameSchema,
  enabled: z.boolean(),
  configuration: z.record(z.unknown()).optional().default({}),
});

// Pagination schemas
export const paginationSchema = z.object({
  page: z.number().min(1).optional().default(1),
  limit: z.number().min(1).max(100).optional().default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

// Audit log schemas
export const auditActionSchema = z.enum([
  'login',
  'logout',
  'login_failed',
  'upload',
  'download',
  'view',
  'search',
  'export',
  'delete',
  'update',
  'create_workspace',
  'ai_query',
  'pqc_scan',
  'config_change',
]);

export const createAuditLogSchema = z.object({
  action: auditActionSchema,
  resourceType: z.string().max(50).optional(),
  resourceId: z.string().uuid().optional(),
  metadata: z.record(z.unknown()).optional().default({}),
  ipAddress: z.string().ip().optional(),
  userAgent: z.string().max(500).optional(),
});

// Export all schema types
export type UserRole = z.infer<typeof userRoleSchema>;
export type CreateUser = z.infer<typeof createUserSchema>;
export type UpdateUser = z.infer<typeof updateUserSchema>;
export type CreateTenant = z.infer<typeof createTenantSchema>;
export type Classification = z.infer<typeof classificationSchema>;
export type FileType = z.infer<typeof fileTypeSchema>;
export type UploadDocument = z.infer<typeof uploadDocumentSchema>;
export type UpdateDocument = z.infer<typeof updateDocumentSchema>;
export type CreateWorkspace = z.infer<typeof createWorkspaceSchema>;
export type UpdateWorkspace = z.infer<typeof updateWorkspaceSchema>;
export type SearchQuery = z.infer<typeof searchQuerySchema>;
export type AIQuery = z.infer<typeof aiQuerySchema>;
export type ComplianceFramework = z.infer<typeof complianceFrameworkSchema>;
export type ControlStatus = z.infer<typeof controlStatusSchema>;
export type CreateComplianceControl = z.infer<typeof createComplianceControlSchema>;
export type PluginName = z.infer<typeof pluginNameSchema>;
export type ConfigurePlugin = z.infer<typeof configurePluginSchema>;
export type Pagination = z.infer<typeof paginationSchema>;
export type AuditAction = z.infer<typeof auditActionSchema>;
export type CreateAuditLog = z.infer<typeof createAuditLogSchema>;
