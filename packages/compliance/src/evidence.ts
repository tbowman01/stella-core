/**
 * Evidence collection and management
 */

import { Evidence } from './types';

// In-memory evidence store (for MVP)
// In production, store in database with links to blob storage
const evidenceStore = new Map<string, Evidence>();

/**
 * Collect evidence for a control
 */
export async function collectEvidence(params: {
  controlId: string;
  type: Evidence['type'];
  name: string;
  description?: string;
  storagePath?: string;
  metadata?: Record<string, unknown>;
  collectedBy: string;
}): Promise<Evidence> {
  const { randomString } = await import('@arcqubit/shared');
  const evidenceId = randomString(32);

  const evidence: Evidence = {
    id: evidenceId,
    controlId: params.controlId,
    type: params.type,
    name: params.name,
    description: params.description,
    storagePath: params.storagePath,
    metadata: params.metadata || {},
    collectedAt: new Date(),
    collectedBy: params.collectedBy,
  };

  evidenceStore.set(evidenceId, evidence);

  return evidence;
}

/**
 * Get evidence by ID
 */
export async function getEvidence(evidenceId: string): Promise<Evidence | null> {
  return evidenceStore.get(evidenceId) || null;
}

/**
 * Get evidence for a control
 */
export async function getEvidenceForControl(controlId: string): Promise<Evidence[]> {
  const evidence: Evidence[] = [];

  for (const item of evidenceStore.values()) {
    if (item.controlId === controlId) {
      evidence.push(item);
    }
  }

  return evidence.sort((a, b) => b.collectedAt.getTime() - a.collectedAt.getTime());
}

/**
 * Auto-collect evidence from audit logs
 */
export async function autoCollectAuditEvidence(
  tenantId: string,
  controlId: string,
  startDate: Date,
  endDate: Date
): Promise<Evidence> {
  const { prisma } = await import('@arcqubit/database');

  const logs = await prisma.auditLog.findMany({
    where: {
      tenantId,
      timestamp: {
        gte: startDate,
        lte: endDate,
      },
    },
    take: 1000,
  });

  // Create evidence
  const evidence = await collectEvidence({
    controlId,
    type: 'log',
    name: `Audit Logs ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`,
    description: `Automatically collected audit logs`,
    metadata: {
      logCount: logs.length,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      actions: [...new Set(logs.map((l) => l.action))],
    },
    collectedBy: 'system',
  });

  return evidence;
}

/**
 * Auto-collect configuration evidence
 */
export async function autoCollectConfigEvidence(
  controlId: string,
  config: Record<string, unknown>
): Promise<Evidence> {
  const evidence = await collectEvidence({
    controlId,
    type: 'config',
    name: `System Configuration - ${new Date().toISOString().split('T')[0]}`,
    description: 'Automatically collected system configuration',
    metadata: {
      config,
      timestamp: new Date().toISOString(),
    },
    collectedBy: 'system',
  });

  return evidence;
}

/**
 * Delete evidence
 */
export async function deleteEvidence(evidenceId: string): Promise<boolean> {
  return evidenceStore.delete(evidenceId);
}

/**
 * Update evidence
 */
export async function updateEvidence(
  evidenceId: string,
  updates: Partial<Pick<Evidence, 'name' | 'description' | 'metadata'>>
): Promise<Evidence | null> {
  const evidence = evidenceStore.get(evidenceId);

  if (!evidence) {
    return null;
  }

  const updated = {
    ...evidence,
    ...updates,
  };

  evidenceStore.set(evidenceId, updated);

  return updated;
}
