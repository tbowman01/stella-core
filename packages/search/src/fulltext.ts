/**
 * Full-text search using PostgreSQL tsvector
 */

import { prisma } from '@arcqubit/database';
import { fullTextSearch } from '@arcqubit/database';
import { SearchQuery, SearchResult, SearchFilters } from './types';

/**
 * Perform full-text search
 */
export async function performFullTextSearch(
  searchQuery: SearchQuery
): Promise<{ results: SearchResult[]; total: number; took: number }> {
  const startTime = Date.now();

  // Build PostgreSQL tsquery
  const tsquery = buildTsQuery(searchQuery.query);

  // Build WHERE clause for filters
  const where = buildWhereClause(searchQuery.tenantId, searchQuery.filters);

  // Execute full-text search
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
      rank: number;
      snippet: string;
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
      ts_rank(d.fts_vector, query) as rank,
      ts_headline('english', d.content_text, query,
        'MaxWords=50, MinWords=25, ShortWord=3, MaxFragments=3') as snippet
    FROM documents d, to_tsquery('english', '${tsquery}') query
    WHERE d.tenant_id = '${searchQuery.tenantId}'::uuid
      AND d.fts_vector @@ query
      ${buildFilterSQL(searchQuery.filters)}
    ORDER BY rank DESC
    LIMIT ${searchQuery.options?.limit || 20}
    OFFSET ${searchQuery.options?.offset || 0}
  `;

  // Get total count
  const countResult = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>`
    SELECT COUNT(*) as count
    FROM documents d, to_tsquery('english', '${tsquery}') query
    WHERE d.tenant_id = '${searchQuery.tenantId}'::uuid
      AND d.fts_vector @@ query
      ${buildFilterSQL(searchQuery.filters)}
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
    score: Number(r.rank),
    snippet: r.snippet,
    matchType: 'exact',
  }));

  const took = Date.now() - startTime;

  return { results: searchResults, total, took };
}

/**
 * Build PostgreSQL tsquery from user query
 */
function buildTsQuery(query: string): string {
  // Sanitize and prepare query
  const sanitized = query
    .trim()
    .replace(/[^\w\s]/g, ' ') // Remove special chars except spaces
    .replace(/\s+/g, ' '); // Normalize spaces

  const terms = sanitized.split(' ').filter((t) => t.length > 0);

  if (terms.length === 0) return '';

  // Build tsquery with AND operators
  // e.g., "document management" -> "document & management"
  return terms.join(' & ');
}

/**
 * Build WHERE clause for filters
 */
function buildWhereClause(tenantId: string, filters?: SearchFilters): any {
  const where: any = { tenantId };

  if (!filters) return where;

  if (filters.workspaceIds && filters.workspaceIds.length > 0) {
    where.workspaceId = { in: filters.workspaceIds };
  }

  if (filters.classification && filters.classification.length > 0) {
    where.classification = { in: filters.classification };
  }

  if (filters.fileTypes && filters.fileTypes.length > 0) {
    where.fileType = { in: filters.fileTypes };
  }

  if (filters.dateRange) {
    where.createdAt = {
      gte: filters.dateRange.start,
      lte: filters.dateRange.end,
    };
  }

  if (filters.createdBy && filters.createdBy.length > 0) {
    where.createdBy = { in: filters.createdBy };
  }

  if (filters.minSize !== undefined || filters.maxSize !== undefined) {
    where.fileSize = {};
    if (filters.minSize !== undefined) {
      where.fileSize.gte = filters.minSize;
    }
    if (filters.maxSize !== undefined) {
      where.fileSize.lte = filters.maxSize;
    }
  }

  return where;
}

/**
 * Build SQL filter string for raw queries
 */
function buildFilterSQL(filters?: SearchFilters): string {
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

  if (filters.createdBy && filters.createdBy.length > 0) {
    const users = filters.createdBy.map((u) => `'${u}'::uuid`).join(',');
    conditions.push(`AND d.created_by IN (${users})`);
  }

  if (filters.minSize !== undefined) {
    conditions.push(`AND d.file_size >= ${filters.minSize}`);
  }

  if (filters.maxSize !== undefined) {
    conditions.push(`AND d.file_size <= ${filters.maxSize}`);
  }

  return conditions.join(' ');
}

/**
 * Search within a specific document
 */
export async function searchWithinDocument(
  documentId: string,
  tenantId: string,
  query: string
): Promise<{
  matches: { position: number; snippet: string }[];
  total: number;
}> {
  const document = await prisma.document.findFirst({
    where: { id: documentId, tenantId },
    select: { contentText: true },
  });

  if (!document || !document.contentText) {
    return { matches: [], total: 0 };
  }

  const text = document.contentText;
  const searchTerm = query.toLowerCase();
  const matches: { position: number; snippet: string }[] = [];

  let position = 0;
  while ((position = text.toLowerCase().indexOf(searchTerm, position)) !== -1) {
    const start = Math.max(0, position - 50);
    const end = Math.min(text.length, position + searchTerm.length + 50);
    const snippet = text.slice(start, end);

    matches.push({
      position,
      snippet: (start > 0 ? '...' : '') + snippet + (end < text.length ? '...' : ''),
    });

    position += searchTerm.length;
  }

  return { matches, total: matches.length };
}

/**
 * Get highlighted text for search results
 */
export function highlightText(text: string, terms: string[]): string {
  let highlighted = text;

  for (const term of terms) {
    const regex = new RegExp(`(${term})`, 'gi');
    highlighted = highlighted.replace(regex, '<mark>$1</mark>');
  }

  return highlighted;
}
