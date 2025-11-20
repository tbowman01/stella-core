/**
 * Key Encapsulation Mechanism (KEM)
 * ML-KEM (formerly Kyber) implementation
 *
 * NOTE: This is a placeholder implementation using classical crypto.
 * In production, integrate with liboqs or pqc-kyber library.
 */

import crypto from 'crypto';
import { KEMAlgorithm, PQCKeyPair, KEMResult } from './types';

/**
 * Generate ML-KEM key pair
 *
 * @param algorithm - ML-KEM-768 or ML-KEM-1024
 * @returns PQC key pair
 */
export async function generateKEMKeyPair(algorithm: KEMAlgorithm = 'ML-KEM-768'): Promise<PQCKeyPair> {
  // In production, use liboqs:
  // const oqs = require('liboqs');
  // const kem = new oqs.KeyEncapsulation(algorithm);
  // const keypair = kem.generate_keypair();

  // For MVP/demo, simulate with RSA (classical)
  // ML-KEM-768 public key is ~1184 bytes, private key is ~2400 bytes
  const keySize = algorithm === 'ML-KEM-768' ? 2048 : 3072;

  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: keySize,
    publicKeyEncoding: {
      type: 'spki',
      format: 'der',
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'der',
    },
  });

  return {
    publicKey: Buffer.from(publicKey),
    privateKey: Buffer.from(privateKey),
    algorithm,
    createdAt: new Date(),
  };
}

/**
 * Encapsulate - Generate shared secret and encapsulate it
 *
 * @param publicKey - Recipient's public key
 * @param algorithm - KEM algorithm to use
 * @returns Ciphertext and shared secret
 */
export async function encapsulate(
  publicKey: Buffer,
  algorithm: KEMAlgorithm = 'ML-KEM-768'
): Promise<KEMResult> {
  // In production, use liboqs:
  // const oqs = require('liboqs');
  // const kem = new oqs.KeyEncapsulation(algorithm);
  // const { ciphertext, sharedSecret } = kem.encap_secret(publicKey);

  // For MVP/demo, use RSA encryption
  const sharedSecret = crypto.randomBytes(32); // 256-bit shared secret

  const ciphertext = crypto.publicEncrypt(
    {
      key: publicKey,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: 'sha256',
    },
    sharedSecret
  );

  return {
    ciphertext,
    sharedSecret,
  };
}

/**
 * Decapsulate - Extract shared secret from ciphertext
 *
 * @param ciphertext - Encapsulated shared secret
 * @param privateKey - Recipient's private key
 * @param algorithm - KEM algorithm used
 * @returns Shared secret
 */
export async function decapsulate(
  ciphertext: Buffer,
  privateKey: Buffer,
  algorithm: KEMAlgorithm = 'ML-KEM-768'
): Promise<Buffer> {
  // In production, use liboqs:
  // const oqs = require('liboqs');
  // const kem = new oqs.KeyEncapsulation(algorithm);
  // const sharedSecret = kem.decap_secret(ciphertext, privateKey);

  // For MVP/demo, use RSA decryption
  const sharedSecret = crypto.privateDecrypt(
    {
      key: privateKey,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: 'sha256',
    },
    ciphertext
  );

  return sharedSecret;
}

/**
 * Verify KEM key pair is valid
 */
export async function verifyKEMKeyPair(keyPair: PQCKeyPair): Promise<boolean> {
  try {
    // Test encapsulation and decapsulation
    const { ciphertext, sharedSecret } = await encapsulate(keyPair.publicKey, keyPair.algorithm as KEMAlgorithm);
    const decapsulatedSecret = await decapsulate(ciphertext, keyPair.privateKey, keyPair.algorithm as KEMAlgorithm);

    return sharedSecret.equals(decapsulatedSecret);
  } catch (error) {
    console.error('KEM key pair verification failed:', error);
    return false;
  }
}

/**
 * Get algorithm parameters
 */
export function getKEMParameters(algorithm: KEMAlgorithm): {
  publicKeySize: number;
  privateKeySize: number;
  ciphertextSize: number;
  sharedSecretSize: number;
} {
  const parameters = {
    'ML-KEM-768': {
      publicKeySize: 1184,
      privateKeySize: 2400,
      ciphertextSize: 1088,
      sharedSecretSize: 32,
    },
    'ML-KEM-1024': {
      publicKeySize: 1568,
      privateKeySize: 3168,
      ciphertextSize: 1568,
      sharedSecretSize: 32,
    },
  };

  return parameters[algorithm];
}
