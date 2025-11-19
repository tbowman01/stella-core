/**
 * Authentication types
 */

import { UserRole } from '@arcqubit/shared';

export interface JWTPayload {
  userId: string;
  tenantId: string;
  email: string;
  role: UserRole;
  sessionId: string;
  iat?: number;
  exp?: number;
}

export interface AuthSession {
  id: string;
  userId: string;
  tenantId: string;
  token: string;
  refreshToken: string;
  expiresAt: Date;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

export interface LoginCredentials {
  email: string;
  password: string;
  tenantSlug?: string;
  mfaCode?: string;
}

export interface SSOConfig {
  provider: 'okta' | 'azure_ad' | 'google' | 'github' | 'custom';
  domain?: string;
  clientId: string;
  clientSecret: string;
  issuer?: string;
  authorizationURL?: string;
  tokenURL?: string;
  userInfoURL?: string;
}

export interface MFASetup {
  secret: string;
  qrCodeUrl: string;
  backupCodes: string[];
}

export interface Permission {
  resource: string;
  action: 'create' | 'read' | 'update' | 'delete' | 'execute';
}

export interface AuthContext {
  userId: string;
  tenantId: string;
  role: UserRole;
  permissions: Permission[];
  sessionId: string;
}

export interface PasswordPolicy {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSymbols: boolean;
  maxAge?: number; // days
  preventReuse?: number; // number of previous passwords
}

export const DEFAULT_PASSWORD_POLICY: PasswordPolicy = {
  minLength: 12,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSymbols: true,
  maxAge: 90,
  preventReuse: 5,
};
