/**
 * Database utility functions
 */

import { prisma } from './index';

/**
 * Set tenant context for row-level security
 * This function should be called at the start of each request
 */
export async function setTenantContext(tenantId: string) {
  await prisma.$executeRawUnsafe(`SET app.current_tenant = '${tenantId}'`);
}

/**
 * Clear tenant context
 */
export async function clearTenantContext() {
  await prisma.$executeRawUnsafe(`RESET app.current_tenant`);
}

/**
 * Execute a query within a tenant context
 */
export async function withTenantContext<T>(
  tenantId: string,
  fn: () => Promise<T>
): Promise<T> {
  try {
    await setTenantContext(tenantId);
    return await fn();
  } finally {
    await clearTenantContext();
  }
}

/**
 * Health check for database connection
 */
export async function healthCheck(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    console.error('Database health check failed:', error);
    return false;
  }
}

/**
 * Get database statistics
 */
export async function getDatabaseStats() {
  const [tenants, users, documents, workspaces] = await Promise.all([
    prisma.tenant.count(),
    prisma.user.count(),
    prisma.document.count(),
    prisma.workspace.count(),
  ]);

  return {
    tenants,
    users,
    documents,
    workspaces,
  };
}

/**
 * Clean up old audit logs
 * @param retentionDays Number of days to retain audit logs
 */
export async function cleanupOldAuditLogs(retentionDays: number = 2555) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

  const result = await prisma.auditLog.deleteMany({
    where: {
      timestamp: {
        lt: cutoffDate,
      },
    },
  });

  return result.count;
}

/**
 * Create full-text search vector for a document
 * This uses PostgreSQL's built-in full-text search
 */
export async function updateDocumentSearchVector(documentId: string) {
  await prisma.$executeRaw`
    UPDATE documents
    SET fts_vector = to_tsvector('english', coalesce(name, '') || ' ' || coalesce(content_text, ''))
    WHERE id = ${documentId}::uuid
  `;
}

/**
 * Batch update search vectors for multiple documents
 */
export async function batchUpdateSearchVectors(documentIds: string[]) {
  await prisma.$executeRaw`
    UPDATE documents
    SET fts_vector = to_tsvector('english', coalesce(name, '') || ' ' || coalesce(content_text, ''))
    WHERE id = ANY(${documentIds}::uuid[])
  `;
}

/**
 * Full-text search across documents
 */
export async function fullTextSearch(
  tenantId: string,
  query: string,
  options: {
    limit?: number;
    offset?: number;
    workspaceId?: string;
  } = {}
) {
  const { limit = 20, offset = 0, workspaceId } = options;

  const whereClause = workspaceId
    ? `AND workspace_id = '${workspaceId}'::uuid`
    : '';

  const results = await prisma.$queryRaw<
    Array<{
      id: string;
      name: string;
      workspace_id: string;
      classification: string;
      rank: number;
    }>
  >`
    SELECT
      id,
      name,
      workspace_id,
      classification,
      ts_rank(fts_vector, query) as rank
    FROM documents, to_tsquery('english', ${query}) query
    WHERE tenant_id = ${tenantId}::uuid
      AND fts_vector @@ query
      ${whereClause}
    ORDER BY rank DESC
    LIMIT ${limit}
    OFFSET ${offset}
  `;

  return results;
}

/**
 * Semantic search using pgvector
 * Note: This requires the embedding column to be populated
 */
export async function semanticSearch(
  tenantId: string,
  embedding: number[],
  options: {
    limit?: number;
    workspaceId?: string;
  } = {}
) {
  const { limit = 20, workspaceId } = options;

  const whereClause = workspaceId
    ? `AND workspace_id = '${workspaceId}'::uuid`
    : '';

  // Convert embedding array to pgvector format
  const embeddingStr = `[${embedding.join(',')}]`;

  const results = await prisma.$queryRaw<
    Array<{
      id: string;
      name: string;
      workspace_id: string;
      classification: string;
      similarity: number;
    }>
  >`
    SELECT
      id,
      name,
      workspace_id,
      classification,
      1 - (embedding <=> ${embeddingStr}::vector) as similarity
    FROM documents
    WHERE tenant_id = ${tenantId}::uuid
      ${whereClause}
    ORDER BY embedding <=> ${embeddingStr}::vector
    LIMIT ${limit}
  `;

  return results;
}

/**
 * Hybrid search combining full-text and semantic search
 */
export async function hybridSearch(
  tenantId: string,
  query: string,
  embedding: number[],
  options: {
    limit?: number;
    offset?: number;
    workspaceId?: string;
    weights?: { fts: number; semantic: number };
  } = {}
) {
  const {
    limit = 20,
    offset = 0,
    workspaceId,
    weights = { fts: 0.6, semantic: 0.4 },
  } = options;

  const whereClause = workspaceId
    ? `AND workspace_id = '${workspaceId}'::uuid`
    : '';

  const embeddingStr = `[${embedding.join(',')}]`;

  const results = await prisma.$queryRaw<
    Array<{
      id: string;
      name: string;
      workspace_id: string;
      classification: string;
      fts_rank: number;
      semantic_similarity: number;
      combined_score: number;
    }>
  >`
    SELECT
      id,
      name,
      workspace_id,
      classification,
      ts_rank(fts_vector, query) as fts_rank,
      1 - (embedding <=> ${embeddingStr}::vector) as semantic_similarity,
      (
        ${weights.fts} * ts_rank(fts_vector, query) +
        ${weights.semantic} * (1 - (embedding <=> ${embeddingStr}::vector))
      ) as combined_score
    FROM documents, to_tsquery('english', ${query}) query
    WHERE tenant_id = ${tenantId}::uuid
      AND fts_vector @@ query
      ${whereClause}
    ORDER BY combined_score DESC
    LIMIT ${limit}
    OFFSET ${offset}
  `;

  return results;
}
