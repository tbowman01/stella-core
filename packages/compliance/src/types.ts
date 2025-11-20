/**
 * Compliance types
 */

export type ComplianceFramework = 'soc2' | 'cmmc' | 'nist_rmf' | 'hipaa' | 'pci';
export type ControlStatus = 'met' | 'partial' | 'not_met';

export interface ComplianceControl {
  id: string;
  tenantId: string;
  framework: ComplianceFramework;
  controlId: string;
  controlName: string;
  description: string;
  ownerId?: string;
  status: ControlStatus;
  evidenceIds: string[];
  lastReviewed?: Date;
  createdAt: Date;
}

export interface Evidence {
  id: string;
  controlId: string;
  type: 'document' | 'screenshot' | 'config' | 'log' | 'attestation';
  name: string;
  description?: string;
  storagePath?: string;
  metadata: Record<string, unknown>;
  collectedAt: Date;
  collectedBy: string;
}

export interface ComplianceReport {
  tenantId: string;
  framework: ComplianceFramework;
  generatedAt: Date;
  generatedBy: string;
  summary: {
    totalControls: number;
    metControls: number;
    partialControls: number;
    notMetControls: number;
    compliancePercentage: number;
  };
  controls: ComplianceControl[];
  gaps: {
    controlId: string;
    controlName: string;
    status: ControlStatus;
    recommendations: string[];
  }[];
}

export interface AuditQuery {
  tenantId: string;
  userId?: string;
  action?: string;
  resourceType?: string;
  resourceId?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

export interface AuditSummary {
  totalEvents: number;
  uniqueUsers: number;
  topActions: { action: string; count: number }[];
  topResources: { resourceType: string; count: number }[];
  timeRange: { start: Date; end: Date };
}
