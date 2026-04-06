import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Google OAuth Configuration
 * Professional configuration for Google OAuth 2.0 integration
 * Includes validation, security measures, and production-ready settings
 */

export interface GoogleOAuthConfig {
  clientId: string;
  clientSecret: string;
  callbackUrl: string;
  scopes: string[];
  prompt: 'consent' | 'none' | 'select_account';
  accessType: 'online' | 'offline';
  responseType: 'code';
  state: boolean;
  verificationEmail: boolean;
  allowedDomains: string[];
  sessionTimeout: number;
  maxRetries: number;
  retryDelay: number;
}

// Environment validation for Google OAuth
const requiredGoogleOAuthEnvVars = [
  'GOOGLE_OAUTH_CLIENT_ID',
  'GOOGLE_OAUTH_CLIENT_SECRET'
];

const missingGoogleOAuthEnvVars = requiredGoogleOAuthEnvVars.filter(envVar => !process.env[envVar]);

if (missingGoogleOAuthEnvVars.length > 0) {
  console.warn(`⚠️  Google OAuth configuration warning: Missing environment variables: ${missingGoogleOAuthEnvVars.join(', ')}`);
}

const GOOGLE_OAUTH_CALLBACK_PATH = '/api/auth/oauth/callback';
const GOOGLE_OAUTH_CALLBACK_PATHS = new Set([
  '/api/auth/oauth/callback',
  '/api/v1/auth/oauth/callback'
]);
const LOCALHOST_HOSTNAMES = new Set(['localhost', '127.0.0.1']);

const normalizeBaseUrl = (candidate: string | undefined, fallback: string): string => {
  const value = (candidate || '').trim();
  if (!value) {
    return fallback;
  }

  try {
    const parsed = new URL(value);
    return parsed.toString().replace(/\/$/, '');
  } catch {
    return fallback;
  }
};

const resolveOAuthBaseUrl = (): string => {
  const environment = process.env.NODE_ENV;
  const fallbackBaseUrl =
    environment === 'staging'
      ? 'https://api-staging.maysar.co.tz'
      : environment === 'production'
        ? 'https://api.maysar.co.tz'
        : 'http://localhost:3001';

  return normalizeBaseUrl(process.env.BASE_URL || process.env.PLATFORM_BASE_URL, fallbackBaseUrl);
};

const buildDefaultCallbackUrl = (): string => new URL(GOOGLE_OAUTH_CALLBACK_PATH, resolveOAuthBaseUrl()).toString();

const parseUrl = (value: string): URL | null => {
  try {
    return new URL(value);
  } catch {
    return null;
  }
};

export const googleOAuthConfig: GoogleOAuthConfig = {
  // Required configuration
  clientId: process.env.GOOGLE_OAUTH_CLIENT_ID || '',
  clientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET || '',
  callbackUrl: process.env.GOOGLE_OAUTH_CALLBACK_URL || buildDefaultCallbackUrl(),
  
  // OAuth 2.0 scopes - minimal required scopes for user authentication
  scopes: [
    'openid',           // Required for OpenID Connect
    'profile',          // Access to basic profile information
    'email'             // Access to email address
  ],
  
  // Authentication behavior
  prompt: process.env.GOOGLE_OAUTH_PROMPT as 'consent' | 'none' | 'select_account' || 'consent',
  accessType: process.env.GOOGLE_OAUTH_ACCESS_TYPE as 'online' | 'offline' || 'offline', // 'offline' for refresh tokens
  responseType: 'code', // Authorization code flow
  state: process.env.GOOGLE_OAUTH_ENABLE_STATE === 'true', // CSRF protection
  
  // Email verification requirements
  verificationEmail: process.env.GOOGLE_OAUTH_REQUIRE_VERIFIED_EMAIL !== 'false',
  
  // Security configuration
  allowedDomains: (process.env.GOOGLE_OAUTH_ALLOWED_DOMAINS || '').split(',').filter(Boolean),
  
  // Session and retry configuration
  sessionTimeout: parseInt(process.env.GOOGLE_OAUTH_SESSION_TIMEOUT || '3600000', 10), // 1 hour in milliseconds
  maxRetries: parseInt(process.env.GOOGLE_OAUTH_MAX_RETRIES || '3', 10),
  retryDelay: parseInt(process.env.GOOGLE_OAUTH_RETRY_DELAY || '1000', 10) // 1 second in milliseconds
};

