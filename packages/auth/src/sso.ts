/**
 * Single Sign-On (SSO) integration
 * Placeholder for SSO provider integrations (Okta, Azure AD, Google, etc.)
 */

import { SSOConfig } from './types';

/**
 * Okta SSO configuration
 */
export function getOktaConfig(): SSOConfig {
  return {
    provider: 'okta',
    domain: process.env.OKTA_DOMAIN || '',
    clientId: process.env.OKTA_CLIENT_ID || '',
    clientSecret: process.env.OKTA_CLIENT_SECRET || '',
    issuer: process.env.OKTA_ISSUER || '',
  };
}

/**
 * Azure AD SSO configuration
 */
export function getAzureADConfig(): SSOConfig {
  return {
    provider: 'azure_ad',
    clientId: process.env.AZURE_AD_CLIENT_ID || '',
    clientSecret: process.env.AZURE_AD_CLIENT_SECRET || '',
    authorizationURL: `https://login.microsoftonline.com/${process.env.AZURE_AD_TENANT_ID}/oauth2/v2.0/authorize`,
    tokenURL: `https://login.microsoftonline.com/${process.env.AZURE_AD_TENANT_ID}/oauth2/v2.0/token`,
    userInfoURL: 'https://graph.microsoft.com/v1.0/me',
  };
}

/**
 * Google SSO configuration
 */
export function getGoogleConfig(): SSOConfig {
  return {
    provider: 'google',
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    authorizationURL: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenURL: 'https://oauth2.googleapis.com/token',
    userInfoURL: 'https://www.googleapis.com/oauth2/v2/userinfo',
  };
}

/**
 * GitHub SSO configuration
 */
export function getGitHubConfig(): SSOConfig {
  return {
    provider: 'github',
    clientId: process.env.GITHUB_CLIENT_ID || '',
    clientSecret: process.env.GITHUB_CLIENT_SECRET || '',
    authorizationURL: 'https://github.com/login/oauth/authorize',
    tokenURL: 'https://github.com/login/oauth/access_token',
    userInfoURL: 'https://api.github.com/user',
  };
}

/**
 * Get SSO configuration by provider
 */
export function getSSOConfig(provider: SSOConfig['provider']): SSOConfig {
  switch (provider) {
    case 'okta':
      return getOktaConfig();
    case 'azure_ad':
      return getAzureADConfig();
    case 'google':
      return getGoogleConfig();
    case 'github':
      return getGitHubConfig();
    default:
      throw new Error(`Unsupported SSO provider: ${provider}`);
  }
}

/**
 * Validate SSO configuration
 */
export function validateSSOConfig(config: SSOConfig): boolean {
  if (!config.clientId || !config.clientSecret) {
    return false;
  }

  switch (config.provider) {
    case 'okta':
      return !!config.domain && !!config.issuer;
    case 'azure_ad':
    case 'google':
    case 'github':
      return !!config.authorizationURL && !!config.tokenURL;
    default:
      return false;
  }
}

/**
 * Parse SSO user profile
 * Note: This is a simplified version. In production, use proper OAuth2/OIDC libraries
 */
export interface SSOUserProfile {
  id: string;
  email: string;
  name: string;
  provider: string;
}

export function parseSSOUserProfile(
  provider: SSOConfig['provider'],
  data: any
): SSOUserProfile {
  switch (provider) {
    case 'okta':
      return {
        id: data.sub,
        email: data.email,
        name: data.name,
        provider: 'okta',
      };
    case 'azure_ad':
      return {
        id: data.id,
        email: data.mail || data.userPrincipalName,
        name: data.displayName,
        provider: 'azure_ad',
      };
    case 'google':
      return {
        id: data.id,
        email: data.email,
        name: data.name,
        provider: 'google',
      };
    case 'github':
      return {
        id: data.id.toString(),
        email: data.email,
        name: data.name || data.login,
        provider: 'github',
      };
    default:
      throw new Error(`Unsupported provider: ${provider}`);
  }
}
