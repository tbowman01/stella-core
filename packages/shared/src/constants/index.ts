/**
 * Application constants
 */

// User roles in order of privilege
export const USER_ROLES = ['viewer', 'contributor', 'manager', 'admin'] as const;

// Classification levels in order of sensitivity
export const CLASSIFICATION_LEVELS = [
  'public',
  'internal',
  'confidential',
  'restricted',
] as const;

// Supported file types
export const SUPPORTED_FILE_TYPES = {
  pdf: { extension: '.pdf', mimeType: 'application/pdf' },
  docx: {
    extension: '.docx',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  },
  xlsx: {
    extension: '.xlsx',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  },
  pptx: {
    extension: '.pptx',
    mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  },
  txt: { extension: '.txt', mimeType: 'text/plain' },
  md: { extension: '.md', mimeType: 'text/markdown' },
} as const;

// Maximum file size (500MB)
export const MAX_FILE_SIZE = 500 * 1024 * 1024;

// Audit log retention (7 years for SOC 2 compliance)
export const AUDIT_LOG_RETENTION_DAYS = 2555;

// PQC Algorithms
export const PQC_ALGORITHMS = {
  KEM: {
    'ML-KEM-768': { keySize: 2400, ciphertextSize: 1088 },
    'ML-KEM-1024': { keySize: 3168, ciphertextSize: 1568 },
  },
  SIGNATURE: {
    'ML-DSA-65': { publicKeySize: 1952, signatureSize: 3309 },
    'ML-DSA-87': { publicKeySize: 2592, signatureSize: 4627 },
  },
} as const;

// Compliance frameworks
export const COMPLIANCE_FRAMEWORKS = {
  soc2: {
    name: 'SOC 2 Type II',
    controlCategories: ['CC6', 'CC7', 'CC8'],
  },
  cmmc: {
    name: 'CMMC Level 2',
    controlCategories: ['AC', 'AU', 'SC', 'SI'],
  },
  nist_rmf: {
    name: 'NIST Risk Management Framework',
    controlCategories: ['AC', 'AU', 'SC', 'SI', 'IR'],
  },
} as const;

// Rate limiting
export const RATE_LIMITS = {
  api: { windowMs: 15 * 60 * 1000, max: 100 }, // 100 requests per 15 minutes
  login: { windowMs: 15 * 60 * 1000, max: 5 }, // 5 login attempts per 15 minutes
  search: { windowMs: 60 * 1000, max: 30 }, // 30 searches per minute
  aiQuery: { windowMs: 60 * 1000, max: 10 }, // 10 AI queries per minute
} as const;

// Cache TTLs (in seconds)
export const CACHE_TTL = {
  user: 300, // 5 minutes
  tenant: 600, // 10 minutes
  document: 180, // 3 minutes
  search: 60, // 1 minute
} as const;

// Embedding dimensions (OpenAI ada-002)
export const EMBEDDING_DIMENSIONS = 1536;

// AI model configurations
export const AI_MODELS = {
  claude: {
    name: 'claude-3-5-sonnet-20241022',
    maxTokens: 4096,
    temperature: 0.7,
  },
  gpt: {
    name: 'gpt-4-turbo-preview',
    maxTokens: 4096,
    temperature: 0.7,
  },
} as const;

// Watermark template
export const WATERMARK_TEMPLATE = (user: string, timestamp: string) =>
  `Downloaded by ${user} on ${timestamp} - Confidential - Do Not Distribute`;

// Error codes
export const ERROR_CODES = {
  UNAUTHORIZED: 'E_UNAUTHORIZED',
  FORBIDDEN: 'E_FORBIDDEN',
  NOT_FOUND: 'E_NOT_FOUND',
  VALIDATION_ERROR: 'E_VALIDATION',
  INTERNAL_ERROR: 'E_INTERNAL',
  RATE_LIMIT_EXCEEDED: 'E_RATE_LIMIT',
  FILE_TOO_LARGE: 'E_FILE_TOO_LARGE',
  UNSUPPORTED_FILE_TYPE: 'E_UNSUPPORTED_FILE',
  PQC_ERROR: 'E_PQC',
  AI_ERROR: 'E_AI',
} as const;
