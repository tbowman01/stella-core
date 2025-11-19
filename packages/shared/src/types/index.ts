/**
 * Core type definitions
 */

// User and Authentication Types
export type UserRole = 'admin' | 'manager' | 'contributor' | 'viewer';

export type SSOProvider = 'okta' | 'azure_ad' | 'google' | 'github' | 'custom';

export interface User {
  id: string;
  tenantId: string;
  email: string;
  fullName: string | null;
  role: UserRole;
  mfaEnabled: boolean;
  ssoProvider: SSOProvider | null;
  ssoId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// Tenant Types
export interface Tenant {
  id: string;
  name: string;
  slug: string;
  pqcEnabled: boolean;
  mlKemPublicKey: Buffer | null;
  mlDsaPublicKey: Buffer | null;
  settings: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

// Document Types
export type DocumentClassification = 'public' | 'internal' | 'confidential' | 'restricted';

export type FileType = 'pdf' | 'docx' | 'xlsx' | 'pptx' | 'txt' | 'md' | 'other';

export interface Document {
  id: string;
  tenantId: string;
  workspaceId: string;
  name: string;
  fileType: FileType;
  fileSize: number;
  storagePath: string;
  version: number;
  classification: DocumentClassification;
  metadata: Record<string, unknown>;
  encryptionAlgorithm: string | null;
  wrappedKey: Buffer | null;
  pqcSignature: Buffer | null;
  contentText: string | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

// Workspace Types
export interface Workspace {
  id: string;
  tenantId: string;
  name: string;
  description: string | null;
  parentId: string | null;
  classification: DocumentClassification;
  metadata: Record<string, unknown>;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

// Audit Log Types
export type AuditAction =
  | 'login'
  | 'logout'
  | 'login_failed'
  | 'upload'
  | 'download'
  | 'view'
  | 'search'
  | 'export'
  | 'delete'
  | 'update'
  | 'create_workspace'
  | 'ai_query'
  | 'pqc_scan'
  | 'config_change';

export interface AuditLog {
  id: string;
  tenantId: string | null;
  userId: string | null;
  action: AuditAction;
  resourceType: string | null;
  resourceId: string | null;
  metadata: Record<string, unknown>;
  ipAddress: string | null;
  userAgent: string | null;
  timestamp: Date;
}

// Compliance Types
export type ComplianceFramework = 'soc2' | 'cmmc' | 'nist_rmf' | 'hipaa' | 'pci';

export type ControlStatus = 'met' | 'partial' | 'not_met';

export interface ComplianceControl {
  id: string;
  tenantId: string;
  framework: ComplianceFramework;
  controlId: string;
  controlName: string;
  description: string;
  ownerId: string | null;
  status: ControlStatus;
  evidenceIds: string[];
  lastReviewed: Date | null;
  createdAt: Date;
}

// QBOM Types
export type MigrationStatus = 'not_started' | 'in_progress' | 'completed';

export interface QBOMEntry {
  id: string;
  tenantId: string;
  componentName: string;
  componentType: string;
  cryptoAlgorithms: string[];
  quantumSafe: boolean;
  migrationStatus: MigrationStatus;
  scanDate: Date;
  metadata: Record<string, unknown>;
  createdAt: Date;
}

// Plugin Types
export type PluginName = 'pqc-scanner' | 'q-cmm' | 'deep-research';

export interface Plugin {
  id: string;
  tenantId: string;
  pluginName: PluginName;
  enabled: boolean;
  configuration: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

// Search Types
export interface SearchResult {
  id: string;
  documentId: string;
  workspaceId: string;
  name: string;
  snippet: string;
  score: number;
  classification: DocumentClassification;
  createdAt: Date;
}

export interface SearchQuery {
  query: string;
  tenantId: string;
  userId: string;
  filters?: {
    workspaceId?: string;
    classification?: DocumentClassification[];
    fileType?: FileType[];
    dateRange?: {
      start: Date;
      end: Date;
    };
  };
  limit?: number;
  offset?: number;
}

// AI Types
export interface AIQuery {
  query: string;
  tenantId: string;
  userId: string;
  workspaceId?: string;
  contextDocumentIds?: string[];
}

export interface AIResponse {
  answer: string;
  citations: {
    documentId: string;
    snippet: string;
    relevance: number;
  }[];
  redactedEntities: {
    type: string;
    count: number;
  }[];
  model: string;
  timestamp: Date;
}

// PQC Types
export interface PQCKeyPair {
  publicKey: Buffer;
  privateKey: Buffer;
  algorithm: 'ML-KEM-768' | 'ML-KEM-1024' | 'ML-DSA-65' | 'ML-DSA-87';
  createdAt: Date;
}

export interface EncryptedBlob {
  ciphertext: Buffer;
  wrappedKey: Buffer;
  signature: Buffer;
  algorithm: string;
  timestamp: number;
}

// API Response Types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  metadata?: {
    page?: number;
    limit?: number;
    total?: number;
  };
}

// Pagination Types
export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
