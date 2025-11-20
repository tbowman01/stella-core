/**
 * Semantic search using pgvector embeddings
 */

import { prisma } from '@arcqubit/database';
import { SearchQuery, SearchResult, EmbeddingVector } from './types';

/**
 * Perform semantic search using vector similarity
 */
export async function performSemanticSearch(
  searchQuery: SearchQuery,
  queryEmbedding: number[]
): Promise<{ results: SearchResult[]; total: number; took: number }> {
  const startTime = Date.now();

  // Convert embedding to pgvector format
  const embeddingStr = `[${queryEmbedding.join(',')}]`;

  // Build filter SQL
  const filterSQL = buildFilterSQL(searchQuery);

  // Execute semantic search
  const results = await prisma.$queryRawUnsafe<
    Array<{
      id: string;
      name: string;
      workspace_id: string;
      classification: string;
      file_type: string;
      file_size: bigint;
      created_at: Date;
      created_by: string;
      similarity: number;
      content_snippet: string;
    }>
  >`
    SELECT
      d.id,
      d.name,
      d.workspace_id,
      d.classification,
      d.file_type,
      d.file_size,
      d.created_at,
      d.created_by,
      1 - (d.embedding <=> '${embeddingStr}'::vector) as similarity,
      LEFT(d.content_text, 200) as content_snippet
    FROM documents d
    WHERE d.tenant_id = '${searchQuery.tenantId}'::uuid
      AND d.embedding IS NOT NULL
      ${filterSQL}
    ORDER BY d.embedding <=> '${embeddingStr}'::vector
    LIMIT ${searchQuery.options?.limit || 20}
    OFFSET ${searchQuery.options?.offset || 0}
  `;

  // Get total count (approximate for performance)
  const countResult = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>`
    SELECT COUNT(*) as count
    FROM documents d
    WHERE d.tenant_id = '${searchQuery.tenantId}'::uuid
      AND d.embedding IS NOT NULL
      ${filterSQL}
  `;

  const total = Number(countResult[0]?.count || 0);

  // Get workspace names
  const workspaceIds = [...new Set(results.map((r) => r.workspace_id))];
  const workspaces = await prisma.workspace.findMany({
    where: { id: { in: workspaceIds } },
    select: { id: true, name: true },
  });

  const workspaceMap = new Map(workspaces.map((w) => [w.id, w.name]));

  // Transform results
  const searchResults: SearchResult[] = results.map((r) => ({
    documentId: r.id,
    name: r.name,
    workspaceId: r.workspace_id,
    workspaceName: workspaceMap.get(r.workspace_id) || 'Unknown',
    classification: r.classification as any,
    fileType: r.file_type as any,
    fileSize: Number(r.file_size),
    createdAt: r.created_at,
    createdBy: r.created_by,
    score: Number(r.similarity),
    snippet: r.content_snippet,
    matchType: 'semantic',
  }));

  const took = Date.now() - startTime;

  return { results: searchResults, total, took };
}

/**
 * Store document embedding
 */
export async function storeEmbedding(
  documentId: string,
  embedding: number[]
): Promise<void> {
  const embeddingStr = `[${embedding.join(',')}]`;

  await prisma.$executeRawUnsafe(`
    UPDATE documents
    SET embedding = '${embeddingStr}'::vector
    WHERE id = '${documentId}'::uuid
  `);
}

/**
 * Get similar documents
 */
