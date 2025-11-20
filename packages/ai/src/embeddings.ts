/**
 * Embedding generation for semantic search
 */

import { getOpenAIClient } from './client';
import { EmbeddingRequest, EmbeddingResponse } from './types';
import { storeEmbedding } from '@arcqubit/search';

/**
 * Generate embedding using OpenAI
 */
export async function generateEmbedding(
  request: EmbeddingRequest
): Promise<EmbeddingResponse> {
  const client = getOpenAIClient();

  const response = await client.embeddings.create({
    model: request.model || 'text-embedding-ada-002',
    input: request.text,
  });

  return {
    embedding: response.data[0].embedding,
    model: response.model,
    tokensUsed: response.usage.total_tokens,
  };
}

/**
 * Generate and store embedding for document
 */
export async function embedDocument(
  documentId: string,
  text: string
): Promise<void> {
  // Truncate text if too long (ada-002 max is 8191 tokens, ~32k chars)
  const truncated = text.slice(0, 30000);

  const { embedding } = await generateEmbedding({ text: truncated });

  await storeEmbedding(documentId, embedding);
}

/**
 * Batch generate embeddings
 */
export async function batchGenerateEmbeddings(
  texts: string[]
): Promise<number[][]> {
  const client = getOpenAIClient();

  // OpenAI supports batch embedding
  const response = await client.embeddings.create({
    model: 'text-embedding-ada-002',
    input: texts,
  });

  return response.data.map((d) => d.embedding);
}

/**
 * Process documents without embeddings
 */
export async function processDocumentsWithoutEmbeddings(
  tenantId: string,
  batchSize: number = 10
): Promise<number> {
  const { getDocumentsWithoutEmbeddings } = await import('@arcqubit/search');

  const documents = await getDocumentsWithoutEmbeddings(tenantId, batchSize);

  for (const doc of documents) {
    try {
      await embedDocument(doc.id, doc.contentText);
    } catch (error) {
      console.error(`Failed to embed document ${doc.id}:`, error);
    }
  }

  return documents.length;
}

/**
 * Re-embed all documents (for model upgrades)
 */
export async function reembedAllDocuments(tenantId: string): Promise<void> {
  const { prisma } = await import('@arcqubit/database');

  const documents = await prisma.document.findMany({
    where: {
      tenantId,
      contentText: { not: null },
    },
    select: {
      id: true,
      contentText: true,
    },
  });

  console.log(`Re-embedding ${documents.length} documents...`);

  for (let i = 0; i < documents.length; i++) {
    const doc = documents[i];

    try {
      await embedDocument(doc.id, doc.contentText!);

      if ((i + 1) % 10 === 0) {
        console.log(`Progress: ${i + 1}/${documents.length}`);
      }
    } catch (error) {
      console.error(`Failed to re-embed document ${doc.id}:`, error);
    }
  }

  console.log('Re-embedding complete!');
}
