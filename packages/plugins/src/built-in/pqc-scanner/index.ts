import { nanoid } from 'nanoid';
import prisma from '@arcqubit/database';
import type {
  Plugin,
  PluginManifest,
  PluginContext,
  DocumentUploadEvent,
} from '../../types';

// Cryptographic algorithm patterns to detect
const CRYPTO_PATTERNS = {
  // Classical algorithms (need migration)
  'RSA-2048': /RSA.*2048|rsa\.generateKey.*2048/gi,
  'RSA-4096': /RSA.*4096|rsa\.generateKey.*4096/gi,
  'ECDSA-P256': /ECDSA.*P-256|EC.*secp256r1|prime256v1/gi,
  'ECDSA-P384': /ECDSA.*P-384|EC.*secp384r1/gi,
  'AES-128-CBC': /AES.*128.*CBC|aes-128-cbc/gi,
  'AES-256-CBC': /AES.*256.*CBC|aes-256-cbc/gi,
  'AES-128-GCM': /AES.*128.*GCM|aes-128-gcm/gi,
  'AES-256-GCM': /AES.*256.*GCM|aes-256-gcm/gi,
  'SHA-256': /SHA-?256|sha256/gi,
  'SHA-512': /SHA-?512|sha512/gi,

  // Post-quantum algorithms (good!)
  'ML-KEM-768': /ML-KEM.*768|Kyber.*768|CRYSTALS-KYBER.*768/gi,
  'ML-KEM-1024': /ML-KEM.*1024|Kyber.*1024|CRYSTALS-KYBER.*1024/gi,
  'ML-DSA-65': /ML-DSA.*65|Dilithium.*3|CRYSTALS-DILITHIUM.*3/gi,
  'ML-DSA-87': /ML-DSA.*87|Dilithium.*5|CRYSTALS-DILITHIUM.*5/gi,
  'SPHINCS': /SPHINCS\+?|sphincs/gi,
  'FALCON-512': /FALCON.*512/gi,
  'FALCON-1024': /FALCON.*1024/gi,

  // Vulnerable algorithms (critical!)
  'MD5': /\bMD5\b|md5|hashlib\.md5/gi,
  'SHA-1': /SHA-?1|sha1|hashlib\.sha1/gi,
  'DES': /\bDES\b|des-|triple-?des/gi,
  '3DES': /3DES|triple-?des/gi,
  'RC4': /\bRC4\b|rc4|arcfour/gi,
};

// Determine if algorithm is post-quantum
function isPQC(algorithm: string): boolean {
  return /ML-KEM|ML-DSA|SPHINCS|FALCON|Kyber|Dilithium/i.test(algorithm);
}

// Determine if algorithm is vulnerable
function isVulnerable(algorithm: string): boolean {
  return /MD5|SHA-1|DES|3DES|RC4/i.test(algorithm);
}

// Determine algorithm type
function getAlgorithmType(algorithm: string): string {
  if (/KEM|Kyber|RSA|ECDH/i.test(algorithm)) return 'key-exchange';
  if (/DSA|Dilithium|ECDSA|FALCON|SPHINCS/i.test(algorithm)) return 'signature';
  if (/AES|ChaCha/i.test(algorithm)) return 'encryption';
  if (/SHA|MD5|BLAKE/i.test(algorithm)) return 'hash';
  return 'unknown';
}

// Migration priority
function getMigrationPriority(algorithm: string): 'critical' | 'high' | 'medium' | 'low' {
  if (isVulnerable(algorithm)) return 'critical';
  if (isPQC(algorithm)) return 'low'; // Already quantum-safe
  if (/RSA|ECDSA/i.test(algorithm)) return 'high'; // Public-key crypto
  if (/AES-256/i.test(algorithm)) return 'medium'; // Symmetric crypto
  return 'medium';
}

interface ScanResult {
  algorithm: string;
  occurrences: number;
  locations: Array<{ line: number; context: string }>;
  isPQC: boolean;
  isVulnerable: boolean;
  type: string;
  priority: string;
}

export class PQCScannerPlugin implements Plugin {
  manifest: PluginManifest = {
    id: 'pqc-scanner',
    name: 'PQC Scanner',
    version: '1.0.0',
    description:
      'Scans documents and code repositories for cryptographic algorithm usage and generates Quantum Bill of Materials (QBOM)',
    author: 'ArcQubit',
    license: 'Proprietary',
    capabilities: ['crypto-scanning', 'document-analysis'],
    permissions: {
      readDocuments: true,
      writeDocuments: false,
      readWorkspaces: false,
      writeWorkspaces: false,
      readUsers: false,
      writeUsers: false,
      readAuditLogs: false,
      readCompliance: true,
      writeCompliance: true,
      executeJobs: true,
      externalNetwork: false,
      fileSystemAccess: false,
    },
    configSchema: {
      scanOnUpload: { type: 'boolean', default: true },
      autoGenerateQBOM: { type: 'boolean', default: true },
      notifyOnVulnerable: { type: 'boolean', default: true },
    },
    hooks: ['onDocumentUpload'],
  };

  async onInstall(context: PluginContext): Promise<void> {
    console.log(`📦 Installing PQC Scanner for tenant ${context.tenantId}`);
  }

  async onEnable(context: PluginContext): Promise<void> {
    console.log(`✅ Enabled PQC Scanner for tenant ${context.tenantId}`);
  }

  async onDisable(context: PluginContext): Promise<void> {
    console.log(`⏸️  Disabled PQC Scanner for tenant ${context.tenantId}`);
  }

