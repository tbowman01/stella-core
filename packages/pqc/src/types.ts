/**
 * PQC types
 */

export type KEMAlgorithm = 'ML-KEM-768' | 'ML-KEM-1024';
export type SignatureAlgorithm = 'ML-DSA-65' | 'ML-DSA-87' | 'SLH-DSA-SHA2-128s';

export interface PQCKeyPair {
  publicKey: Buffer;
  privateKey: Buffer;
  algorithm: KEMAlgorithm | SignatureAlgorithm;
  createdAt: Date;
  keyId?: string;
}

export interface KEMResult {
  ciphertext: Buffer;
  sharedSecret: Buffer;
}

export interface EncryptedData {
  // Symmetric encryption of actual data
  ciphertext: Buffer;
  algorithm: string; // e.g., "AES-256-GCM"
  iv: Buffer;
  authTag: Buffer;

  // PQC-wrapped symmetric key
  wrappedKey: Buffer;
  kemAlgorithm: KEMAlgorithm;

  // PQC signature for integrity
  signature: Buffer;
  signatureAlgorithm: SignatureAlgorithm;

  // Metadata
  timestamp: number;
  version: string;
}

export interface QBOMEntry {
  componentName: string;
  componentType: 'library' | 'service' | 'algorithm' | 'key';
  algorithms: string[];
  quantumSafe: boolean;
  migrationStatus: 'not_started' | 'in_progress' | 'completed';
  details: {
    version?: string;
    keySize?: number;
    usage?: string;
    location?: string;
  };
}

export interface KeyStore {
  storeKey(keyPair: PQCKeyPair, label: string): Promise<string>;
  getKey(keyId: string): Promise<PQCKeyPair | null>;
  listKeys(): Promise<Array<{ keyId: string; label: string; algorithm: string }>>;
  deleteKey(keyId: string): Promise<boolean>;
  rotateKey(oldKeyId: string, newKeyPair: PQCKeyPair): Promise<string>;
}

export interface PQCConfig {
  enabled: boolean;
  kemAlgorithm: KEMAlgorithm;
  signatureAlgorithm: SignatureAlgorithm;
  keyRotationDays: number;
  fallbackToClassical: boolean;
}

export const DEFAULT_PQC_CONFIG: PQCConfig = {
  enabled: true,
  kemAlgorithm: 'ML-KEM-768',
  signatureAlgorithm: 'ML-DSA-65',
  keyRotationDays: 90,
  fallbackToClassical: true,
};
