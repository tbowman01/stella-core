# @arcqubit/pqc

Post-Quantum Cryptography package for ArcQubit Knowledge Work Platform.

## Overview

This package provides quantum-ready encryption using NIST-approved PQC algorithms:

- **ML-KEM (formerly Kyber)**: Key Encapsulation Mechanism for key exchange
- **ML-DSA (formerly Dilithium)**: Digital signatures for authentication and integrity

## Architecture

### Hybrid Encryption Flow

```
Plaintext
    ↓
[1] Generate random AES-256 key
    ↓
[2] Encrypt with AES-256-GCM → Ciphertext
    ↓
[3] Wrap AES key with ML-KEM (PQC) → Wrapped Key
    ↓
[4] Sign ciphertext with ML-DSA (PQC) → Signature
    ↓
EncryptedData {
  ciphertext,
  wrappedKey,
  signature
}
```

### Decryption Flow

```
EncryptedData
    ↓
[1] Verify signature with ML-DSA
    ↓
[2] Unwrap AES key with ML-KEM
    ↓
[3] Decrypt with AES-256-GCM
    ↓
Plaintext
```

## Usage

### Generate Keys

```typescript
import { generateKEMKeyPair, generateSignatureKeyPair } from '@arcqubit/pqc';

// Generate KEM key pair for encryption
const kemKeys = await generateKEMKeyPair('ML-KEM-768');

// Generate signature key pair for signing
const signatureKeys = await generateSignatureKeyPair('ML-DSA-65');
```

### Encrypt Data

```typescript
import { hybridEncrypt } from '@arcqubit/pqc';

const plaintext = Buffer.from('sensitive data');
const encrypted = await hybridEncrypt(
  plaintext,
  recipientKEMPublicKey,
  signerPrivateKey
);

// encrypted contains:
// - ciphertext (AES-256-GCM)
// - wrappedKey (ML-KEM)
// - signature (ML-DSA)
```

### Decrypt Data

```typescript
import { hybridDecrypt } from '@arcqubit/pqc';

const plaintext = await hybridDecrypt(
  encrypted,
  recipientKEMPrivateKey,
  signerPublicKey
);
```

### Generate QBOM

```typescript
import { generateQBOM, analyzeQBOM } from '@arcqubit/pqc';

const qbom = await generateQBOM();
const analysis = await analyzeQBOM(qbom);

console.log(`Quantum-safe components: ${analysis.quantumSafeCount}/${analysis.totalComponents}`);
console.log(`Migration progress: ${analysis.migrationProgress.completed} completed`);
```

## Algorithms

### ML-KEM (Key Encapsulation)

| Algorithm   | Public Key | Private Key | Ciphertext | Shared Secret |
|-------------|------------|-------------|------------|---------------|
| ML-KEM-768  | 1184 bytes | 2400 bytes  | 1088 bytes | 32 bytes      |
| ML-KEM-1024 | 1568 bytes | 3168 bytes  | 1568 bytes | 32 bytes      |

### ML-DSA (Signatures)

| Algorithm  | Public Key | Private Key | Signature  |
|------------|------------|-------------|------------|
| ML-DSA-65  | 1952 bytes | 4000 bytes  | 3309 bytes |
| ML-DSA-87  | 2592 bytes | 4864 bytes  | 4627 bytes |

## MVP Implementation Note

⚠️ **Current implementation uses RSA (classical crypto) as a placeholder.**

In production, this package will integrate with [liboqs](https://github.com/open-quantum-safe/liboqs) or equivalent PQC libraries to provide actual NIST-approved PQC algorithms.

The interface and data structures are designed to be compatible with real PQC implementations.

## Key Management

Keys are stored in an in-memory key store for MVP. In production, integrate with:

- Azure Key Vault
- AWS Key Management Service (KMS)
- Hardware Security Modules (HSM)

```typescript
import { initializeTenantKeys, rotateTenantKeys } from '@arcqubit/pqc';

// Initialize keys for a tenant
const { kemKeyId, signatureKeyId } = await initializeTenantKeys('tenant-123');

// Rotate keys (recommended every 90 days)
const { newKemKeyId, newSignatureKeyId } = await rotateTenantKeys('tenant-123');
```

## QBOM (Quantum Bill of Materials)

Track all cryptographic components for migration planning:

```typescript
import { generateQBOM, exportQBOMToJSON, saveQBOMToDatabase } from '@arcqubit/pqc';

const qbom = await generateQBOM();

// Export for auditors
const json = exportQBOMToJSON(qbom);

// Save to database for tracking
await saveQBOMToDatabase('tenant-123', qbom);
```

## Security Considerations

1. **Key Rotation**: Rotate keys every 90 days or per policy
2. **Key Storage**: Use HSM or cloud KMS in production
3. **Algorithm Selection**: ML-KEM-768 and ML-DSA-65 recommended for most use cases
4. **Hybrid Approach**: AES-256-GCM + PQC ensures protection even if PQC is broken
5. **Migration Path**: Clear upgrade path from classical to PQC

## License

Proprietary - Copyright © 2025 ArcQubit
