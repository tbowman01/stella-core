import { describe, it, expect, beforeEach } from 'vitest';
import { hashPassword, verifyPassword, validatePassword, calculatePasswordStrength } from '../src/password';

describe('@arcqubit/auth - Password', () => {
  describe('hashPassword', () => {
    it('should hash password with bcrypt', async () => {
      const password = 'TestPassword123!';
      const hash = await hashPassword(password);

      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(hash).toMatch(/^\$2[aby]\$/); // bcrypt format
    });

    it('should generate different hashes for same password', async () => {
      const password = 'TestPassword123!';
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('verifyPassword', () => {
    it('should verify correct password', async () => {
      const password = 'TestPassword123!';
      const hash = await hashPassword(password);
      const isValid = await verifyPassword(password, hash);

      expect(isValid).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const password = 'TestPassword123!';
      const hash = await hashPassword(password);
      const isValid = await verifyPassword('WrongPassword123!', hash);

      expect(isValid).toBe(false);
    });

    it('should reject empty password', async () => {
      const hash = await hashPassword('TestPassword123!');
      const isValid = await verifyPassword('', hash);

      expect(isValid).toBe(false);
    });
  });

  describe('validatePassword', () => {
    it('should accept valid password', () => {
      const result = validatePassword('ValidP@ssw0rd123');
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject password shorter than 12 characters', () => {
      const result = validatePassword('Short1!');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must be at least 12 characters');
    });

    it('should reject password without uppercase', () => {
      const result = validatePassword('nouppercase123!');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one uppercase letter');
    });

    it('should reject password without lowercase', () => {
      const result = validatePassword('NOLOWERCASE123!');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one lowercase letter');
    });

    it('should reject password without number', () => {
      const result = validatePassword('NoNumbersHere!');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one number');
    });

    it('should reject password without special character', () => {
      const result = validatePassword('NoSpecialChar123');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one special character');
    });

    it('should collect multiple errors', () => {
      const result = validatePassword('weak');
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
    });
  });

  describe('calculatePasswordStrength', () => {
    it('should score weak passwords low', () => {
      const score = calculatePasswordStrength('password');
      expect(score).toBeLessThan(40);
    });

    it('should score medium passwords moderately', () => {
      const score = calculatePasswordStrength('Password123');
      expect(score).toBeGreaterThanOrEqual(40);
      expect(score).toBeLessThan(70);
    });

    it('should score strong passwords high', () => {
      const score = calculatePasswordStrength('SuperSecureP@ssw0rd2024!');
      expect(score).toBeGreaterThanOrEqual(70);
    });

    it('should give higher score for longer passwords', () => {
      const short = calculatePasswordStrength('Test123!');
      const long = calculatePasswordStrength('VeryLongSecureP@ssw0rd2024!');
      expect(long).toBeGreaterThan(short);
    });

    it('should give higher score for character variety', () => {
      const simple = calculatePasswordStrength('aaaaaaaa1111!!!!');
      const varied = calculatePasswordStrength('aB3$xY9@mN2*');
      expect(varied).toBeGreaterThan(simple);
    });

    it('should return score between 0 and 100', () => {
      const passwords = [
        'weak',
        'Medium123!',
        'VeryStrongP@ssw0rd2024WithExtraLength!',
      ];

      passwords.forEach((password) => {
        const score = calculatePasswordStrength(password);
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(100);
      });
    });
  });
});
