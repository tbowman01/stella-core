/**
 * Quantum Bill of Materials (QBOM) generation
 * Tracks cryptographic algorithms in use for migration planning
 */

import { QBOMEntry } from './types';

/**
 * Generate QBOM for the platform
 */
export async function generateQBOM(): Promise<QBOMEntry[]> {
  const entries: QBOMEntry[] = [];

  // Document encryption
  entries.push({
    componentName: 'Document Storage Encryption',
    componentType: 'service',
    algorithms: ['AES-256-GCM', 'ML-KEM-768', 'ML-DSA-65'],
    quantumSafe: true,
    migrationStatus: 'completed',
    details: {
      usage: 'Encrypting documents at rest',
      location: '@arcqubit/pqc/hybrid',
    },
  });

  // Database encryption
  entries.push({
    componentName: 'Database Encryption',
    componentType: 'service',
    algorithms: ['AES-256-GCM'],
    quantumSafe: false, // Symmetric crypto is quantum-safe for appropriate key sizes
    migrationStatus: 'not_started',
    details: {
      usage: 'Database-level encryption',
      location: 'PostgreSQL TDE',
    },
  });

  // JWT tokens
  entries.push({
    componentName: 'JWT Authentication',
    componentType: 'library',
    algorithms: ['HMAC-SHA256'],
    quantumSafe: false, // HMAC with sufficient key size is quantum-safe
    migrationStatus: 'not_started',
    details: {
      usage: 'User session tokens',
      location: '@arcqubit/auth/jwt',
    },
  });

  // Password hashing
  entries.push({
    componentName: 'Password Hashing',
    componentType: 'library',
    algorithms: ['bcrypt'],
    quantumSafe: true, // Hash functions are generally quantum-safe
    migrationStatus: 'completed',
    details: {
      usage: 'User password storage',
      location: '@arcqubit/auth/password',
    },
  });

  // TLS/HTTPS
  entries.push({
    componentName: 'TLS Transport',
    componentType: 'service',
    algorithms: ['RSA-2048', 'ECDHE', 'AES-128-GCM'],
    quantumSafe: false,
    migrationStatus: 'not_started',
    details: {
      usage: 'HTTPS connections',
      location: 'Next.js/Node.js TLS',
    },
  });

  // Audit log signatures
  entries.push({
    componentName: 'Audit Log Integrity',
    componentType: 'service',
    algorithms: ['SHA-256', 'ML-DSA-65'],
    quantumSafe: true,
    migrationStatus: 'in_progress',
    details: {
      usage: 'Tamper-proof audit logs',
      location: '@arcqubit/compliance/audit',
    },
  });

  return entries;
}

/**
 * Analyze QBOM for migration readiness
 */
export async function analyzeQBOM(entries: QBOMEntry[]): Promise<{
  totalComponents: number;
  quantumSafeCount: number;
  notQuantumSafeCount: number;
  migrationProgress: {
    completed: number;
    inProgress: number;
    notStarted: number;
  };
  highPriorityItems: QBOMEntry[];
  recommendations: string[];
}> {
  const quantumSafeCount = entries.filter((e) => e.quantumSafe).length;
  const notQuantumSafeCount = entries.length - quantumSafeCount;

  const migrationProgress = {
    completed: entries.filter((e) => e.migrationStatus === 'completed').length,
    inProgress: entries.filter((e) => e.migrationStatus === 'in_progress').length,
    notStarted: entries.filter((e) => e.migrationStatus === 'not_started').length,
  };

  // High priority: Not quantum-safe AND handles long-lived data
  const highPriorityKeywords = ['storage', 'database', 'encryption', 'archive'];
  const highPriorityItems = entries.filter(
    (e) =>
      !e.quantumSafe &&
      highPriorityKeywords.some((keyword) =>
        e.componentName.toLowerCase().includes(keyword)
      )
  );

  const recommendations: string[] = [];

  if (highPriorityItems.length > 0) {
    recommendations.push(
      `Prioritize migration of ${highPriorityItems.length} high-priority components handling long-lived data`
    );
  }

  const tlsComponent = entries.find((e) => e.componentName.includes('TLS'));
  if (tlsComponent && !tlsComponent.quantumSafe) {
    recommendations.push(
      'Implement hybrid PQC cipher suites for TLS (e.g., X25519-ML-KEM) when available'
    );
  }

  if (migrationProgress.completed < entries.length * 0.5) {
    recommendations.push(
      'Accelerate PQC migration - less than 50% of components are quantum-safe'
    );
  }

  recommendations.push('Regularly update QBOM as new components are added');
  recommendations.push('Plan for key rotation before large-scale quantum computers emerge');

  return {
    totalComponents: entries.length,
    quantumSafeCount,
    notQuantumSafeCount,
    migrationProgress,
    highPriorityItems,
    recommendations,
  };
}

/**
 * Export QBOM to JSON
 */
export function exportQBOMToJSON(entries: QBOMEntry[]): string {
  return JSON.stringify(
    {
      version: '1.0',
      generatedAt: new Date().toISOString(),
      platform: 'ArcQubit Knowledge Work Platform',
      entries,
    },
    null,
    2
  );
}

/**
 * Export QBOM to CSV
 */
export function exportQBOMToCSV(entries: QBOMEntry[]): string {
  const headers = [
    'Component Name',
    'Component Type',
    'Algorithms',
    'Quantum Safe',
    'Migration Status',
    'Usage',
    'Location',
  ];

  const rows = entries.map((e) => [
    e.componentName,
    e.componentType,
    e.algorithms.join('; '),
    e.quantumSafe ? 'Yes' : 'No',
    e.migrationStatus,
    e.details.usage || '',
    e.details.location || '',
  ]);

  return [
    headers.join(','),
    ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
  ].join('\n');
}

/**
 * Save QBOM to database for tracking
 */
export async function saveQBOMToDatabase(tenantId: string, entries: QBOMEntry[]): Promise<void> {
  const { prisma } = await import('@arcqubit/database');

  // Delete existing entries for this tenant
  await prisma.qBOMEntry.deleteMany({
    where: { tenantId },
  });

  // Create new entries
  await prisma.qBOMEntry.createMany({
    data: entries.map((entry) => ({
      tenantId,
      componentName: entry.componentName,
      componentType: entry.componentType,
      cryptoAlgorithms: entry.algorithms,
      quantumSafe: entry.quantumSafe,
      migrationStatus: entry.migrationStatus,
      scanDate: new Date(),
      metadata: entry.details,
    })),
  });
}
