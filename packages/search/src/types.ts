/**
 * Search types
 */

import { DocumentClassification, FileType } from '@arcqubit/shared';

export interface SearchQuery {
  query: string;
  tenantId: string;
  userId: string;
  filters?: SearchFilters;
  options?: SearchOptions;
}

export interface SearchFilters {
  workspaceIds?: string[];
  classification?: DocumentClassification[];
  fileTypes?: FileType[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  createdBy?: string[];
  minSize?: number;
  maxSize?: number;
  tags?: string[];
}

export interface SearchOptions {
  limit?: number;
  offset?: number;
  sortBy?: 'relevance' | 'date' | 'name' | 'size';
  sortOrder?: 'asc' | 'desc';
  includeSnippets?: boolean;
  highlightTerms?: boolean;
  searchMode?: 'fulltext' | 'semantic' | 'hybrid';
}

export interface SearchResult {
  documentId: string;
  name: string;
  workspaceId: string;
  workspaceName: string;
  classification: DocumentClassification;
  fileType: FileType;
  fileSize: number;
  createdAt: Date;
  createdBy: string;
  score: number;
  snippet?: string;
  highlights?: string[];
  matchType: 'exact' | 'partial' | 'semantic';
}

export interface SearchResponse {
  results: SearchResult[];
  total: number;
  page: number;
  pages: number;
  took: number; // milliseconds
  query: string;
  facets?: SearchFacets;
}

export interface SearchFacets {
  workspaces: { id: string; name: string; count: number }[];
  classifications: { classification: DocumentClassification; count: number }[];
  fileTypes: { fileType: FileType; count: number }[];
  dateRanges: { range: string; count: number }[];
  authors: { userId: string; name: string; count: number }[];
}

export interface SearchSuggestion {
  text: string;
  type: 'recent' | 'popular' | 'completion';
  score: number;
}

export interface SavedSearch {
  id: string;
  userId: string;
  tenantId: string;
  name: string;
  query: string;
  filters?: SearchFilters;
  createdAt: Date;
  lastUsed?: Date;
  useCount: number;
}

export interface SearchAnalytics {
  totalSearches: number;
  uniqueUsers: number;
  averageResultsPerSearch: number;
  topQueries: { query: string; count: number }[];
  zeroResultQueries: { query: string; count: number }[];
  averageResponseTime: number;
  searchesByDay: { date: string; count: number }[];
}

export interface EmbeddingVector {
  documentId: string;
  embedding: number[];
  createdAt: Date;
}
