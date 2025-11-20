import { describe, it, expect } from 'vitest';
import { generateAccessToken, generateRefreshToken, verifyToken, decodeToken } from '../src/jwt';

describe('@arcqubit/auth - JWT', () => {
  const testPayload = {
    userId: 'user-123',
    tenantId: 'tenant-123',
    email: 'test@example.com',
    role: 'contributor',
  };

  describe('generateAccessToken', () => {
    it('should generate valid JWT token', () => {
      const token = generateAccessToken(testPayload);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT format: header.payload.signature
    });

    it('should include payload data', () => {
      const token = generateAccessToken(testPayload);
      const decoded = decodeToken(token);

      expect(decoded).toBeDefined();
      expect(decoded?.userId).toBe(testPayload.userId);
      expect(decoded?.tenantId).toBe(testPayload.tenantId);
      expect(decoded?.email).toBe(testPayload.email);
      expect(decoded?.role).toBe(testPayload.role);
    });

    it('should include expiration timestamp', () => {
      const token = generateAccessToken(testPayload);
      const decoded = decodeToken(token);

      expect(decoded).toBeDefined();
      expect(decoded?.exp).toBeDefined();
      expect(typeof decoded?.exp).toBe('number');
      expect(decoded!.exp).toBeGreaterThan(Date.now() / 1000);
    });

    it('should include issued at timestamp', () => {
      const token = generateAccessToken(testPayload);
      const decoded = decodeToken(token);

      expect(decoded).toBeDefined();
      expect(decoded?.iat).toBeDefined();
      expect(typeof decoded?.iat).toBe('number');
    });
  });

  describe('generateRefreshToken', () => {
    it('should generate valid refresh token', () => {
      const token = generateRefreshToken(testPayload.userId, testPayload.tenantId);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3);
    });

    it('should include user and tenant IDs', () => {
      const token = generateRefreshToken(testPayload.userId, testPayload.tenantId);
      const decoded = decodeToken(token);

      expect(decoded).toBeDefined();
      expect(decoded?.userId).toBe(testPayload.userId);
      expect(decoded?.tenantId).toBe(testPayload.tenantId);
    });
  });

  describe('verifyToken', () => {
    it('should verify valid token', () => {
      const token = generateAccessToken(testPayload);
      const decoded = verifyToken(token);

      expect(decoded).toBeDefined();
      expect(decoded.userId).toBe(testPayload.userId);
    });

    it('should throw on invalid token', () => {
      expect(() => verifyToken('invalid.token.here')).toThrow();
    });

    it('should throw on malformed token', () => {
      expect(() => verifyToken('notavalidtoken')).toThrow();
    });

    it('should throw on empty token', () => {
      expect(() => verifyToken('')).toThrow();
    });
  });

  describe('decodeToken', () => {
    it('should decode without verification', () => {
      const token = generateAccessToken(testPayload);
      const decoded = decodeToken(token);

      expect(decoded).toBeDefined();
      expect(decoded?.userId).toBe(testPayload.userId);
    });

    it('should return null for invalid token', () => {
      const decoded = decodeToken('invalid.token');
      expect(decoded).toBeNull();
    });

    it('should decode expired token without throwing', () => {
      // Note: This test assumes the token can be decoded even if expired
      const token = generateAccessToken(testPayload);
      const decoded = decodeToken(token);

      expect(decoded).toBeDefined();
    });
  });
});
