/**
 * PHI/PII detection and redaction
 */

import { RedactedEntity } from './types';

/**
 * Redact Protected Health Information (PHI)
 */
export function redactPHI(text: string): { redacted: string; entities: RedactedEntity[] } {
  const entities: RedactedEntity[] = [];
  let redacted = text;

  // SSN pattern
  const ssnMatches = text.match(/\b\d{3}-\d{2}-\d{4}\b/g);
  if (ssnMatches) {
    entities.push({
      type: 'SSN',
      count: ssnMatches.length,
      examples: [ssnMatches[0]],
    });
    redacted = redacted.replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[SSN REDACTED]');
  }

  // Medical Record Number (MRN)
  const mrnMatches = text.match(/\b(MRN|Medical Record Number)[\s:]+[\w-]+/gi);
  if (mrnMatches) {
    entities.push({
      type: 'PHI',
      count: mrnMatches.length,
      examples: [mrnMatches[0]],
    });
    redacted = redacted.replace(/\b(MRN|Medical Record Number)[\s:]+[\w-]+/gi, '[MRN REDACTED]');
  }

  // Date of Birth
  const dobMatches = text.match(/\b(DOB|Date of Birth)[\s:]+\d{1,2}\/\d{1,2}\/\d{2,4}/gi);
  if (dobMatches) {
    entities.push({
      type: 'PHI',
      count: dobMatches.length,
      examples: [dobMatches[0]],
    });
    redacted = redacted.replace(
      /\b(DOB|Date of Birth)[\s:]+\d{1,2}\/\d{1,2}\/\d{2,4}/gi,
      '[DOB REDACTED]'
    );
  }

  // Healthcare provider names (basic pattern)
  const providerMatches = text.match(/\b(Dr\.|Doctor)\s+[A-Z][a-z]+\s+[A-Z][a-z]+/g);
  if (providerMatches) {
    entities.push({
      type: 'PHI',
      count: providerMatches.length,
      examples: [providerMatches[0]],
    });
    redacted = redacted.replace(/\b(Dr\.|Doctor)\s+[A-Z][a-z]+\s+[A-Z][a-z]+/g, '[PROVIDER REDACTED]');
  }

  return { redacted, entities };
}

/**
 * Redact Personally Identifiable Information (PII)
 */
export function redactPII(text: string): { redacted: string; entities: RedactedEntity[] } {
  const entities: RedactedEntity[] = [];
  let redacted = text;

  // Email addresses
  const emailMatches = text.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g);
  if (emailMatches) {
    entities.push({
      type: 'EMAIL',
      count: emailMatches.length,
      examples: [emailMatches[0]],
    });
    redacted = redacted.replace(
      /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
      '[EMAIL REDACTED]'
    );
  }

  // Phone numbers
  const phoneMatches = text.match(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g);
  if (phoneMatches) {
    entities.push({
      type: 'PHONE',
      count: phoneMatches.length,
      examples: [phoneMatches[0]],
    });
    redacted = redacted.replace(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, '[PHONE REDACTED]');
  }

  // Credit card numbers
  const ccMatches = text.match(/\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g);
  if (ccMatches) {
    entities.push({
      type: 'CREDIT_CARD',
      count: ccMatches.length,
      examples: [ccMatches[0]],
    });
    redacted = redacted.replace(/\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, '[CC REDACTED]');
  }

  // US addresses (basic pattern)
  const addressMatches = text.match(/\b\d+\s+[A-Za-z\s]+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln|Drive|Dr|Court|Ct|Circle|Cir)/gi);
  if (addressMatches) {
    entities.push({
      type: 'ADDRESS',
      count: addressMatches.length,
      examples: [addressMatches[0]],
    });
    redacted = redacted.replace(
      /\b\d+\s+[A-Za-z\s]+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln|Drive|Dr|Court|Ct|Circle|Cir)/gi,
      '[ADDRESS REDACTED]'
    );
  }

  return { redacted, entities };
}

/**
 * Combined PHI and PII redaction
 */
export function redactSensitiveInfo(text: string): {
  redacted: string;
  entities: RedactedEntity[];
} {
  const { redacted: phiRedacted, entities: phiEntities } = redactPHI(text);
  const { redacted: piiRedacted, entities: piiEntities } = redactPII(phiRedacted);

  // Merge entities
  const allEntities = [...phiEntities, ...piiEntities];

  // Combine counts for same types
  const entityMap = new Map<string, RedactedEntity>();
  for (const entity of allEntities) {
    const existing = entityMap.get(entity.type);
    if (existing) {
      existing.count += entity.count;
    } else {
      entityMap.set(entity.type, entity);
    }
  }

  return {
    redacted: piiRedacted,
    entities: Array.from(entityMap.values()),
  };
}

/**
 * Detect PHI/PII without redacting
 */
export function detectSensitiveInfo(text: string): RedactedEntity[] {
  const { entities } = redactSensitiveInfo(text);
  return entities;
}

/**
 * Check if text contains PHI
 */
export function containsPHI(text: string): boolean {
  const { entities } = redactPHI(text);
  return entities.length > 0;
}

/**
 * Check if text contains PII
 */
export function containsPII(text: string): boolean {
  const { entities } = redactPII(text);
  return entities.length > 0;
}

/**
 * Anonymize names (basic NER)
 */
export function anonymizeNames(text: string): string {
  // This is a simple pattern-based approach
  // In production, use a proper NER library like compromise or spaCy

  // Capitalize name pattern
  const namePattern = /\b([A-Z][a-z]+)\s+([A-Z][a-z]+)\b/g;
  const matches = text.match(namePattern);

  if (!matches) return text;

  let anonymized = text;
  const seen = new Set<string>();

  for (const match of matches) {
    if (!seen.has(match)) {
      // Skip common words
      const commonWords = ['The', 'And', 'For', 'But', 'Not'];
      if (!commonWords.some((word) => match.startsWith(word))) {
        anonymized = anonymized.replace(new RegExp(match, 'g'), '[NAME REDACTED]');
        seen.add(match);
      }
    }
  }

  return anonymized;
}