/**
 * Google OAuth Configuration Validation
 * Ensures all required configuration is present and valid
 */
export function validateGoogleOAuthConfig(): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Client ID validation
  if (!googleOAuthConfig.clientId) {
    errors.push('GOOGLE_OAUTH_CLIENT_ID is required');
  } else if (!/^[0-9]+-[a-zA-Z0-9_]+\.apps\.googleusercontent\.com$/.test(googleOAuthConfig.clientId)) {
    errors.push('GOOGLE_OAUTH_CLIENT_ID format is invalid');
  }

  // Client Secret validation
  if (!googleOAuthConfig.clientSecret) {
    errors.push('GOOGLE_OAUTH_CLIENT_SECRET is required');
  } else if (googleOAuthConfig.clientSecret.length < 10) {
    errors.push('GOOGLE_OAUTH_CLIENT_SECRET must be at least 10 characters long');
  }

  // Callback URL validation
  const callbackUrl = parseUrl(googleOAuthConfig.callbackUrl);
  if (!callbackUrl) {
    errors.push('GOOGLE_OAUTH_CALLBACK_URL must be a valid URL');
  } else {
    if (process.env.NODE_ENV === 'staging' && LOCALHOST_HOSTNAMES.has(callbackUrl.hostname)) {
      errors.push('GOOGLE_OAUTH_CALLBACK_URL must not use localhost in staging');
    }

    const callbackPath = callbackUrl.pathname.replace(/\/+$/, '') || '/';
    if (process.env.NODE_ENV === 'staging' && !GOOGLE_OAUTH_CALLBACK_PATHS.has(callbackPath)) {
      errors.push('GOOGLE_OAUTH_CALLBACK_URL must point to /api/auth/oauth/callback in staging');
    }

    const configuredBaseUrl = parseUrl(resolveOAuthBaseUrl());
    if (process.env.NODE_ENV === 'staging' && configuredBaseUrl && callbackUrl.origin !== configuredBaseUrl.origin) {
      errors.push('GOOGLE_OAUTH_CALLBACK_URL must share the same origin as BASE_URL in staging');
    }
  }

  // Scopes validation
  if (!googleOAuthConfig.scopes.includes('openid')) {
    errors.push('Scopes must include "openid" for OpenID Connect');
  }
  if (!googleOAuthConfig.scopes.includes('email')) {
    errors.push('Scopes must include "email" to access user email');
  }

  // Prompt validation
  if (!['consent', 'none', 'select_account'].includes(googleOAuthConfig.prompt)) {
    errors.push('GOOGLE_OAUTH_PROMPT must be one of: consent, none, select_account');
  }

  // Access type validation
  if (!['online', 'offline'].includes(googleOAuthConfig.accessType)) {
    errors.push('GOOGLE_OAUTH_ACCESS_TYPE must be one of: online, offline');
  }

  // Domain validation
  if (googleOAuthConfig.allowedDomains.length > 0) {
    const invalidDomains = googleOAuthConfig.allowedDomains.filter(domain => !/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(domain));
    if (invalidDomains.length > 0) {
      errors.push(`Invalid domains in GOOGLE_OAUTH_ALLOWED_DOMAINS: ${invalidDomains.join(', ')}`);
    }
  }

  // Numeric configuration validation
  if (googleOAuthConfig.sessionTimeout < 300000) { // 5 minutes minimum
    errors.push('GOOGLE_OAUTH_SESSION_TIMEOUT must be at least 300000ms (5 minutes)');
  }
  if (googleOAuthConfig.maxRetries < 0 || googleOAuthConfig.maxRetries > 10) {
    errors.push('GOOGLE_OAUTH_MAX_RETRIES must be between 0 and 10');
  }
  if (googleOAuthConfig.retryDelay < 500) { // 500ms minimum
    errors.push('GOOGLE_OAUTH_RETRY_DELAY must be at least 500ms');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Security Configuration for Google OAuth
 * Additional security measures and best practices
 */
export const googleOAuthSecurity = {
  // CSRF Protection
  csrf: {
    enabled: googleOAuthConfig.state,
    secretLength: 32,
    cookieName: 'oauth_state',
    cookieOptions: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      maxAge: 600000 // 10 minutes
    }
  },

  // Session Configuration
  session: {
    name: 'google_oauth_session',
    secret: process.env.SESSION_SECRET || 'default-session-secret-change-in-production',
    maxAge: googleOAuthConfig.sessionTimeout,
    secure: process.env.NODE_ENV === 'production'
  },

  // Rate Limiting
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100, // limit each IP to 100 requests per windowMs
    skipSuccessfulRequests: true
  },

  // Error Handling
  errorHandling: {
    includeDetails: process.env.NODE_ENV === 'development',
    logErrors: true,
    maskSensitiveData: true
  }
};

