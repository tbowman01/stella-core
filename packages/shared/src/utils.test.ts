import { describe, it, expect } from 'vitest';
import {
  hasRole,
  canAccessClassification,
  redactPHI,
  retry,
  calculatePagination,
  validateEmail,
  validatePassword,
} from '../src/utils';

describe('@arcqubit/shared - Utilities', () => {
  describe('hasRole', () => {
    it('should return true for exact role match', () => {
      expect(hasRole('admin', 'admin')).toBe(true);
      expect(hasRole('manager', 'manager')).toBe(true);
    });

    it('should return true for higher roles', () => {
      expect(hasRole('admin', 'viewer')).toBe(true);
      expect(hasRole('admin', 'contributor')).toBe(true);
      expect(hasRole('manager', 'viewer')).toBe(true);
    });

    it('should return false for lower roles', () => {
      expect(hasRole('viewer', 'admin')).toBe(false);
      expect(hasRole('contributor', 'manager')).toBe(false);
    });
  });

  describe('canAccessClassification', () => {
    it('should allow restricted clearance to access all classifications', () => {
      expect(canAccessClassification('restricted', 'public')).toBe(true);
      expect(canAccessClassification('restricted', 'internal')).toBe(true);
      expect(canAccessClassification('restricted', 'confidential')).toBe(true);
      expect(canAccessClassification('restricted', 'restricted')).toBe(true);
    });

    it('should restrict public clearance from higher classifications', () => {
      expect(canAccessClassification('public', 'public')).toBe(true);
      expect(canAccessClassification('public', 'internal')).toBe(false);
      expect(canAccessClassification('public', 'confidential')).toBe(false);
      expect(canAccessClassification('public', 'restricted')).toBe(false);
    });

    it('should allow confidential clearance to access up to confidential', () => {
      expect(canAccessClassification('confidential', 'public')).toBe(true);
      expect(canAccessClassification('confidential', 'internal')).toBe(true);
      expect(canAccessClassification('confidential', 'confidential')).toBe(true);
      expect(canAccessClassification('confidential', 'restricted')).toBe(false);
    });
  });

  describe('redactPHI', () => {
    it('should redact SSN', () => {
      const text = 'My SSN is 123-45-6789 and my email is test@example.com';
      const redacted = redactPHI(text);
      expect(redacted).not.toContain('123-45-6789');
      expect(redacted).toContain('[REDACTED_SSN]');
    });

    it('should redact email addresses', () => {
      const text = 'Contact me at john.doe@example.com for more info';
      const redacted = redactPHI(text);
      expect(redacted).not.toContain('john.doe@example.com');
      expect(redacted).toContain('[REDACTED_EMAIL]');
    });

    it('should redact phone numbers', () => {
      const text = 'Call me at 555-123-4567';
      const redacted = redactPHI(text);
      expect(redacted).not.toContain('555-123-4567');
      expect(redacted).toContain('[REDACTED_PHONE]');
    });

    it('should redact multiple PHI types', () => {
      const text = 'SSN: 123-45-6789, Email: test@example.com, Phone: 555-1234';
      const redacted = redactPHI(text);
      expect(redacted).toContain('[REDACTED_SSN]');
      expect(redacted).toContain('[REDACTED_EMAIL]');
      expect(redacted).toContain('[REDACTED_PHONE]');
    });

    it('should preserve non-PHI text', () => {
      const text = 'This is normal text without PHI';
      const redacted = redactPHI(text);
      expect(redacted).toBe(text);
    });
  });

  describe('retry', () => {
    it('should succeed on first attempt', async () => {
      const fn = vi.fn(async () => 'success');
      const result = await retry(fn, 3, 100);
      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure and eventually succeed', async () => {
      let attempts = 0;
      const fn = vi.fn(async () => {
        attempts++;
        if (attempts < 3) throw new Error('Temporary error');
        return 'success';
      });

      const result = await retry(fn, 3, 10);
      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(3);
    });

    it('should throw after max retries', async () => {
      const fn = vi.fn(async () => {
        throw new Error('Permanent error');
      });

      await expect(retry(fn, 3, 10)).rejects.toThrow('Permanent error');
      expect(fn).toHaveBeenCalledTimes(3);
    });
  });

  describe('calculatePagination', () => {
    it('should calculate pagination correctly', () => {
      const result = calculatePagination(100, 10, 0);
      expect(result).toEqual({
        total: 100,
        page: 1,
        pageSize: 10,
        totalPages: 10,
        hasNext: true,
        hasPrev: false,
      });
    });

    it('should handle last page', () => {
      const result = calculatePagination(95, 10, 90);
      expect(result).toEqual({
        total: 95,
        page: 10,
        pageSize: 10,
        totalPages: 10,
        hasNext: false,
        hasPrev: true,
      });
    });

    it('should handle empty results', () => {
      const result = calculatePagination(0, 10, 0);
      expect(result).toEqual({
        total: 0,
        page: 1,
        pageSize: 10,
        totalPages: 0,
        hasNext: false,
        hasPrev: false,
      });
    });
  });

  describe('validateEmail', () => {
    it('should validate correct emails', () => {
      expect(validateEmail('test@example.com')).toBe(true);
      expect(validateEmail('user.name@domain.co.uk')).toBe(true);
      expect(validateEmail('user+tag@example.com')).toBe(true);
    });

    it('should reject invalid emails', () => {
      expect(validateEmail('invalid')).toBe(false);
      expect(validateEmail('missing@domain')).toBe(false);
      expect(validateEmail('@example.com')).toBe(false);
      expect(validateEmail('user@')).toBe(false);
    });
  });

  describe('validatePassword', () => {
    it('should validate strong passwords', () => {
      const result = validatePassword('StrongP@ssw0rd123');
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject short passwords', () => {
      const result = validatePassword('Short1!');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must be at least 12 characters');
    });

    it('should require uppercase letter', () => {
      const result = validatePassword('alllowercase123!');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one uppercase letter');
    });

    it('should require lowercase letter', () => {
      const result = validatePassword('ALLUPPERCASE123!');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one lowercase letter');
    });

    it('should require number', () => {
      const result = validatePassword('NoNumbersHere!');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one number');
    });

    it('should require special character', () => {
      const result = validatePassword('NoSpecialChars123');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one special character');
    });
  });
});
