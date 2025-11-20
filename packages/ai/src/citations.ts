/**
 * Citation extraction from AI responses
 */

import { Citation } from './types';

/**
 * Extract citations from AI response
 */
export function extractCitations(
  answer: string,
  documents: Array<{ id: string; name: string; contentText: string | null }>
): Citation[] {
  const citations: Citation[] = [];

  // Look for document references in the answer
  for (const doc of documents) {
    if (!doc.contentText) continue;

    // Check if document name is mentioned
    if (answer.includes(doc.name)) {
      citations.push({
        documentId: doc.id,
        documentName: doc.name,
        snippet: doc.contentText.slice(0, 200),
        relevance: 1.0,
      });
      continue;
    }

    // Check if significant phrases from doc appear in answer
    const phrases = extractSignificantPhrases(doc.contentText);
    let matchCount = 0;

    for (const phrase of phrases) {
      if (answer.toLowerCase().includes(phrase.toLowerCase())) {
        matchCount++;
      }
    }

    if (matchCount > 0) {
      const relevance = Math.min(1.0, matchCount / 5);

      citations.push({
        documentId: doc.id,
        documentName: doc.name,
        snippet: findBestSnippet(doc.contentText, phrases),
        relevance,
      });
    }
  }

  // Sort by relevance
  citations.sort((a, b) => b.relevance - a.relevance);

  return citations.slice(0, 5); // Top 5 citations
}

/**
 * Extract significant phrases from text
 */
function extractSignificantPhrases(text: string, count: number = 10): string[] {
  // Split into sentences
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [];

  // Get distinctive phrases (3-5 words)
  const phrases: string[] = [];

  for (const sentence of sentences.slice(0, 20)) {
    const words = sentence.trim().split(/\s+/);

    for (let i = 0; i < words.length - 3; i++) {
      const phrase = words.slice(i, i + 4).join(' ');

      // Skip phrases with common words only
      if (!/^(the|and|but|for|with|from|this|that|these|those)\s/i.test(phrase)) {
        phrases.push(phrase);
      }
    }
  }

  // Return unique phrases
  return Array.from(new Set(phrases)).slice(0, count);
}

/**
 * Find best snippet containing key phrases
 */
function findBestSnippet(text: string, phrases: string[], maxLength: number = 200): string {
  let bestSnippet = '';
  let maxMatches = 0;

  const sentences = text.match(/[^.!?]+[.!?]+/g) || [];

  for (let i = 0; i < sentences.length; i++) {
    // Take 2-3 sentences for context
    const snippet = sentences.slice(i, i + 3).join(' ');

    let matches = 0;
    for (const phrase of phrases) {
      if (snippet.toLowerCase().includes(phrase.toLowerCase())) {
        matches++;
      }
    }

    if (matches > maxMatches) {
      maxMatches = matches;
      bestSnippet = snippet;
    }
  }

  // Truncate if needed
  if (bestSnippet.length > maxLength) {
    bestSnippet = bestSnippet.slice(0, maxLength) + '...';
  }

  return bestSnippet || text.slice(0, maxLength);
}

/**
 * Format citations for display
 */
export function formatCitations(citations: Citation[]): string {
  if (citations.length === 0) return '';

  let formatted = '\n\n**Sources:**\n\n';

  citations.forEach((citation, index) => {
    formatted += `[${index + 1}] **${citation.documentName}**\n`;
    formatted += `   "${citation.snippet}"\n`;
    if (citation.pageNumber) {
      formatted += `   (Page ${citation.pageNumber})\n`;
    }
    formatted += '\n';
  });

  return formatted;
}

/**
 * Add citation markers to answer
 */
export function addCitationMarkers(answer: string, citations: Citation[]): string {
  let marked = answer;

  citations.forEach((citation, index) => {
    const marker = `[${index + 1}]`;

    // Try to add marker near relevant content
    // For simplicity, add at end of sentences mentioning the doc
    if (marked.includes(citation.documentName)) {
      marked = marked.replace(
        citation.documentName,
        `${citation.documentName}${marker}`
      );
    }
  });

  return marked;
}