export async function findSimilarDocuments(
  documentId: string,
  tenantId: string,
  limit: number = 10
): Promise<SearchResult[]> {
  // Get source document embedding
  const sourceDoc = await prisma.$queryRawUnsafe<
    Array<{ embedding: string }>
  >`
    SELECT embedding::text as embedding
    FROM documents
    WHERE id = '${documentId}'::uuid
      AND tenant_id = '${tenantId}'::uuid
  `;

  if (!sourceDoc || sourceDoc.length === 0 || !sourceDoc[0].embedding) {
    return [];
  }

  const embedding = sourceDoc[0].embedding;

  // Find similar documents
  const results = await prisma.$queryRawUnsafe<
    Array<{
      id: string;
      name: string;
      workspace_id: string;
      classification: string;
      file_type: string;
      file_size: bigint;
      created_at: Date;
      created_by: string;
      similarity: number;
    }>
  >`
    SELECT
      d.id,
      d.name,
      d.workspace_id,
      d.classification,
      d.file_type,
      d.file_size,
      d.created_at,
      d.created_by,
      1 - (d.embedding <=> '${embedding}'::vector) as similarity
    FROM documents d
    WHERE d.tenant_id = '${tenantId}'::uuid
      AND d.id != '${documentId}'::uuid
      AND d.embedding IS NOT NULL
    ORDER BY d.embedding <=> '${embedding}'::vector
    LIMIT ${limit}
  `;

  // Get workspace names
  const workspaceIds = [...new Set(results.map((r) => r.workspace_id))];
  const workspaces = await prisma.workspace.findMany({
    where: { id: { in: workspaceIds } },
    select: { id: true, name: true },
  });

  const workspaceMap = new Map(workspaces.map((w) => [w.id, w.name]));

  return results.map((r) => ({
    documentId: r.id,
    name: r.name,
    workspaceId: r.workspace_id,
    workspaceName: workspaceMap.get(r.workspace_id) || 'Unknown',
    classification: r.classification as any,
    fileType: r.file_type as any,
    fileSize: Number(r.file_size),
    createdAt: r.created_at,
    createdBy: r.created_by,
    score: Number(r.similarity),
    matchType: 'semantic',
  }));
}

/**
 * Build filter SQL for semantic search
 */
function buildFilterSQL(searchQuery: SearchQuery): string {
  const filters = searchQuery.filters;
  if (!filters) return '';

  const conditions: string[] = [];

  if (filters.workspaceIds && filters.workspaceIds.length > 0) {
    const ids = filters.workspaceIds.map((id) => `'${id}'::uuid`).join(',');
    conditions.push(`AND d.workspace_id IN (${ids})`);
  }

  if (filters.classification && filters.classification.length > 0) {
    const classes = filters.classification.map((c) => `'${c}'`).join(',');
    conditions.push(`AND d.classification IN (${classes})`);
  }

  if (filters.fileTypes && filters.fileTypes.length > 0) {
    const types = filters.fileTypes.map((t) => `'${t}'`).join(',');
    conditions.push(`AND d.file_type IN (${types})`);
  }

  if (filters.dateRange) {
    conditions.push(
      `AND d.created_at >= '${filters.dateRange.start.toISOString()}'`
    );
    conditions.push(
      `AND d.created_at <= '${filters.dateRange.end.toISOString()}'`
    );
  }

  return conditions.join(' ');
}

/**
 * Batch update embeddings for documents without them
 */
export async function getDocumentsWithoutEmbeddings(
  tenantId: string,
  limit: number = 100
): Promise<Array<{ id: string; contentText: string }>> {
  const docs = await prisma.document.findMany({
    where: {
      tenantId,
      contentText: { not: null },
      // Note: Can't directly check embedding IS NULL in Prisma, use raw query
    },
    select: {
      id: true,
      contentText: true,
    },
    take: limit,
  });

  // Filter out docs that already have embeddings using raw query
  const docsWithoutEmbeddings = await prisma.$queryRaw<
    Array<{ id: string; content_text: string }>
  >`
    SELECT id, content_text
    FROM documents
    WHERE tenant_id = ${tenantId}::uuid
      AND content_text IS NOT NULL
      AND embedding IS NULL
    LIMIT ${limit}
  `;

  return docsWithoutEmbeddings.map((d) => ({
    id: d.id,
    contentText: d.content_text,
  }));
}
