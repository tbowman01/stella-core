/**
 * AI types
 */

export type AIProvider = 'anthropic' | 'openai';

export interface AIConfig {
  provider: AIProvider;
  model: string;
  apiKey: string;
  maxTokens?: number;
  temperature?: number;
  fallbackProvider?: AIProvider;
}

export interface AIQuery {
  query: string;
  tenantId: string;
  userId: string;
  workspaceId?: string;
  contextDocumentIds?: string[];
  conversationId?: string;
  options?: AIQueryOptions;
}

export interface AIQueryOptions {
  maxContext?: number; // Max documents to include
  includeWorkspace?: boolean;
  redactPHI?: boolean;
  redactPII?: boolean;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface AIResponse {
  answer: string;
  citations: Citation[];
  redactedEntities: RedactedEntity[];
  model: string;
  provider: AIProvider;
  tokensUsed: number;
  cost: number; // USD
  conversationId?: string;
  timestamp: Date;
}

export interface Citation {
  documentId: string;
  documentName: string;
  snippet: string;
  relevance: number;
  pageNumber?: number;
}

export interface RedactedEntity {
  type: 'PHI' | 'PII' | 'SSN' | 'EMAIL' | 'PHONE' | 'CREDIT_CARD' | 'NAME' | 'ADDRESS';
  count: number;
  examples?: string[]; // Redacted examples for audit
}

export interface Conversation {
  id: string;
  tenantId: string;
  userId: string;
  title: string;
  messages: ConversationMessage[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citations?: Citation[];
  timestamp: Date;
}

export interface EmbeddingRequest {
  text: string;
  model?: string;
}

export interface EmbeddingResponse {
  embedding: number[];
  model: string;
  tokensUsed: number;
}

export interface AIUsageStats {
  totalQueries: number;
  totalTokens: number;
  totalCost: number;
  queriesByModel: { model: string; count: number }[];
  averageResponseTime: number;
  redactionCount: number;
}
