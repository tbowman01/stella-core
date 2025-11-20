/**
 * Digital Signatures
 * ML-DSA (formerly Dilithium) implementation
 *
 * NOTE: This is a placeholder implementation using classical crypto.
 * In production, integrate with liboqs or pqc-dilithium library.
 */

import crypto from 'crypto';
import { SignatureAlgorithm, PQCKeyPair } from './types';

/**
 * Generate ML-DSA key pair for signing
 *
 * @param algorithm - ML-DSA-65, ML-DSA-87, or SLH-DSA-SHA2-128s
 * @returns PQC signature key pair
 */
export async function generateSignatureKeyPair(
  algorithm: SignatureAlgorithm = 'ML-DSA-65'
): Promise<PQCKeyPair> {
  // In production, use liboqs:
  // const oqs = require('liboqs');
  // const sig = new oqs.Signature(algorithm);
  // const keypair = sig.generate_keypair();

  // For MVP/demo, simulate with RSA (classical)
  // ML-DSA-65 public key is ~1952 bytes, private key is ~4000 bytes
  const keySize = algorithm === 'ML-DSA-65' ? 3072 : 4096;

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
 * Sign data with ML-DSA
 *
 * @param data - Data to sign
 * @param privateKey - Signer's private key
 * @param algorithm - Signature algorithm
 * @returns Signature
 */
export async function sign(
  data: Buffer,
  privateKey: Buffer,
  algorithm: SignatureAlgorithm = 'ML-DSA-65'
): Promise<Buffer> {
  // In production, use liboqs:
  // const oqs = require('liboqs');
  // const sig = new oqs.Signature(algorithm);
  // const signature = sig.sign(data, privateKey);

  // For MVP/demo, use RSA-PSS
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(data);
  signer.end();

  const signature = signer.sign({
    key: privateKey,
    padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
    saltLength: crypto.constants.RSA_PSS_SALTLEN_MAX_SIGN,
  });

  return signature;
}

/**
 * Verify ML-DSA signature
 *
 * @param data - Original data
 * @param signature - Signature to verify
 * @param publicKey - Signer's public key
 * @param algorithm - Signature algorithm
 * @returns true if signature is valid
 */
export async function verify(
  data: Buffer,
  signature: Buffer,
  publicKey: Buffer,
  algorithm: SignatureAlgorithm = 'ML-DSA-65'
): Promise<boolean> {
  // In production, use liboqs:
  // const oqs = require('liboqs');
  // const sig = new oqs.Signature(algorithm);
  // return sig.verify(data, signature, publicKey);

  // For MVP/demo, use RSA-PSS
  try {
    const verifier = crypto.createVerify('RSA-SHA256');
    verifier.update(data);
    verifier.end();

    return verifier.verify(
      {
        key: publicKey,
        padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
        saltLength: crypto.constants.RSA_PSS_SALTLEN_MAX_SIGN,
      },
      signature
    );
  } catch (error) {
    console.error('Signature verification failed:', error);
    return false;
  }
}

/**
 * Verify signature key pair is valid
 */
export async function verifySignatureKeyPair(keyPair: PQCKeyPair): Promise<boolean> {
  try {
    const testData = Buffer.from('test data for signature verification');
    const signature = await sign(testData, keyPair.privateKey, keyPair.algorithm as SignatureAlgorithm);
    return await verify(testData, signature, keyPair.publicKey, keyPair.algorithm as SignatureAlgorithm);
  } catch (error) {
    console.error('Signature key pair verification failed:', error);
    return false;
  }
}

/**
 * Get algorithm parameters
 */
export function getSignatureParameters(algorithm: SignatureAlgorithm): {
  publicKeySize: number;
  privateKeySize: number;
  signatureSize: number;
} {
  const parameters = {
    'ML-DSA-65': {
      publicKeySize: 1952,
      privateKeySize: 4000,
      signatureSize: 3309,
    },
    'ML-DSA-87': {
      publicKeySize: 2592,
      privateKeySize: 4864,
      signatureSize: 4627,
    },
    'SLH-DSA-SHA2-128s': {
      publicKeySize: 32,
      privateKeySize: 64,
      signatureSize: 7856,
    },
  };

  return parameters[algorithm];
}
