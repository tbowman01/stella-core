/**
 * PQC Key storage and management
 * In production, integrate with Azure Key Vault or AWS KMS
 */

import { PQCKeyPair, KeyStore } from './types';
import { randomString } from '@arcqubit/shared';

// In-memory key store (for MVP)
// In production, use Azure Key Vault, AWS KMS, or HSM
const keyStore = new Map<string, { keyPair: PQCKeyPair; label: string }>();

/**
 * Simple in-memory key store implementation
 */
export class InMemoryKeyStore implements KeyStore {
  async storeKey(keyPair: PQCKeyPair, label: string): Promise<string> {
    const keyId = keyPair.keyId || randomString(32);
    keyStore.set(keyId, { keyPair: { ...keyPair, keyId }, label });
    return keyId;
  }

  async getKey(keyId: string): Promise<PQCKeyPair | null> {
    const entry = keyStore.get(keyId);
    return entry ? entry.keyPair : null;
  }

  async listKeys(): Promise<Array<{ keyId: string; label: string; algorithm: string }>> {
    const keys: Array<{ keyId: string; label: string; algorithm: string }> = [];

    for (const [keyId, entry] of keyStore.entries()) {
      keys.push({
        keyId,
        label: entry.label,
        algorithm: entry.keyPair.algorithm,
      });
    }

    return keys;
  }

  async deleteKey(keyId: string): Promise<boolean> {
    return keyStore.delete(keyId);
  }

  async rotateKey(oldKeyId: string, newKeyPair: PQCKeyPair): Promise<string> {
    const oldEntry = keyStore.get(oldKeyId);

    if (!oldEntry) {
      throw new Error('Old key not found');
    }

    // Store new key with same label
    const newKeyId = await this.storeKey(newKeyPair, oldEntry.label);

    // Mark old key as rotated (but don't delete yet - needed for decryption)
    const rotatedLabel = `${oldEntry.label} (rotated ${new Date().toISOString()})`;
    keyStore.set(oldKeyId, { ...oldEntry, label: rotatedLabel });

    return newKeyId;
  }
}

/**
 * Get default key store
 */
export function getDefaultKeyStore(): KeyStore {
  return new InMemoryKeyStore();
}

/**
 * Initialize tenant keys
 */
export async function initializeTenantKeys(
  tenantId: string
): Promise<{
  kemKeyId: string;
  signatureKeyId: string;
}> {
  const store = getDefaultKeyStore();
  const { generateKEMKeyPair } = await import('./kem');
  const { generateSignatureKeyPair } = await import('./signature');

  // Generate KEM key pair
  const kemKeyPair = await generateKEMKeyPair('ML-KEM-768');
  const kemKeyId = await store.storeKey(kemKeyPair, `${tenantId}-kem`);

  // Generate signature key pair
  const signatureKeyPair = await generateSignatureKeyPair('ML-DSA-65');
  const signatureKeyId = await store.storeKey(signatureKeyPair, `${tenantId}-signature`);

  return {
    kemKeyId,
    signatureKeyId,
  };
}

/**
 * Get tenant KEM key
 */
export async function getTenantKEMKey(tenantId: string): Promise<PQCKeyPair | null> {
  const store = getDefaultKeyStore();
  const keys = await store.listKeys();

  const kemKey = keys.find((k) => k.label === `${tenantId}-kem` && !k.label.includes('rotated'));

  if (!kemKey) {
    return null;
  }

  return store.getKey(kemKey.keyId);
}

/**
 * Get tenant signature key
 */
export async function getTenantSignatureKey(tenantId: string): Promise<PQCKeyPair | null> {
  const store = getDefaultKeyStore();
  const keys = await store.listKeys();

  const signatureKey = keys.find(
    (k) => k.label === `${tenantId}-signature` && !k.label.includes('rotated')
  );

  if (!signatureKey) {
    return null;
  }

  return store.getKey(signatureKey.keyId);
}

/**
 * Rotate tenant keys
 */
export async function rotateTenantKeys(
  tenantId: string
): Promise<{
  newKemKeyId: string;
  newSignatureKeyId: string;
}> {
  const store = getDefaultKeyStore();
  const { generateKEMKeyPair } = await import('./kem');
  const { generateSignatureKeyPair } = await import('./signature');

  // Find current keys
  const keys = await store.listKeys();

  const currentKEMKey = keys.find(
    (k) => k.label === `${tenantId}-kem` && !k.label.includes('rotated')
  );
  const currentSignatureKey = keys.find(
    (k) => k.label === `${tenantId}-signature` && !k.label.includes('rotated')
  );

  if (!currentKEMKey || !currentSignatureKey) {
    throw new Error('Current keys not found');
  }

  // Generate new keys
  const newKemKeyPair = await generateKEMKeyPair('ML-KEM-768');
  const newSignatureKeyPair = await generateSignatureKeyPair('ML-DSA-65');

  // Rotate
  const newKemKeyId = await store.rotateKey(currentKEMKey.keyId, newKemKeyPair);
  const newSignatureKeyId = await store.rotateKey(currentSignatureKey.keyId, newSignatureKeyPair);

  return {
    newKemKeyId,
    newSignatureKeyId,
  };
}
