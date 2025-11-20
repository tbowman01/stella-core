import { nanoid } from 'nanoid';
import prisma from '@arcqubit/database';
import type { Plugin, PluginManifest, PluginContext } from '../../types';

/**
 * Q-CMM (Quantum Capability Maturity Model) Plugin
 * Assesses organizational quantum readiness across 5 maturity levels
 */

// Maturity levels
export enum MaturityLevel {
  LEVEL_0 = 0, // Unaware
  LEVEL_1 = 1, // Aware
  LEVEL_2 = 2, // Planning
  LEVEL_3 = 3, // Implementing
  LEVEL_4 = 4, // Optimizing
  LEVEL_5 = 5, // Leading
}

// Assessment domains
export interface AssessmentDomain {
  id: string;
  name: string;
  description: string;
  questions: AssessmentQuestion[];
}

export interface AssessmentQuestion {
  id: string;
  text: string;
  level0: string;
  level1: string;
  level2: string;
  level3: string;
  level4: string;
  level5: string;
}

export interface AssessmentResult {
  domain: string;
  level: MaturityLevel;
  score: number;
  answers: Record<string, number>;
  recommendations: string[];
}

export interface OverallAssessment {
  overallLevel: MaturityLevel;
  overallScore: number;
  domainResults: AssessmentResult[];
  strengths: string[];
  gaps: string[];
  roadmap: string[];
  assessedAt: Date;
}

// Q-CMM Assessment Domains
const ASSESSMENT_DOMAINS: AssessmentDomain[] = [
  {
    id: 'crypto-inventory',
    name: 'Cryptographic Inventory',
    description: 'Understanding of current cryptographic assets',
    questions: [
      {
        id: 'inventory-awareness',
        text: 'How well documented is your cryptographic inventory?',
        level0: 'No inventory exists',
        level1: 'Partial manual inventory',
        level2: 'Comprehensive manual inventory',
        level3: 'Automated discovery with QBOM',
        level4: 'Real-time monitoring and tracking',
        level5: 'Predictive analysis and optimization',
      },
      {
        id: 'inventory-coverage',
        text: 'What percentage of cryptographic assets are identified?',
        level0: '<10%',
        level1: '10-30%',
        level2: '30-60%',
        level3: '60-80%',
        level4: '80-95%',
        level5: '>95%',
      },
    ],
  },
  {
    id: 'pqc-readiness',
    name: 'PQC Readiness',
    description: 'Preparedness for post-quantum cryptography',
    questions: [
      {
        id: 'pqc-awareness',
        text: 'Level of organizational awareness of quantum threats?',
        level0: 'No awareness',
        level1: 'Executive awareness',
        level2: 'Team training initiated',
        level3: 'Org-wide understanding',
        level4: 'Proactive monitoring',
        level5: 'Industry thought leader',
      },
      {
        id: 'pqc-implementation',
        text: 'Status of PQC implementation?',
        level0: 'No PQC deployed',
        level1: 'Pilot projects',
        level2: 'Limited production use',
        level3: 'Hybrid crypto deployed',
        level4: 'Majority PQC migration',
        level5: 'Full PQC with optimization',
      },
    ],
  },
  {
    id: 'risk-assessment',
    name: 'Risk Assessment',
    description: 'Quantum risk evaluation and prioritization',
    questions: [
      {
        id: 'risk-evaluation',
        text: 'How are quantum risks evaluated?',
        level0: 'No evaluation',
        level1: 'Ad-hoc assessment',
        level2: 'Documented methodology',
        level3: 'Quantitative risk models',
        level4: 'Continuous risk monitoring',
        level5: 'Predictive threat modeling',
      },
      {
        id: 'data-classification',
        text: 'Data classification for quantum risk?',
        level0: 'No classification',
        level1: 'Basic classification',
        level2: 'Crypto-agility assessed',
        level3: 'Harvest-now risk scored',
        level4: 'Automated classification',
        level5: 'Dynamic risk adjustment',
      },
    ],
  },
  {
    id: 'migration-planning',
    name: 'Migration Planning',
    description: 'PQC migration strategy and execution',
    questions: [
      {
        id: 'migration-strategy',
        text: 'Status of PQC migration strategy?',
        level0: 'No strategy',
        level1: 'Strategy in development',
        level2: 'Documented roadmap',
        level3: 'Phased execution plan',
        level4: 'Adaptive migration',
        level5: 'Best-practice framework',
      },
      {
        id: 'testing-validation',
        text: 'PQC testing and validation processes?',
        level0: 'No testing',
        level1: 'Manual testing',
        level2: 'Automated test suite',
        level3: 'CI/CD integration',
        level4: 'Performance benchmarking',
        level5: 'Continuous validation',
      },
    ],
  },
  {
    id: 'governance',
    name: 'Governance & Compliance',
    description: 'Policies, standards, and compliance',
    questions: [
      {
        id: 'policies',
        text: 'Quantum-safe cryptography policies?',
        level0: 'No policies',
        level1: 'Draft policies',
        level2: 'Approved policies',
        level3: 'Enforced policies',
        level4: 'Automated compliance',
        level5: 'Industry leadership',
      },
      {
        id: 'compliance',
        text: 'Compliance with PQC standards (NIST, CNSA)?',
        level0: 'Not compliant',
        level1: 'Awareness of standards',
        level2: 'Gap analysis complete',
        level3: 'Partial compliance',
        level4: 'Full compliance',
        level5: 'Contributing to standards',
      },
    ],
  },
];

