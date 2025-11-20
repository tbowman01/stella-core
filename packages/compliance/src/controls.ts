/**
 * Compliance controls management
 */

import { prisma } from '@arcqubit/database';
import { ComplianceFramework, ControlStatus, ComplianceControl } from './types';

/**
 * Create compliance control
 */
export async function createControl(params: {
  tenantId: string;
  framework: ComplianceFramework;
  controlId: string;
  controlName: string;
  description: string;
  ownerId?: string;
}): Promise<ComplianceControl> {
  const control = await prisma.complianceControl.create({
    data: {
      tenantId: params.tenantId,
      framework: params.framework,
      controlId: params.controlId,
      controlName: params.controlName,
      description: params.description,
      ownerId: params.ownerId,
      status: 'not_met',
      evidenceIds: [],
    },
  });

  return {
    ...control,
    evidenceIds: control.evidenceIds as string[],
  };
}

/**
 * Update control status
 */
export async function updateControlStatus(
  controlId: string,
  tenantId: string,
  status: ControlStatus,
  userId: string
): Promise<void> {
  await prisma.complianceControl.update({
    where: { id: controlId },
    data: {
      status,
      lastReviewed: new Date(),
    },
  });

  // Create audit log
  await prisma.auditLog.create({
    data: {
      tenantId,
      userId,
      action: 'update',
      resourceType: 'compliance_control',
      resourceId: controlId,
      metadata: {
        newStatus: status,
      },
    },
  });
}

/**
 * Attach evidence to control
 */
export async function attachEvidence(
  controlId: string,
  tenantId: string,
  evidenceId: string,
  userId: string
): Promise<void> {
  const control = await prisma.complianceControl.findFirst({
    where: { id: controlId, tenantId },
  });

  if (!control) {
    throw new Error('Control not found');
  }

  const evidenceIds = [...(control.evidenceIds as string[]), evidenceId];

  await prisma.complianceControl.update({
    where: { id: controlId },
    data: {
      evidenceIds,
    },
  });

  // Create audit log
  await prisma.auditLog.create({
    data: {
      tenantId,
      userId,
      action: 'update',
      resourceType: 'compliance_control',
      resourceId: controlId,
      metadata: {
        action: 'evidence_attached',
        evidenceId,
      },
    },
  });
}

/**
 * Get controls by framework
 */
export async function getControlsByFramework(
  tenantId: string,
  framework: ComplianceFramework
): Promise<ComplianceControl[]> {
  const controls = await prisma.complianceControl.findMany({
    where: {
      tenantId,
      framework,
    },
    orderBy: {
      controlId: 'asc',
    },
  });

  return controls.map((c) => ({
    ...c,
    evidenceIds: c.evidenceIds as string[],
    lastReviewed: c.lastReviewed || undefined,
  }));
}

/**
 * Get control compliance percentage
 */
export async function getCompliancePercentage(
  tenantId: string,
  framework: ComplianceFramework
): Promise<number> {
  const controls = await prisma.complianceControl.findMany({
    where: {
      tenantId,
      framework,
    },
    select: {
      status: true,
    },
  });

  if (controls.length === 0) return 0;

  const metCount = controls.filter((c) => c.status === 'met').length;
  const partialCount = controls.filter((c) => c.status === 'partial').length;

  // Met controls count as 100%, partial as 50%
  const totalScore = metCount * 100 + partialCount * 50;
  const maxScore = controls.length * 100;

  return Math.round((totalScore / maxScore) * 100);
}

/**
 * Get controls needing attention
 */
export async function getControlsNeedingAttention(tenantId: string): Promise<
  Array<{
    control: ComplianceControl;
    reason: string;
  }>
