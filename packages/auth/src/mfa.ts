/**
 * Multi-factor authentication (MFA) using TOTP
 */

import { authenticator } from 'otplib';
import QRCode from 'qrcode';
import { MFASetup } from './types';
import { randomString } from '@arcqubit/shared';

/**
 * Generate MFA secret for a user
 */
export function generateMFASecret(): string {
  return authenticator.generateSecret();
}

/**
 * Generate OTP auth URL for QR code
 */
export function generateOTPAuthURL(email: string, secret: string, issuer: string = 'ArcQubit'): string {
  return authenticator.keyuri(email, issuer, secret);
}

/**
 * Generate QR code as data URL
 */
export async function generateQRCode(otpAuthURL: string): Promise<string> {
  return QRCode.toDataURL(otpAuthURL);
}

/**
 * Set up MFA for a user
 */
export async function setupMFA(email: string): Promise<MFASetup> {
  const secret = generateMFASecret();
  const otpAuthURL = generateOTPAuthURL(email, secret);
  const qrCodeUrl = await generateQRCode(otpAuthURL);
  const backupCodes = generateBackupCodes();

  return {
    secret,
    qrCodeUrl,
    backupCodes,
  };
}

/**
 * Verify TOTP token
 */
export function verifyTOTP(token: string, secret: string): boolean {
  try {
    return authenticator.verify({ token, secret });
  } catch {
    return false;
  }
}

/**
 * Generate backup codes for MFA
 */
export function generateBackupCodes(count: number = 10): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    codes.push(randomString(8).toUpperCase());
  }
  return codes;
}

/**
 * Verify backup code
 * Note: In production, backup codes should be hashed and stored in database
 */
export function verifyBackupCode(code: string, validCodes: string[]): boolean {
  return validCodes.includes(code.toUpperCase());
}

/**
 * Get current TOTP token (for testing)
 */
export function getCurrentToken(secret: string): string {
  return authenticator.generate(secret);
}
