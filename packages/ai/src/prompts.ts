/**
 * Prompt templates for AI
 */

export function buildRAGPrompt(
  query: string,
  documents: Array<{ id: string; name: string; contentText: string | null; classification: string }>
): string {
  const contextParts = documents
    .filter((d) => d.contentText)
    .map((d, i) => {
      const preview = d.contentText!.slice(0, 3000);
      return `
Document ${i + 1}: ${d.name}
Classification: ${d.classification}

Content:
${preview}
${d.contentText!.length > 3000 ? '\n[... content truncated ...]' : ''}
`;
    });

  const context = contextParts.join('\n---\n');

  return `
You are an AI assistant for ArcQubit Knowledge Work Platform, a quantum-ready document management system.
Your goal is to help users find information, understand documents, and work more efficiently.

You have access to the following documents that are relevant to the user's question:

${context}

---

User question: ${query}

Please provide a helpful, accurate response based on the documents above. If you use information from a specific document, reference it by name. If you cannot answer based on the provided documents, say so clearly and suggest what additional information would be helpful.

Key guidelines:
- Be concise and clear
- Cite specific documents when quoting or referencing information
- If documents conflict, note the discrepancy
- If information is not in the documents, don't make it up
- Respect the classification levels shown - treat confidential/restricted information appropriately

Response:
`;
}

export function buildSummarizationPrompt(
  documentName: string,
  content: string,
  options: {
    length?: 'short' | 'medium' | 'long';
    style?: 'executive' | 'technical' | 'plain';
  } = {}
): string {
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

  return `
Please summarize the following document in ${lengthGuide[options.length || 'medium']}.
Use ${styleGuide[options.style || 'plain']}.

Document: ${documentName}

Content:
${content}

Summary:
`;
}

export function buildClassificationPrompt(content: string): string {
  return `
Analyze the following document content and determine the appropriate classification level.

Classification levels:
- public: Information suitable for public release
- internal: Information for internal use only, not sensitive
- confidential: Sensitive business information, limited distribution
- restricted: Highly sensitive, PHI/PII, legal privilege, or classified

Consider:
- Does it contain PHI (Protected Health Information)?
- Does it contain PII (Personally Identifiable Information)?
- Does it contain trade secrets or proprietary information?
- Is it subject to legal privilege?
- What would be the impact if this were disclosed?

Content:
${content.slice(0, 5000)}

Please respond with:
1. The recommended classification level (public/internal/confidential/restricted)
2. Confidence score (0-100%)
3. Brief reasoning (1-2 sentences)
4. Any detected sensitive information types

Format:
Classification: [level]
Confidence: [score]%
Reasoning: [explanation]
Detected: [PHI, PII, etc.]
`;
}

export function buildComparisonPrompt(doc1: string, doc2: string): string {
  return `
Compare the following two documents and provide:
1. Key similarities
2. Key differences
3. Which document is more recent/current (if determinable)
4. Recommendation on which to use for what purpose

Document 1:
${doc1.slice(0, 3000)}

Document 2:
${doc2.slice(0, 3000)}

Comparison:
`;
}

export function buildExtractionPrompt(content: string, entityType: string): string {
  return `
Extract all instances of ${entityType} from the following document.

Document content:
${content}

Please list all ${entityType} found, one per line.

${entityType}:
`;
}
