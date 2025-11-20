/**
 * Search suggestions and autocomplete
 */

import { prisma } from '@arcqubit/database';
import { SearchSuggestion, SavedSearch } from './types';

// In-memory cache for popular searches (for MVP)
const searchHistory = new Map<string, { query: string; count: number; lastUsed: Date }>();

/**
 * Get search suggestions
 */
export async function getSuggestions(
  partialQuery: string,
  tenantId: string,
  userId: string,
  limit: number = 10
): Promise<SearchSuggestion[]> {
  const suggestions: SearchSuggestion[] = [];
  const lowerQuery = partialQuery.toLowerCase();

  // 1. Recent searches by this user
  const recentSearches = await getRecentSearches(userId, tenantId, 5);
  for (const search of recentSearches) {
    if (search.query.toLowerCase().includes(lowerQuery)) {
      suggestions.push({
        text: search.query,
        type: 'recent',
        score: 1.0,
      });
    }
  }

  // 2. Popular searches across tenant
  const popularSearches = getPopularSearches(tenantId, 5);
  for (const search of popularSearches) {
    if (search.toLowerCase().includes(lowerQuery)) {
      suggestions.push({
        text: search,
        type: 'popular',
        score: 0.8,
      });
    }
  }

  // 3. Document name completions
  const documentCompletions = await getDocumentNameCompletions(partialQuery, tenantId, 5);
  for (const name of documentCompletions) {
    suggestions.push({
      text: name,
      type: 'completion',
      score: 0.6,
    });
  }

  // Remove duplicates and sort by score
  const unique = Array.from(
    new Map(suggestions.map((s) => [s.text, s])).values()
  );

  return unique
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/**
 * Record search query
 */
export async function recordSearch(
  query: string,
  tenantId: string,
  userId: string,
  resultCount: number
): Promise<void> {
  const key = `${tenantId}:${query}`;

  const existing = searchHistory.get(key);
  if (existing) {
    existing.count++;
    existing.lastUsed = new Date();
  } else {
    searchHistory.set(key, {
      query,
      count: 1,
      lastUsed: new Date(),
    });
  }

  // Also log to audit
  await prisma.auditLog.create({
    data: {
      tenantId,
      userId,
      action: 'search',
      resourceType: 'document',
      metadata: {
        query,
        resultCount,
      },
    },
  });
}

/**
 * Get recent searches for user
 */
async function getRecentSearches(
  userId: string,
  tenantId: string,
  limit: number
): Promise<Array<{ query: string; timestamp: Date }>> {
  const logs = await prisma.auditLog.findMany({
    where: {
      userId,
      tenantId,
      action: 'search',
    },
    orderBy: { timestamp: 'desc' },
    take: limit * 2, // Get more to filter unique
  });

  const unique = new Map<string, Date>();
  for (const log of logs) {
    const query = (log.metadata as any)?.query;
    if (query && !unique.has(query)) {
      unique.set(query, log.timestamp);
    }
  }

  return Array.from(unique.entries())
    .map(([query, timestamp]) => ({ query, timestamp }))
    .slice(0, limit);
}

/**
 * Get popular searches
 */
function getPopularSearches(tenantId: string, limit: number): string[] {
  const searches = Array.from(searchHistory.entries())
    .filter(([key]) => key.startsWith(`${tenantId}:`))
    .map(([key, data]) => ({ query: data.query, count: data.count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);

  return searches.map((s) => s.query);
}

/**
 * Get document name completions
 */
async function getDocumentNameCompletions(
  partial: string,
  tenantId: string,
  limit: number
): Promise<string[]> {
  const documents = await prisma.document.findMany({
    where: {
      tenantId,
      name: {
        contains: partial,
        mode: 'insensitive',
      },
    },
    select: { name: true },
    take: limit,
    orderBy: { createdAt: 'desc' },
  });

  return documents.map((d) => d.name);
}

/**
 * Save search for later
 */
export async function saveSearch(
  userId: string,
  tenantId: string,
  name: string,
  query: string,
  filters?: any
): Promise<SavedSearch> {
  // Store in user metadata (for MVP)
  // In production, create a saved_searches table
  const saved: SavedSearch = {
    id: `${userId}-${Date.now()}`,
    userId,
    tenantId,
    name,
    query,
    filters,
    createdAt: new Date(),
    useCount: 0,
  };

  // TODO: Actually persist to database
  return saved;
}

/**
 * Get saved searches for user
 */
export async function getSavedSearches(
  userId: string,
  tenantId: string
): Promise<SavedSearch[]> {
  // TODO: Fetch from database
  return [];
}

/**
 * Delete saved search
 */
export async function deleteSavedSearch(searchId: string, userId: string): Promise<boolean> {
  // TODO: Delete from database
  return true;
}
