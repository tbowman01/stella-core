/**
 * Compliance reporting
 */

import { prisma } from '@arcqubit/database';
import { ComplianceFramework, ComplianceReport } from './types';
import { getEvidenceForControl } from './evidence';

/**
 * Generate compliance report
 */
export async function generateComplianceReport(
  tenantId: string,
  framework: ComplianceFramework,
  userId: string
): Promise<ComplianceReport> {
  const controls = await prisma.complianceControl.findMany({
    where: {
      tenantId,
      framework,
    },
    orderBy: {
      controlId: 'asc',
    },
  });

  const metControls = controls.filter((c) => c.status === 'met').length;
  const partialControls = controls.filter((c) => c.status === 'partial').length;
  const notMetControls = controls.filter((c) => c.status === 'not_met').length;

  // Calculate compliance percentage
  const totalScore = metControls * 100 + partialControls * 50;
  const maxScore = controls.length * 100;
  const compliancePercentage = controls.length > 0 ? Math.round((totalScore / maxScore) * 100) : 0;

  // Identify gaps
  const gaps = await Promise.all(
    controls
      .filter((c) => c.status !== 'met')
      .map(async (control) => {
        const evidence = await getEvidenceForControl(control.id);
        const recommendations: string[] = [];

        if (control.status === 'not_met') {
          recommendations.push('Implement control requirements');
        }

        if (evidence.length === 0) {
          recommendations.push('Collect and document evidence');
        }

        if (!control.ownerId) {
          recommendations.push('Assign control owner');
        }

        if (!control.lastReviewed) {
          recommendations.push('Conduct initial control review');
        }

        return {
          controlId: control.controlId,
          controlName: control.controlName,
          status: control.status,
          recommendations,
        };
      })
  );

  const report: ComplianceReport = {
    tenantId,
    framework,
    generatedAt: new Date(),
    generatedBy: userId,
    summary: {
      totalControls: controls.length,
      metControls,
      partialControls,
      notMetControls,
      compliancePercentage,
    },
    controls: controls.map((c) => ({
      ...c,
      evidenceIds: c.evidenceIds as string[],
      ownerId: c.ownerId || undefined,
      lastReviewed: c.lastReviewed || undefined,
    })),
    gaps,
  };

  // Create audit log
  await prisma.auditLog.create({
    data: {
      tenantId,
      userId,
      action: 'export',
      resourceType: 'compliance_report',
      metadata: {
        framework,
        compliancePercentage,
        controlCount: controls.length,
      },
    },
  });

  return report;
}

/**
 * Export report to markdown
 */
export async function exportReportToMarkdown(report: ComplianceReport): Promise<string> {
  const { getFrameworkInfo } = await import('./frameworks');
  const frameworkInfo = getFrameworkInfo(report.framework);

  let markdown = `# ${frameworkInfo.name} Compliance Report\n\n`;
  markdown += `**Generated:** ${report.generatedAt.toISOString()}\n\n`;
  markdown += `**Tenant:** ${report.tenantId}\n\n`;

  markdown += `## Summary\n\n`;
  markdown += `- **Overall Compliance:** ${report.summary.compliancePercentage}%\n`;
  markdown += `- **Total Controls:** ${report.summary.totalControls}\n`;
  markdown += `- **Met:** ${report.summary.metControls}\n`;
  markdown += `- **Partial:** ${report.summary.partialControls}\n`;
  markdown += `- **Not Met:** ${report.summary.notMetControls}\n\n`;

  markdown += `## Controls by Status\n\n`;
  markdown += `### Met Controls (${report.summary.metControls})\n\n`;
  report.controls
    .filter((c) => c.status === 'met')
    .forEach((control) => {
      markdown += `- **${control.controlId}** - ${control.controlName}\n`;
    });

  markdown += `\n### Partial Controls (${report.summary.partialControls})\n\n`;
  report.controls
    .filter((c) => c.status === 'partial')
    .forEach((control) => {
      markdown += `- **${control.controlId}** - ${control.controlName}\n`;
    });

  markdown += `\n### Not Met Controls (${report.summary.notMetControls})\n\n`;
  report.controls
    .filter((c) => c.status === 'not_met')
    .forEach((control) => {
      markdown += `- **${control.controlId}** - ${control.controlName}\n`;
    });

  markdown += `\n## Gaps and Recommendations\n\n`;
  report.gaps.forEach((gap) => {
    markdown += `### ${gap.controlId} - ${gap.controlName}\n\n`;
    markdown += `**Status:** ${gap.status}\n\n`;
    markdown += `**Recommendations:**\n\n`;
    gap.recommendations.forEach((rec) => {
      markdown += `- ${rec}\n`;
    });
    markdown += `\n`;
  });

  markdown += `## Control Details\n\n`;
  report.controls.forEach((control) => {
    markdown += `### ${control.controlId} - ${control.controlName}\n\n`;
    markdown += `**Status:** ${control.status}\n\n`;
    markdown += `**Description:** ${control.description}\n\n`;
    if (control.ownerId) {
      markdown += `**Owner:** ${control.ownerId}\n\n`;
    }
    if (control.lastReviewed) {
      markdown += `**Last Reviewed:** ${control.lastReviewed.toISOString().split('T')[0]}\n\n`;
    }
    markdown += `**Evidence Count:** ${control.evidenceIds.length}\n\n`;
    markdown += `---\n\n`;
  });

  return markdown;
}

/**
 * Generate executive summary
 */
export async function generateExecutiveSummary(
  tenantId: string,
  userId: string
): Promise<string> {
  const frameworks: ComplianceFramework[] = ['soc2', 'cmmc', 'nist_rmf'];

  let summary = `# Compliance Executive Summary\n\n`;
  summary += `**Generated:** ${new Date().toISOString()}\n\n`;

  for (const framework of frameworks) {
    const report = await generateComplianceReport(tenantId, framework, userId);

    if (report.controls.length > 0) {
      const { getFrameworkInfo } = await import('./frameworks');
      const frameworkInfo = getFrameworkInfo(framework);

      summary += `## ${frameworkInfo.name}\n\n`;
      summary += `- **Compliance:** ${report.summary.compliancePercentage}%\n`;
      summary += `- **Controls:** ${report.summary.metControls}/${report.summary.totalControls} met\n`;
      summary += `- **Gaps:** ${report.gaps.length}\n\n`;
    }
  }

  return summary;
}
