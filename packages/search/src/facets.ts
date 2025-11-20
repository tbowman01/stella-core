/**
 * Search facets for filtering
 */

import { prisma } from '@arcqubit/database';
import { SearchFacets, SearchQuery } from './types';

/**
 * Generate search facets for filtering
 */
export async function generateFacets(
  searchQuery: SearchQuery
): Promise<SearchFacets> {
  const { tenantId, filters } = searchQuery;

  // Base where clause (without certain filters to show all options)
  const baseWhere: any = { tenantId };

  // If searching within specific workspaces, maintain that
  if (filters?.workspaceIds && filters.workspaceIds.length > 0) {
    baseWhere.workspaceId = { in: filters.workspaceIds };
  }

  // Get facet counts in parallel
  const [workspaceFacets, classificationFacets, fileTypeFacets, authorFacets] = await Promise.all([
    getWorkspaceFacets(tenantId, baseWhere),
    getClassificationFacets(tenantId, baseWhere),
    getFileTypeFacets(tenantId, baseWhere),
    getAuthorFacets(tenantId, baseWhere),
  ]);

  const dateRangeFacets = getDateRangeFacets();

  return {
    workspaces: workspaceFacets,
    classifications: classificationFacets,
    fileTypes: fileTypeFacets,
    dateRanges: dateRangeFacets,
    authors: authorFacets,
  };
}

/**
 * Get workspace facets
 */
async function getWorkspaceFacets(
  tenantId: string,
  baseWhere: any
): Promise<Array<{ id: string; name: string; count: number }>> {
  const results = await prisma.document.groupBy({
    by: ['workspaceId'],
    where: baseWhere,
    _count: true,
  });

  // Get workspace names
  const workspaceIds = results.map((r) => r.workspaceId);
  const workspaces = await prisma.workspace.findMany({
    where: { id: { in: workspaceIds } },
    select: { id: true, name: true },
  });

  const workspaceMap = new Map(workspaces.map((w) => [w.id, w.name]));

  return results
    .map((r) => ({
      id: r.workspaceId,
      name: workspaceMap.get(r.workspaceId) || 'Unknown',
      count: r._count,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10); // Top 10 workspaces
}

/**
 * Get classification facets
 */
async function getClassificationFacets(
  tenantId: string,
  baseWhere: any
): Promise<Array<{ classification: any; count: number }>> {
  const results = await prisma.document.groupBy({
    by: ['classification'],
    where: baseWhere,
    _count: true,
  });

  return results
    .map((r) => ({
      classification: r.classification as any,
      count: r._count,
    }))
    .sort((a, b) => b.count - a.count);
}

/**
 * Get file type facets
 */
async function getFileTypeFacets(
  tenantId: string,
  baseWhere: any
): Promise<Array<{ fileType: any; count: number }>> {
  const results = await prisma.document.groupBy({
    by: ['fileType'],
    where: baseWhere,
    _count: true,
  });

  return results
    .map((r) => ({
      fileType: r.fileType as any,
      count: r._count,
    }))
    .sort((a, b) => b.count - a.count);
}

/**
 * Get author facets
 */
async function getAuthorFacets(
  tenantId: string,
  baseWhere: any
): Promise<Array<{ userId: string; name: string; count: number }>> {
  const results = await prisma.document.groupBy({
    by: ['createdBy'],
    where: baseWhere,
    _count: true,
  });

  // Get user names
  const userIds = results.map((r) => r.createdBy);
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, fullName: true, email: true },
  });

  const userMap = new Map(users.map((u) => [u.id, u.fullName || u.email]));

  return results
    .map((r) => ({
      userId: r.createdBy,
      name: userMap.get(r.createdBy) || 'Unknown',
      count: r._count,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10); // Top 10 authors
}

/**
 * Get predefined date range facets
 */
function getDateRangeFacets(): Array<{ range: string; count: number }> {
  // These would need to be calculated with actual queries
  // For now, return structure
  return [
    { range: 'Last 24 hours', count: 0 },
    { range: 'Last 7 days', count: 0 },
    { range: 'Last 30 days', count: 0 },
    { range: 'Last 90 days', count: 0 },
    { range: 'Last year', count: 0 },
    { range: 'Older', count: 0 },
  ];
}

/**
 * Count documents in date range
 */
export async function countByDateRange(
  tenantId: string,
  start: Date,
  end: Date
): Promise<number> {
  return prisma.document.count({
    where: {
      tenantId,
      createdAt: {
        gte: start,
        lte: end,
      },
    },
  });
}
