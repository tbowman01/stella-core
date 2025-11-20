/**
 * Document classification service
 * Auto-classify documents based on content analysis
 */

import { ClassificationResult } from './types';
import { redactPHI } from '@arcqubit/shared';

/**
 * Detect PHI (Protected Health Information)
 */
function detectPHI(text: string): boolean {
  const phiPatterns = [
    /\b\d{3}-\d{2}-\d{4}\b/, // SSN
    /\b(MRN|Medical Record Number)[\s:]+\w+/i,
    /\b(DOB|Date of Birth)[\s:]+\d{1,2}\/\d{1,2}\/\d{2,4}/i,
    /\b(diagnosis|prescription|patient|healthcare|medical)/i,
  ];

  return phiPatterns.some((pattern) => pattern.test(text));
}

/**
 * Detect PII (Personally Identifiable Information)
 */
function detectPII(text: string): boolean {
  const piiPatterns = [
    /\b\d{3}-\d{2}-\d{4}\b/, // SSN
    /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/, // Credit card
    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/, // Email
    /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/, // Phone
  ];

  return piiPatterns.some((pattern) => pattern.test(text));
}

/**
 * Detect confidential keywords
 */
function detectConfidentialKeywords(text: string): string[] {
  const keywords = [
    'confidential',
    'proprietary',
    'internal use only',
    'trade secret',
    'classified',
    'restricted',
    'attorney-client privilege',
    'work product',
    'non-disclosure',
    'nda',
    'secret',
    'top secret',
  ];

  const found: string[] = [];
  const lowerText = text.toLowerCase();

  for (const keyword of keywords) {
    if (lowerText.includes(keyword.toLowerCase())) {
      found.push(keyword);
    }
  }

  return found;
}

/**
 * Detect public indicators
 */
function detectPublicIndicators(text: string): boolean {
  const publicKeywords = [
    'public',
    'press release',
    'published',
    'blog post',
    'announcement',
    'marketing',
  ];

  const lowerText = text.toLowerCase();
  return publicKeywords.some((keyword) => lowerText.includes(keyword));
}

/**
 * Classify document based on content
 */
export async function classifyDocument(
  text: string,
  metadata: Record<string, unknown>
): Promise<ClassificationResult> {
  const reasons: string[] = [];
  let classification: ClassificationResult['classification'] = 'internal';
  let confidence = 0.5;

  // Check for PHI/PII
  const hasPHI = detectPHI(text);
  const hasPII = detectPII(text);

  if (hasPHI) {
    classification = 'restricted';
    confidence = 0.9;
    reasons.push('Contains Protected Health Information (PHI)');
  } else if (hasPII) {
    classification = 'confidential';
    confidence = 0.85;
    reasons.push('Contains Personally Identifiable Information (PII)');
  }

  // Check for confidential keywords
  const confidentialKeywords = detectConfidentialKeywords(text);
  if (confidentialKeywords.length > 0) {
    if (confidentialKeywords.includes('top secret') || confidentialKeywords.includes('classified')) {
      classification = 'restricted';
      confidence = 0.95;
    } else if (classification === 'internal') {
      classification = 'confidential';
      confidence = 0.8;
    }
    reasons.push(`Contains confidential keywords: ${confidentialKeywords.join(', ')}`);
  }

  // Check for public indicators
  if (detectPublicIndicators(text) && classification === 'internal') {
    classification = 'public';
    confidence = 0.7;
    reasons.push('Contains public indicators');
  }

  // Check metadata
  if (metadata.classification) {
    classification = metadata.classification as ClassificationResult['classification'];
    confidence = 1.0;
    reasons.push('Classification provided in metadata');
  }

  return {
    classification,
    confidence,
    reasons,
    detectedPHI: hasPHI,
    detectedPII: hasPII,
  };
}

/**
 * Suggest classification for a document
 */
export async function suggestClassification(
  documentId: string,
  text: string,
  metadata: Record<string, unknown>
): Promise<ClassificationResult> {
  return classifyDocument(text, metadata);
}

/**
 * Batch classify documents
 */
export async function batchClassifyDocuments(
  documents: Array<{
    id: string;
    text: string;
    metadata: Record<string, unknown>;
  }>
): Promise<Map<string, ClassificationResult>> {
  const results = new Map<string, ClassificationResult>();

  for (const doc of documents) {
    try {
      const result = await classifyDocument(doc.text, doc.metadata);
      results.set(doc.id, result);
    } catch (error) {
      console.error(`Failed to classify document ${doc.id}:`, error);
    }
  }

  return results;
}

/**
 * Re-classify document (e.g., after content update)
 */
export async function reclassifyDocument(
  documentId: string,
  tenantId: string,
  text: string,
  metadata: Record<string, unknown>
): Promise<ClassificationResult> {
  const result = await classifyDocument(text, metadata);

  // Update document classification in database
  const { prisma } = await import('@arcqubit/database');
  await prisma.document.update({
    where: { id: documentId },
    data: {
      classification: result.classification,
      metadata: {
        ...metadata,
        classificationConfidence: result.confidence,
        classificationReasons: result.reasons,
        reclassifiedAt: new Date().toISOString(),
      },
    },
  });

  return result;
}
