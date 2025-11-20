/**
 * Retrieval-Augmented Generation (RAG)
 */

import { AIQuery, AIResponse } from './types';
import { generateWithFallback, calculateCost } from './client';
import { generateEmbedding } from './embeddings';
import { smartSearch } from '@arcqubit/search';
import { redactPHI, redactPII } from './redaction';
import { extractCitations } from './citations';
import { buildRAGPrompt } from './prompts';
import { prisma } from '@arcqubit/database';

/**
 * Answer query using RAG
 */
export async function answerQueryWithRAG(query: AIQuery): Promise<AIResponse> {
  const startTime = Date.now();

  // Step 1: Generate embedding for semantic search
  const { embedding } = await generateEmbedding({ text: query.query });

  // Step 2: Retrieve relevant documents
  const searchResults = await smartSearch(
    {
      query: query.query,
      tenantId: query.tenantId,
      userId: query.userId,
      filters: query.workspaceId
        ? { workspaceIds: [query.workspaceId] }
        : undefined,
      options: {
        limit: query.options?.maxContext || 5,
        searchMode: 'hybrid',
      },
    },
    embedding
  );

  // Step 3: Get document content for top results
  const documentIds = searchResults.results.slice(0, 5).map((r) => r.documentId);
  const documents = await prisma.document.findMany({
    where: {
      id: { in: documentIds },
      tenantId: query.tenantId,
    },
    select: {
      id: true,
      name: true,
      contentText: true,
      classification: true,
    },
  });

  // Step 4: Build RAG prompt
  const prompt = buildRAGPrompt(query.query, documents);

  // Step 5: Generate answer
  const { text, tokensUsed, provider } = await generateWithFallback(
    prompt,
    'anthropic',
    {
      model: query.options?.model,
      maxTokens: query.options?.maxTokens || 4096,
      temperature: query.options?.temperature || 0.7,
    }
  );

  // Step 6: Redact PHI/PII if requested
  let answer = text;
  const redactedEntities = [];

  if (query.options?.redactPHI !== false) {
    const { redacted, entities } = redactPHI(answer);
    answer = redacted;
    redactedEntities.push(...entities);
  }

  if (query.options?.redactPII !== false) {
    const { redacted, entities } = redactPII(answer);
    answer = redacted;
    redactedEntities.push(...entities);
  }

  // Step 7: Extract citations
  const citations = extractCitations(answer, documents);

  // Step 8: Calculate cost
  const cost = calculateCost(provider, query.options?.model || 'claude-3-5-sonnet-20241022', tokensUsed);

  // Step 9: Create audit log
  await prisma.auditLog.create({
    data: {
      tenantId: query.tenantId,
      userId: query.userId,
      action: 'ai_query',
      resourceType: 'ai_assistant',
      metadata: {
        query: query.query,
        provider,
        model: query.options?.model,
        tokensUsed,
        cost,
        documentCount: documents.length,
        redactionCount: redactedEntities.reduce((sum, e) => sum + e.count, 0),
      },
    },
  });

  return {
    answer,
    citations,
    redactedEntities,
    model: query.options?.model || 'claude-3-5-sonnet-20241022',
    provider,
    tokensUsed,
    cost,
    conversationId: query.conversationId,
    timestamp: new Date(),
  };
}

/**
 * Summarize document using AI
 */
export async function summarizeDocument(
  documentId: string,
  tenantId: string,
  userId: string,
  options: {
    length?: 'short' | 'medium' | 'long';
    style?: 'executive' | 'technical' | 'plain';
  } = {}
): Promise<{ summary: string; tokensUsed: number; cost: number }> {
  const document = await prisma.document.findFirst({
    where: { id: documentId, tenantId },
    select: { name: true, contentText: true },
  });

  if (!document || !document.contentText) {
    throw new Error('Document not found or has no text content');
  }

  const lengthGuide = {
    short: '2-3 sentences',
    medium: '1 paragraph (5-7 sentences)',
    long: '2-3 paragraphs',
  };

  const styleGuide = {
    executive: 'executive summary style focusing on key decisions and outcomes',
    technical: 'technical summary preserving important details and terminology',
    plain: 'plain language summary accessible to general audience',
  };

  const prompt = `
Please summarize the following document in ${lengthGuide[options.length || 'medium']}.
Use ${styleGuide[options.style || 'plain']}.

Document: ${document.name}

Content:
${document.contentText.slice(0, 50000)}

Summary:
`;

  const { text, tokensUsed } = await generateWithFallback(prompt, 'anthropic', {
    maxTokens: 1024,
    temperature: 0.5,
  });

  const cost = calculateCost('anthropic', 'claude-3-5-sonnet-20241022', tokensUsed);

  // Create audit log
  await prisma.auditLog.create({
    data: {
      tenantId,
      userId,
      action: 'ai_query',
      resourceType: 'document',
      resourceId: documentId,
      metadata: {
        action: 'summarize',
        tokensUsed,
        cost,
      },
    },
  });

  return {
    summary: text,
    tokensUsed,
    cost,
  };
}

/**
 * Extract key points from document
 */
export async function extractKeyPoints(
  documentId: string,
  tenantId: string,
  userId: string,
  count: number = 5
): Promise<string[]> {
  const document = await prisma.document.findFirst({
    where: { id: documentId, tenantId },
    select: { contentText: true },
  });

  if (!document || !document.contentText) {
    throw new Error('Document not found or has no text content');
  }

  const prompt = `
Extract the ${count} most important key points from the following document.
Return only the key points as a numbered list.

Content:
${document.contentText.slice(0, 50000)}

Key Points:
`;

  const { text } = await generateWithFallback(prompt, 'anthropic', {
    maxTokens: 1024,
    temperature: 0.5,
  });

  // Parse numbered list
  const points = text
    .split('\n')
    .filter((line) => /^\d+\./.test(line.trim()))
    .map((line) => line.replace(/^\d+\.\s*/, '').trim());

  return points;
}
