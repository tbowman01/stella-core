/**
 * Hybrid search combining full-text and semantic search
 */

import { SearchQuery, SearchResult, SearchResponse } from './types';
import { performFullTextSearch } from './fulltext';
import { performSemanticSearch } from './semantic';

/**
 * Perform hybrid search (combines full-text and semantic)
 */
export async function performHybridSearch(
  searchQuery: SearchQuery,
  queryEmbedding?: number[]
): Promise<SearchResponse> {
  const startTime = Date.now();

  // Determine weights (customizable)
  const weights = {
    fulltext: 0.6,
    semantic: 0.4,
  };

  // Run both searches in parallel
  const [ftsResults, semanticResults] = await Promise.all([
    performFullTextSearch(searchQuery),
    queryEmbedding
      ? performSemanticSearch(searchQuery, queryEmbedding)
      : Promise.resolve({ results: [], total: 0, took: 0 }),
  ]);

  // Merge and re-rank results
  const mergedResults = mergeResults(
    ftsResults.results,
    semanticResults.results,
    weights
  );

  // Apply pagination
  const limit = searchQuery.options?.limit || 20;
  const offset = searchQuery.options?.offset || 0;
  const paginatedResults = mergedResults.slice(offset, offset + limit);

  // Calculate total (use max of both searches)
  const total = Math.max(ftsResults.total, semanticResults.total);
  const pages = Math.ceil(total / limit);
  const page = Math.floor(offset / limit) + 1;

  const took = Date.now() - startTime;

  return {
    results: paginatedResults,
    total,
    page,
    pages,
    took,
    query: searchQuery.query,
  };
}

/**
 * Merge and re-rank results from multiple sources
 */
function mergeResults(
  ftsResults: SearchResult[],
  semanticResults: SearchResult[],
  weights: { fulltext: number; semantic: number }
): SearchResult[] {
  // Create a map to combine scores for same documents
  const scoreMap = new Map<string, { result: SearchResult; ftsScore: number; semanticScore: number }>();

  // Process FTS results
  for (const result of ftsResults) {
    scoreMap.set(result.documentId, {
      result,
      ftsScore: result.score,
      semanticScore: 0,
    });
  }

  // Process semantic results
  for (const result of semanticResults) {
    const existing = scoreMap.get(result.documentId);
    if (existing) {
      existing.semanticScore = result.score;
    } else {
      scoreMap.set(result.documentId, {
        result,
        ftsScore: 0,
        semanticScore: result.score,
      });
    }
  }

  // Calculate combined scores
  const combined: SearchResult[] = [];

  for (const [documentId, data] of scoreMap.entries()) {
    const combinedScore =
      weights.fulltext * normalizeScore(data.ftsScore) +
      weights.semantic * normalizeScore(data.semanticScore);

    combined.push({
      ...data.result,
      score: combinedScore,
      matchType: data.ftsScore > 0 && data.semanticScore > 0 ? 'exact' : data.result.matchType,
    });
  }

  // Sort by combined score
  combined.sort((a, b) => b.score - a.score);

  return combined;
}

/**
 * Normalize scores to 0-1 range
 */
function normalizeScore(score: number): number {
  // FTS scores are typically 0-1, semantic similarity is 0-1
  // Ensure they're in 0-1 range
  return Math.max(0, Math.min(1, score));
}

/**
 * Smart search that auto-detects search mode
 */
export async function smartSearch(
  searchQuery: SearchQuery,
  queryEmbedding?: number[]
): Promise<SearchResponse> {
  const mode = searchQuery.options?.searchMode || 'hybrid';

  switch (mode) {
    case 'fulltext':
      const ftsResult = await performFullTextSearch(searchQuery);
      return {
        results: ftsResult.results,
        total: ftsResult.total,
        page: Math.floor((searchQuery.options?.offset || 0) / (searchQuery.options?.limit || 20)) + 1,
        pages: Math.ceil(ftsResult.total / (searchQuery.options?.limit || 20)),
        took: ftsResult.took,
        query: searchQuery.query,
      };

    case 'semantic':
      if (!queryEmbedding) {
        throw new Error('Query embedding required for semantic search');
      }
      const semanticResult = await performSemanticSearch(searchQuery, queryEmbedding);
      return {
        results: semanticResult.results,
        total: semanticResult.total,
        page: Math.floor((searchQuery.options?.offset || 0) / (searchQuery.options?.limit || 20)) + 1,
        pages: Math.ceil(semanticResult.total / (searchQuery.options?.limit || 20)),
        took: semanticResult.took,
        query: searchQuery.query,
      };

    case 'hybrid':
    default:
      return performHybridSearch(searchQuery, queryEmbedding);
  }
}

/**
 * Re-rank results using custom scoring
 */
export function rerank(
  results: SearchResult[],
  options: {
    boostRecent?: boolean;
    boostClassification?: string[];
    boostFileTypes?: string[];
  } = {}
): SearchResult[] {
  const reranked = results.map((result) => {
    let score = result.score;

    // Boost recent documents
    if (options.boostRecent) {
      const ageInDays = (Date.now() - result.createdAt.getTime()) / (1000 * 60 * 60 * 24);
      if (ageInDays < 7) {
        score *= 1.2; // 20% boost for last week
      } else if (ageInDays < 30) {
        score *= 1.1; // 10% boost for last month
      }
    }

    // Boost certain classifications
    if (options.boostClassification?.includes(result.classification)) {
      score *= 1.15;
    }

    // Boost certain file types
    if (options.boostFileTypes?.includes(result.fileType)) {
      score *= 1.1;
    }

    return { ...result, score };
  });

  return reranked.sort((a, b) => b.score - a.score);
}
