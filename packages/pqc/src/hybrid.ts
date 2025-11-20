/**
 * Hybrid encryption combining classical and post-quantum crypto
 * Uses AES-256-GCM for bulk encryption + ML-KEM for key wrapping + ML-DSA for signatures
 */

import crypto from 'crypto';
import { encapsulate, decapsulate } from './kem';
import { sign, verify } from './signature';
import { KEMAlgorithm, SignatureAlgorithm, EncryptedData, PQCKeyPair } from './types';

/**
 * Encrypt data using hybrid PQC
 *
 * Flow:
 * 1. Generate random AES-256 key for bulk encryption
 * 2. Encrypt data with AES-256-GCM
 * 3. Wrap AES key using ML-KEM (PQC)
 * 4. Sign encrypted data using ML-DSA (PQC)
 *
 * @param data - Data to encrypt
 * @param recipientKEMPublicKey - Recipient's KEM public key
 * @param signerPrivateKey - Signer's signature private key
 * @returns Encrypted data bundle
 */
export async function hybridEncrypt(
  data: Buffer,
  recipientKEMPublicKey: Buffer,
  signerPrivateKey: Buffer,
  options: {
    kemAlgorithm?: KEMAlgorithm;
    signatureAlgorithm?: SignatureAlgorithm;
  } = {}
): Promise<EncryptedData> {
  const kemAlgorithm = options.kemAlgorithm || 'ML-KEM-768';
  const signatureAlgorithm = options.signatureAlgorithm || 'ML-DSA-65';

  // Step 1: Generate random AES-256 key
  const aesKey = crypto.randomBytes(32); // 256 bits

  // Step 2: Encrypt data with AES-256-GCM
  const iv = crypto.randomBytes(12); // 96-bit IV for GCM
  const cipher = crypto.createCipheriv('aes-256-gcm', aesKey, iv);

  const ciphertext = Buffer.concat([cipher.update(data), cipher.final()]);
  const authTag = cipher.getAuthTag();

  // Step 3: Wrap AES key using ML-KEM
  const { ciphertext: wrappedKey } = await encapsulate(recipientKEMPublicKey, kemAlgorithm);

  // Step 4: Sign the ciphertext using ML-DSA
  const signature = await sign(ciphertext, signerPrivateKey, signatureAlgorithm);

  return {
    ciphertext,
    algorithm: 'AES-256-GCM',
    iv,
    authTag,
    wrappedKey,
    kemAlgorithm,
    signature,
    signatureAlgorithm,
    timestamp: Date.now(),
    version: '1.0',
  };
}

/**
 * Decrypt data using hybrid PQC
 *
 * Flow:
 * 1. Verify signature using ML-DSA
 * 2. Unwrap AES key using ML-KEM
 * 3. Decrypt data with AES-256-GCM
 *
 * @param encryptedData - Encrypted data bundle
 * @param recipientKEMPrivateKey - Recipient's KEM private key
 * @param signerPublicKey - Signer's signature public key
 * @returns Decrypted data
 */
export async function hybridDecrypt(
  encryptedData: EncryptedData,
  recipientKEMPrivateKey: Buffer,
  signerPublicKey: Buffer
): Promise<Buffer> {
  // Step 1: Verify signature
  const signatureValid = await verify(
    encryptedData.ciphertext,
    encryptedData.signature,
    signerPublicKey,
    encryptedData.signatureAlgorithm
  );

  if (!signatureValid) {
    throw new Error('Signature verification failed');
  }

  // Step 2: Unwrap AES key using ML-KEM
  const aesKey = await decapsulate(
    encryptedData.wrappedKey,
    recipientKEMPrivateKey,
    encryptedData.kemAlgorithm
  );

  // Step 3: Decrypt data with AES-256-GCM
  const decipher = crypto.createDecipheriv('aes-256-gcm', aesKey, encryptedData.iv);
  decipher.setAuthTag(encryptedData.authTag);

  const plaintext = Buffer.concat([
    decipher.update(encryptedData.ciphertext),
    decipher.final(),
  ]);

  return plaintext;
}

/**
 * Encrypt file for storage
 * Simplified version for document encryption
 */
export async function encryptFile(
  fileBuffer: Buffer,
  tenantKEMPublicKey: Buffer,
  systemSignaturePrivateKey: Buffer
): Promise<EncryptedData> {
  return hybridEncrypt(fileBuffer, tenantKEMPublicKey, systemSignaturePrivateKey);
}

/**
 * Decrypt file from storage
 */
export async function decryptFile(
  encryptedData: EncryptedData,
  tenantKEMPrivateKey: Buffer,
  systemSignaturePublicKey: Buffer
): Promise<Buffer> {
  return hybridDecrypt(encryptedData, tenantKEMPrivateKey, systemSignaturePublicKey);
}

/**
 * Re-encrypt data with new key (for key rotation)
 */
export async function reencrypt(
  encryptedData: EncryptedData,
  oldKEMPrivateKey: Buffer,
  newKEMPublicKey: Buffer,
  signerPublicKey: Buffer,
  signerPrivateKey: Buffer
): Promise<EncryptedData> {
  // Decrypt with old key
  const plaintext = await hybridDecrypt(encryptedData, oldKEMPrivateKey, signerPublicKey);

  // Encrypt with new key
  return hybridEncrypt(plaintext, newKEMPublicKey, signerPrivateKey);
}

/**
 * Validate encrypted data structure
 */
export function validateEncryptedData(data: any): data is EncryptedData {
  return (
    Buffer.isBuffer(data.ciphertext) &&
    typeof data.algorithm === 'string' &&
    Buffer.isBuffer(data.iv) &&
    Buffer.isBuffer(data.authTag) &&
    Buffer.isBuffer(data.wrappedKey) &&
    typeof data.kemAlgorithm === 'string' &&
    Buffer.isBuffer(data.signature) &&
    typeof data.signatureAlgorithm === 'string' &&
    typeof data.timestamp === 'number' &&
    typeof data.version === 'string'
  );
}

/**
 * Serialize encrypted data for storage
 */
export function serializeEncryptedData(data: EncryptedData): string {
  return JSON.stringify({
    ciphertext: data.ciphertext.toString('base64'),
    algorithm: data.algorithm,
    iv: data.iv.toString('base64'),
    authTag: data.authTag.toString('base64'),
    wrappedKey: data.wrappedKey.toString('base64'),
    kemAlgorithm: data.kemAlgorithm,
    signature: data.signature.toString('base64'),
    signatureAlgorithm: data.signatureAlgorithm,
    timestamp: data.timestamp,
    version: data.version,
  });
}

/**
 * Deserialize encrypted data from storage
 */
export function deserializeEncryptedData(json: string): EncryptedData {
  const parsed = JSON.parse(json);

  return {
    ciphertext: Buffer.from(parsed.ciphertext, 'base64'),
    algorithm: parsed.algorithm,
    iv: Buffer.from(parsed.iv, 'base64'),
    authTag: Buffer.from(parsed.authTag, 'base64'),
    wrappedKey: Buffer.from(parsed.wrappedKey, 'base64'),
    kemAlgorithm: parsed.kemAlgorithm,
    signature: Buffer.from(parsed.signature, 'base64'),
    signatureAlgorithm: parsed.signatureAlgorithm,
    timestamp: parsed.timestamp,
    version: parsed.version,
  };
}
