/**
 * Search analytics and insights
 */

import { prisma } from '@arcqubit/database';
import { SearchAnalytics } from './types';

/**
 * Get search analytics for tenant
 */
export async function getSearchAnalytics(
  tenantId: string,
  startDate: Date,
  endDate: Date
): Promise<SearchAnalytics> {
  // Get all search events
  const searchLogs = await prisma.auditLog.findMany({
    where: {
      tenantId,
      action: 'search',
      timestamp: {
        gte: startDate,
        lte: endDate,
      },
    },
    select: {
      userId: true,
      metadata: true,
      timestamp: true,
    },
  });

  const totalSearches = searchLogs.length;
  const uniqueUsers = new Set(searchLogs.map((l) => l.userId).filter(Boolean)).size;

  // Calculate average results per search
  let totalResults = 0;
  const queryCounts = new Map<string, number>();
  const zeroResultQueries = new Map<string, number>();

  for (const log of searchLogs) {
    const metadata = log.metadata as any;
    const query = metadata?.query;
    const resultCount = metadata?.resultCount || 0;

    totalResults += resultCount;

    if (query) {
      queryCounts.set(query, (queryCounts.get(query) || 0) + 1);

      if (resultCount === 0) {
        zeroResultQueries.set(query, (zeroResultQueries.get(query) || 0) + 1);
      }
    }
  }

  const averageResultsPerSearch = totalSearches > 0 ? totalResults / totalSearches : 0;

  // Top queries
  const topQueries = Array.from(queryCounts.entries())
    .map(([query, count]) => ({ query, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Zero result queries
  const zeroResults = Array.from(zeroResultQueries.entries())
    .map(([query, count]) => ({ query, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Searches by day
  const searchesByDay = groupSearchesByDay(searchLogs, startDate, endDate);

  // Average response time (would need to be tracked separately)
  const averageResponseTime = 250; // Placeholder

  return {
    totalSearches,
    uniqueUsers,
    averageResultsPerSearch,
    topQueries,
    zeroResultQueries: zeroResults,
    averageResponseTime,
    searchesByDay,
  };
}

/**
 * Group searches by day
 */
function groupSearchesByDay(
  logs: Array<{ timestamp: Date }>,
  startDate: Date,
  endDate: Date
): Array<{ date: string; count: number }> {
  const dayMap = new Map<string, number>();

  // Initialize all days in range
  const current = new Date(startDate);
  while (current <= endDate) {
    const dateStr = current.toISOString().split('T')[0];
    dayMap.set(dateStr, 0);
    current.setDate(current.getDate() + 1);
  }

  // Count searches per day
  for (const log of logs) {
    const dateStr = log.timestamp.toISOString().split('T')[0];
    dayMap.set(dateStr, (dayMap.get(dateStr) || 0) + 1);
  }

  return Array.from(dayMap.entries())
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Get search performance metrics
 */
export async function getSearchPerformance(
  tenantId: string,
  days: number = 7
): Promise<{
  averageResponseTime: number;
  slowQueries: Array<{ query: string; time: number }>;
  failedSearches: number;
}> {
  // This would require tracking response times
  // For now, return placeholder
  return {
    averageResponseTime: 250,
    slowQueries: [],
    failedSearches: 0,
  };
}

/**
 * Get search trends
 */
export async function getSearchTrends(
  tenantId: string,
  days: number = 30
): Promise<{
  trendingQueries: Array<{ query: string; count: number; growth: number }>;
  emergingTopics: string[];
}> {
  // Analyze query patterns over time
  // For MVP, return placeholder
  return {
    trendingQueries: [],
    emergingTopics: [],
  };
}

/**
 * Get user search behavior
 */
export async function getUserSearchBehavior(
  userId: string,
  tenantId: string,
  days: number = 30
): Promise<{
  totalSearches: number;
  uniqueQueries: number;
  averageResultsClicked: number;
  favoriteWorkspaces: string[];
}> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const searchLogs = await prisma.auditLog.findMany({
    where: {
      userId,
      tenantId,
      action: 'search',
      timestamp: {
        gte: startDate,
      },
    },
    select: {
      metadata: true,
    },
  });

  const queries = new Set<string>();
  for (const log of searchLogs) {
    const query = (log.metadata as any)?.query;
    if (query) queries.add(query);
  }

  return {
    totalSearches: searchLogs.length,
    uniqueQueries: queries.size,
    averageResultsClicked: 2.5, // Placeholder
    favoriteWorkspaces: [], // Would need click tracking
  };
}