> {
  const controls = await prisma.complianceControl.findMany({
    where: {
      tenantId,
    },
  });

  const needsAttention: Array<{
    control: ComplianceControl;
    reason: string;
  }> = [];

  for (const control of controls) {
    // Not met
    if (control.status === 'not_met') {
      needsAttention.push({
        control: {
          ...control,
          evidenceIds: control.evidenceIds as string[],
          lastReviewed: control.lastReviewed || undefined,
        },
        reason: 'Control not met',
      });
    }

    // No evidence
    if ((control.evidenceIds as string[]).length === 0) {
      needsAttention.push({
        control: {
          ...control,
          evidenceIds: control.evidenceIds as string[],
          lastReviewed: control.lastReviewed || undefined,
        },
        reason: 'No evidence attached',
      });
    }

    // Not reviewed in 90 days
    if (control.lastReviewed) {
      const daysSinceReview =
        (Date.now() - control.lastReviewed.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceReview > 90) {
        needsAttention.push({
          control: {
            ...control,
            evidenceIds: control.evidenceIds as string[],
            lastReviewed: control.lastReviewed || undefined,
          },
          reason: `Not reviewed in ${Math.floor(daysSinceReview)} days`,
        });
      }
    }
  }

  return needsAttention;
}

/**
 * Assign control owner
 */
export async function assignControlOwner(
  controlId: string,
  tenantId: string,
  ownerId: string,
  assignedBy: string
): Promise<void> {
  await prisma.complianceControl.update({
    where: { id: controlId },
    data: {
      ownerId,
    },
  });

  // Create audit log
  await prisma.auditLog.create({
    data: {
      tenantId,
      userId: assignedBy,
      action: 'update',
      resourceType: 'compliance_control',
      resourceId: controlId,
      metadata: {
        action: 'owner_assigned',
        newOwnerId: ownerId,
      },
    },
  });
}

/**
 * Bulk create controls from framework template
 */
export async function importFrameworkControls(
  tenantId: string,
  framework: ComplianceFramework,
  userId: string
): Promise<number> {
  const templates = getFrameworkTemplate(framework);

  const controls = await Promise.all(
    templates.map((template) =>
      createControl({
        tenantId,
        framework,
        controlId: template.controlId,
        controlName: template.controlName,
        description: template.description,
      })
    )
  );

  // Create audit log
  await prisma.auditLog.create({
    data: {
      tenantId,
      userId,
      action: 'create',
      resourceType: 'compliance_control',
      metadata: {
        action: 'framework_imported',
        framework,
        controlCount: controls.length,
      },
    },
  });

  return controls.length;
}

/**
 * Get framework control templates
 */
function getFrameworkTemplate(framework: ComplianceFramework): Array<{
  controlId: string;
  controlName: string;
  description: string;
}> {
  const templates: Record<
    ComplianceFramework,
    Array<{
      controlId: string;
      controlName: string;
      description: string;
    }>
  > = {
    soc2: [
      {
        controlId: 'CC6.1',
        controlName: 'Logical Access Controls',
        description: 'The entity implements logical access security software and access controls',
      },
      {
        controlId: 'CC6.2',
        controlName: 'Authentication',
        description:
          'Prior to issuing system credentials and granting access, the entity registers and authorizes new users',
      },
      {
        controlId: 'CC6.7',
        controlName: 'Access Removal',
        description:
          'The entity restricts access to protected information assets through the deprovisioning process',
      },
      {
        controlId: 'CC7.2',
        controlName: 'System Monitoring',
        description:
          'The entity monitors system components and the operation of those components for anomalies',
      },
      {
        controlId: 'CC8.1',
        controlName: 'Change Management',
        description:
          'The entity authorizes, designs, develops, configures, documents, tests, approves, and implements changes',
      },
    ],
    cmmc: [
      {
        controlId: 'AC.1.001',
        controlName: 'Limit Access',
        description: 'Limit information system access to authorized users',
      },
      {
        controlId: 'AC.1.002',
        controlName: 'Limit Transactions',
        description:
          'Limit information system access to the types of transactions and functions that authorized users are permitted',
      },
      {
        controlId: 'AU.2.041',
        controlName: 'Audit Events',
        description: 'Ensure that the actions of individual system users can be uniquely traced',
      },
      {
        controlId: 'SC.1.175',
        controlName: 'Monitor Communications',
        description: 'Monitor and control communications at the external boundary',
      },
    ],
    nist_rmf: [
      {
        controlId: 'AC-2',
        controlName: 'Account Management',
        description: 'Manage information system accounts',
      },
      {
        controlId: 'AU-2',
        controlName: 'Audit Events',
        description: 'Determine the events to be audited',
      },
      {
        controlId: 'SC-13',
        controlName: 'Cryptographic Protection',
        description: 'Implement required cryptographic protections',
      },
    ],
    hipaa: [],
    pci: [],
  };

  return templates[framework] || [];
}