export class QCMMPlugin implements Plugin {
  manifest: PluginManifest = {
    id: 'q-cmm',
    name: 'Q-CMM Assessment',
    version: '1.0.0',
    description:
      'Quantum Capability Maturity Model assessment tool for evaluating organizational quantum readiness',
    author: 'ArcQubit',
    license: 'Proprietary',
    capabilities: ['compliance-assessment'],
    permissions: {
      readDocuments: false,
      writeDocuments: false,
      readWorkspaces: false,
      writeWorkspaces: false,
      readUsers: false,
      writeUsers: false,
      readAuditLogs: true,
      readCompliance: true,
      writeCompliance: true,
      executeJobs: false,
      externalNetwork: false,
      fileSystemAccess: false,
    },
    configSchema: {
      assessmentFrequency: { type: 'string', enum: ['monthly', 'quarterly', 'annually'] },
      autoReminder: { type: 'boolean', default: true },
    },
    hooks: [],
  };

  async onInstall(context: PluginContext): Promise<void> {
    console.log(`📦 Installing Q-CMM Assessment for tenant ${context.tenantId}`);
  }

  async onEnable(context: PluginContext): Promise<void> {
    console.log(`✅ Enabled Q-CMM Assessment for tenant ${context.tenantId}`);
  }

  async onDisable(context: PluginContext): Promise<void> {
    console.log(`⏸️  Disabled Q-CMM Assessment for tenant ${context.tenantId}`);
  }

  /**
   * Get assessment domains and questions
   */
  getDomains(): AssessmentDomain[] {
    return ASSESSMENT_DOMAINS;
  }

  /**
   * Perform assessment based on answers
   */
  async performAssessment(
    answers: Record<string, number>,
    context: PluginContext
  ): Promise<OverallAssessment> {
    const domainResults: AssessmentResult[] = [];

    // Evaluate each domain
    for (const domain of ASSESSMENT_DOMAINS) {
      const domainAnswers: Record<string, number> = {};
      let totalScore = 0;

      for (const question of domain.questions) {
        const answer = answers[question.id] || 0;
        domainAnswers[question.id] = answer;
        totalScore += answer;
      }

      const averageScore = totalScore / domain.questions.length;
      const level = Math.round(averageScore) as MaturityLevel;

      const recommendations = this.generateRecommendations(domain.id, level);

      domainResults.push({
        domain: domain.id,
        level,
        score: averageScore,
        answers: domainAnswers,
        recommendations,
      });
    }

    // Calculate overall maturity
    const overallScore =
      domainResults.reduce((sum, r) => sum + r.score, 0) / domainResults.length;
    const overallLevel = Math.round(overallScore) as MaturityLevel;

    // Identify strengths and gaps
    const strengths = domainResults
      .filter((r) => r.level >= 4)
      .map((r) => this.getDomainName(r.domain));

    const gaps = domainResults
      .filter((r) => r.level <= 2)
      .map((r) => this.getDomainName(r.domain));

    // Generate roadmap
    const roadmap = this.generateRoadmap(domainResults, overallLevel);

    const assessment: OverallAssessment = {
      overallLevel,
      overallScore,
      domainResults,
      strengths,
      gaps,
      roadmap,
      assessedAt: new Date(),
    };

    // Store assessment in database
    await this.storeAssessment(assessment, context);

    return assessment;
  }

