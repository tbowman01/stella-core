/**
 * Compliance framework definitions and mappings
 */

import { ComplianceFramework } from './types';

export interface FrameworkInfo {
  id: ComplianceFramework;
  name: string;
  description: string;
  controlCategories: string[];
  website?: string;
}

export const FRAMEWORKS: Record<ComplianceFramework, FrameworkInfo> = {
  soc2: {
    id: 'soc2',
    name: 'SOC 2 Type II',
    description:
      'Service Organization Control 2 - Trust Services Criteria for Security, Availability, Processing Integrity, Confidentiality, and Privacy',
    controlCategories: [
      'CC1 - Control Environment',
      'CC2 - Communication and Information',
      'CC3 - Risk Assessment',
      'CC4 - Monitoring Activities',
      'CC5 - Control Activities',
      'CC6 - Logical and Physical Access Controls',
      'CC7 - System Operations',
      'CC8 - Change Management',
      'CC9 - Risk Mitigation',
    ],
    website: 'https://www.aicpa.org/soc2',
  },
  cmmc: {
    id: 'cmmc',
    name: 'CMMC Level 2',
    description:
      'Cybersecurity Maturity Model Certification - Required for Department of Defense contractors',
    controlCategories: [
      'AC - Access Control',
      'AT - Awareness and Training',
      'AU - Audit and Accountability',
      'CA - Security Assessment',
      'CM - Configuration Management',
      'IA - Identification and Authentication',
      'IR - Incident Response',
      'MA - Maintenance',
      'MP - Media Protection',
      'PE - Physical Protection',
      'PS - Personnel Security',
      'RE - Recovery',
      'RM - Risk Management',
      'SC - System and Communications Protection',
      'SI - System and Information Integrity',
    ],
    website: 'https://www.acq.osd.mil/cmmc/',
  },
  nist_rmf: {
    id: 'nist_rmf',
    name: 'NIST Risk Management Framework',
    description: 'NIST 800-53 Security and Privacy Controls',
    controlCategories: [
      'AC - Access Control',
      'AT - Awareness and Training',
      'AU - Audit and Accountability',
      'CA - Assessment, Authorization, and Monitoring',
      'CM - Configuration Management',
      'CP - Contingency Planning',
      'IA - Identification and Authentication',
      'IR - Incident Response',
      'MA - Maintenance',
      'MP - Media Protection',
      'PE - Physical and Environmental Protection',
      'PL - Planning',
      'PM - Program Management',
      'PS - Personnel Security',
      'PT - PII Processing and Transparency',
      'RA - Risk Assessment',
      'SA - System and Services Acquisition',
      'SC - System and Communications Protection',
      'SI - System and Information Integrity',
      'SR - Supply Chain Risk Management',
    ],
    website: 'https://csrc.nist.gov/projects/risk-management',
  },
  hipaa: {
    id: 'hipaa',
    name: 'HIPAA',
    description:
      'Health Insurance Portability and Accountability Act - Privacy and Security Rules',
    controlCategories: [
      'Administrative Safeguards',
      'Physical Safeguards',
      'Technical Safeguards',
      'Organizational Requirements',
      'Policies and Procedures',
    ],
    website: 'https://www.hhs.gov/hipaa/',
  },
  pci: {
    id: 'pci',
    name: 'PCI DSS',
    description: 'Payment Card Industry Data Security Standard',
    controlCategories: [
      'Build and Maintain a Secure Network',
      'Protect Cardholder Data',
      'Maintain a Vulnerability Management Program',
      'Implement Strong Access Control Measures',
      'Regularly Monitor and Test Networks',
      'Maintain an Information Security Policy',
    ],
    website: 'https://www.pcisecuritystandards.org/',
  },
};

/**
 * Get framework information
 */
export function getFrameworkInfo(framework: ComplianceFramework): FrameworkInfo {
  return FRAMEWORKS[framework];
}

/**
 * Get all frameworks
 */
export function getAllFrameworks(): FrameworkInfo[] {
  return Object.values(FRAMEWORKS);
}

/**
 * Map control to multiple frameworks
 */
export interface ControlMapping {
  controlId: string;
  controlName: string;
  mappings: Array<{
    framework: ComplianceFramework;
    controlId: string;
  }>;
}

/**
 * Common control mappings across frameworks
 */
export const CONTROL_MAPPINGS: ControlMapping[] = [
  {
    controlId: 'access-control',
    controlName: 'Logical Access Control',
    mappings: [
      { framework: 'soc2', controlId: 'CC6.1' },
      { framework: 'cmmc', controlId: 'AC.1.001' },
      { framework: 'nist_rmf', controlId: 'AC-2' },
    ],
  },
  {
    controlId: 'audit-logging',
    controlName: 'Audit Event Logging',
    mappings: [
      { framework: 'soc2', controlId: 'CC7.2' },
      { framework: 'cmmc', controlId: 'AU.2.041' },
      { framework: 'nist_rmf', controlId: 'AU-2' },
    ],
  },
  {
    controlId: 'encryption',
    controlName: 'Cryptographic Protection',
    mappings: [
      { framework: 'soc2', controlId: 'CC6.7' },
      { framework: 'cmmc', controlId: 'SC.3.177' },
      { framework: 'nist_rmf', controlId: 'SC-13' },
    ],
  },
];

/**
 * Get mapping for a control
 */
export function getControlMapping(controlId: string): ControlMapping | undefined {
  return CONTROL_MAPPINGS.find((m) => m.controlId === controlId);
}

/**
 * Find equivalent controls across frameworks
 */
export function findEquivalentControls(
  framework: ComplianceFramework,
  controlId: string
): Array<{
  framework: ComplianceFramework;
  controlId: string;
}> {
  for (const mapping of CONTROL_MAPPINGS) {
    const found = mapping.mappings.find(
      (m) => m.framework === framework && m.controlId === controlId
    );

    if (found) {
      return mapping.mappings.filter((m) => m.framework !== framework);
    }
  }

  return [];
}