/**
 * Production Configuration Overrides
 * Override development settings for production environment
 */
if (process.env.NODE_ENV === 'production') {
  // Force HTTPS in production
  if (googleOAuthConfig.callbackUrl.startsWith('http://')) {
    console.warn('⚠️  WARNING: Using HTTP callback URL in production. Consider using HTTPS.');
  }

  // Validate session secret
  if (googleOAuthSecurity.session.secret === 'default-session-secret-change-in-production') {
    console.error('❌ CRITICAL: Default session secret detected in production. This is a security risk!');
  }

  // Enforce stricter security in production
  googleOAuthSecurity.csrf.cookieOptions.secure = true;
  googleOAuthSecurity.session.secure = true;
}

/**
 * Google OAuth URLs and Endpoints
 * Pre-configured Google OAuth endpoints
 */
export const googleOAuthEndpoints = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
  userInfoEndpoint: 'https://www.googleapis.com/oauth2/v2/userinfo',
  revokeEndpoint: 'https://oauth2.googleapis.com/revoke',
  jwksEndpoint: 'https://www.googleapis.com/oauth2/v3/certs'
};

/**
 * Initialize Google OAuth Configuration
 * Called at application startup to validate Google OAuth configuration
 */
export function initializeGoogleOAuthConfig(): void {
  const validation = validateGoogleOAuthConfig();

  if (!validation.isValid) {
    console.error('❌ Google OAuth configuration validation failed:');
    validation.errors.forEach(error => console.error(`   - ${error}`));
    process.exit(1);
  }

  console.log('✅ Google OAuth configuration validation passed');

  // Log configuration summary in development
  if (process.env.NODE_ENV === 'development') {
    console.log('🔧 Google OAuth Configuration Summary:');
    console.log(`   Client ID: ${googleOAuthConfig.clientId ? 'configured' : 'missing'}`);
    console.log(`   Callback URL: ${googleOAuthConfig.callbackUrl}`);
    console.log(`   Scopes: ${googleOAuthConfig.scopes.join(', ')}`);
    console.log(`   Access Type: ${googleOAuthConfig.accessType}`);
    console.log(`   Prompt: ${googleOAuthConfig.prompt}`);
    console.log(`   Allowed Domains: ${googleOAuthConfig.allowedDomains.length > 0 ? googleOAuthConfig.allowedDomains.join(', ') : 'all domains'}`);
    console.log(`   CSRF Protection: ${googleOAuthConfig.state ? 'enabled' : 'disabled'}`);
  }
}