  /**
   * Generate domain-specific recommendations
   */
  private generateRecommendations(domainId: string, level: MaturityLevel): string[] {
    const recommendations: Record<string, Record<number, string[]>> = {
      'crypto-inventory': {
        0: [
          'Begin documenting all cryptographic implementations',
          'Identify systems using encryption',
        ],
        1: ['Implement automated crypto discovery', 'Create comprehensive QBOM'],
        2: ['Deploy PQC Scanner for continuous monitoring', 'Establish tracking processes'],
        3: ['Optimize crypto asset tracking', 'Implement real-time alerts'],
        4: ['Develop predictive crypto lifecycle management'],
      },
      'pqc-readiness': {
        0: ['Educate leadership on quantum threats', 'Assess organizational readiness'],
        1: ['Conduct org-wide training', 'Start pilot PQC projects'],
        2: ['Expand PQC pilots to production', 'Deploy hybrid cryptography'],
        3: ['Accelerate PQC migration', 'Optimize PQC performance'],
        4: ['Share PQC best practices', 'Contribute to industry standards'],
      },
      'risk-assessment': {
        0: ['Develop quantum risk assessment framework', 'Classify sensitive data'],
        1: ['Implement quantitative risk models', 'Score harvest-now vulnerabilities'],
        2: ['Deploy continuous risk monitoring', 'Automate threat detection'],
        3: ['Optimize risk models with ML', 'Implement predictive analytics'],
        4: ['Lead industry in quantum risk management'],
      },
      'migration-planning': {
        0: ['Draft PQC migration strategy', 'Identify critical systems'],
        1: ['Create phased migration roadmap', 'Establish testing protocols'],
        2: ['Integrate PQC testing into CI/CD', 'Deploy hybrid crypto'],
        3: ['Optimize migration processes', 'Benchmark performance'],
        4: ['Publish migration framework', 'Mentor other organizations'],
      },
      governance: {
        0: ['Draft quantum-safe crypto policies', 'Review NIST PQC standards'],
        1: ['Get policy approval', 'Conduct gap analysis'],
        2: ['Enforce policies', 'Achieve partial NIST compliance'],
        3: ['Automate compliance monitoring', 'Achieve full compliance'],
        4: ['Contribute to PQC standards bodies'],
      },
    };

    return recommendations[domainId]?.[level] || ['Continue current practices'];
  }

  /**
   * Generate migration roadmap
   */
  private generateRoadmap(
    domainResults: AssessmentResult[],
    overallLevel: MaturityLevel
  ): string[] {
    const roadmap: string[] = [];

    // Prioritize domains by current level (lowest first)
    const prioritized = [...domainResults].sort((a, b) => a.level - b.level);

    for (const result of prioritized) {
      if (result.level < 3) {
        roadmap.push(
          `Improve ${this.getDomainName(result.domain)} from Level ${result.level} to Level ${
            result.level + 1
          }`
        );
      }
    }

    // Overall roadmap based on current level
    if (overallLevel < 2) {
      roadmap.push('Establish foundational PQC awareness and planning');
    } else if (overallLevel < 4) {
      roadmap.push('Execute PQC migration and achieve compliance');
    } else {
      roadmap.push('Optimize PQC implementation and lead industry');
    }

    return roadmap;
  }

  /**
   * Get domain name by ID
   */
  private getDomainName(domainId: string): string {
    return ASSESSMENT_DOMAINS.find((d) => d.id === domainId)?.name || domainId;
  }

  /**
   * Store assessment results
   */
  private async storeAssessment(
    assessment: OverallAssessment,
    context: PluginContext
  ): Promise<void> {
    // Store as compliance control
    await prisma.complianceControl.create({
      data: {
        id: nanoid(),
        tenantId: context.tenantId,
        controlId: `Q-CMM-${Date.now()}`,
        framework: 'Q-CMM',
        category: 'Quantum Readiness',
        title: 'Q-CMM Assessment',
        description: `Overall Maturity Level ${assessment.overallLevel} (Score: ${assessment.overallScore.toFixed(1)})`,
        status: assessment.overallLevel >= 3 ? 'implemented' : 'in-progress',
        notes: JSON.stringify(assessment, null, 2),
        evidence: assessment.strengths.join(', '),
        owner: context.userId,
        implementedBy: context.userId,
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        id: nanoid(),
        tenantId: context.tenantId,
        userId: context.userId,
        action: 'qcmm.assessment_completed',
        resourceType: 'compliance',
        resourceId: `Q-CMM-${Date.now()}`,
        metadata: {
          overallLevel: assessment.overallLevel,
          overallScore: assessment.overallScore,
          strengths: assessment.strengths,
          gaps: assessment.gaps,
        },
      },
    });
  }

  /**
   * Get assessment history
   */
  async getAssessmentHistory(context: PluginContext): Promise<OverallAssessment[]> {
    const controls = await prisma.complianceControl.findMany({
      where: {
        tenantId: context.tenantId,
        framework: 'Q-CMM',
      },
      orderBy: { createdAt: 'desc' },
    });

    return controls.map((c) => JSON.parse(c.notes || '{}'));
  }
}

// Export plugin factory
export function createQCMMPlugin(): Plugin {
  return new QCMMPlugin();
}