  async onDocumentUpload(
    event: DocumentUploadEvent,
    context: PluginContext
  ): Promise<void> {
    const config = context.config as { scanOnUpload?: boolean; autoGenerateQBOM?: boolean };

    // Check if scan on upload is enabled
    if (!config.scanOnUpload) {
      return;
    }

    // Only scan code files
    const codeExtensions = [
      '.js',
      '.ts',
      '.py',
      '.java',
      '.c',
      '.cpp',
      '.cs',
      '.go',
      '.rs',
      '.rb',
      '.php',
    ];
    const ext = event.name.substring(event.name.lastIndexOf('.')).toLowerCase();
    if (!codeExtensions.includes(ext)) {
      return;
    }

    console.log(`🔍 Scanning document ${event.name} for cryptographic usage...`);

    // Get document content
    const document = await prisma.document.findUnique({
      where: { id: event.documentId },
      select: { contentText: true },
    });

    if (!document?.contentText) {
      return;
    }

    // Scan for crypto patterns
    const results = this.scanContent(document.contentText);

    if (results.length === 0) {
      console.log(`  No cryptographic usage detected`);
      return;
    }

    console.log(`  Found ${results.length} cryptographic algorithms:`);

    // Generate QBOM entries
    if (config.autoGenerateQBOM) {
      for (const result of results) {
        console.log(
          `    - ${result.algorithm} (${result.type}, priority: ${result.priority}): ${result.occurrences} occurrences`
        );

        // Check if QBOM entry already exists
        const existing = await prisma.qBOMEntry.findFirst({
          where: {
            tenantId: context.tenantId,
            component: `Document: ${event.name}`,
            algorithm: result.algorithm,
          },
        });

        if (!existing) {
          await prisma.qBOMEntry.create({
            data: {
              id: nanoid(),
              tenantId: context.tenantId,
              component: `Document: ${event.name}`,
              algorithm: result.algorithm,
              type: result.type,
              keySize: this.extractKeySize(result.algorithm),
              usage: `Found in ${event.name}`,
              migrationStatus: result.isPQC ? 'completed' : 'not_started',
              migrationPriority: result.priority,
              notes: `Detected ${result.occurrences} occurrence(s) by PQC Scanner plugin`,
              metadata: {
                documentId: event.documentId,
                documentName: event.name,
                detectedBy: 'pqc-scanner',
                locations: result.locations,
              },
            },
          });
        }

        // Create audit log for vulnerable algorithms
        if (result.isVulnerable) {
          await prisma.auditLog.create({
            data: {
              id: nanoid(),
              tenantId: context.tenantId,
              userId: event.uploadedBy,
              action: 'security.vulnerable_crypto_detected',
              resourceType: 'document',
              resourceId: event.documentId,
              metadata: {
                algorithm: result.algorithm,
                documentName: event.name,
                severity: 'high',
                recommendation: `Replace ${result.algorithm} with quantum-safe alternative`,
              },
            },
          });

          console.log(
            `    ⚠️  VULNERABLE: ${result.algorithm} should be replaced immediately!`
          );
        }
      }
    }
  }

  /**
   * Scan content for cryptographic algorithm usage
   */
  private scanContent(content: string): ScanResult[] {
    const results: Map<string, ScanResult> = new Map();

    const lines = content.split('\n');

    for (const [algorithm, pattern] of Object.entries(CRYPTO_PATTERNS)) {
      const matches: Array<{ line: number; context: string }> = [];

      lines.forEach((line, index) => {
        if (pattern.test(line)) {
          matches.push({
            line: index + 1,
            context: line.trim().substring(0, 100),
          });
        }
      });

      if (matches.length > 0) {
        results.set(algorithm, {
          algorithm,
          occurrences: matches.length,
          locations: matches,
          isPQC: isPQC(algorithm),
          isVulnerable: isVulnerable(algorithm),
          type: getAlgorithmType(algorithm),
          priority: getMigrationPriority(algorithm),
        });
      }
    }

    return Array.from(results.values());
  }

  /**
   * Extract key size from algorithm name
   */
  private extractKeySize(algorithm: string): string | null {
    const match = algorithm.match(/\d+/);
    return match ? match[0] : null;
  }

  /**
   * Scan a repository (for future use with Git integration)
   */
  async scanRepository(
    repositoryUrl: string,
    context: PluginContext
  ): Promise<ScanResult[]> {
    // TODO: Implement Git repository cloning and scanning
    // This would be a background job
    throw new Error('Repository scanning not yet implemented');
  }

  /**
   * Generate QBOM report
   */
  async generateQBOMReport(context: PluginContext): Promise<{
    totalAlgorithms: number;
    pqcCount: number;
    classicalCount: number;
    vulnerableCount: number;
    migrationProgress: number;
    entries: any[];
  }> {
    const entries = await prisma.qBOMEntry.findMany({
      where: { tenantId: context.tenantId },
    });

    const pqcCount = entries.filter((e) => isPQC(e.algorithm)).length;
    const vulnerableCount = entries.filter((e) => isVulnerable(e.algorithm)).length;
    const classicalCount = entries.length - pqcCount - vulnerableCount;

    const migrationProgress = entries.length > 0 ? (pqcCount / entries.length) * 100 : 0;

    return {
      totalAlgorithms: entries.length,
      pqcCount,
      classicalCount,
      vulnerableCount,
      migrationProgress,
      entries,
    };
  }
}

// Export plugin factory
export function createPQCScannerPlugin(): Plugin {
  return new PQCScannerPlugin();
}
