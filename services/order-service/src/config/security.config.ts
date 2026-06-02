import { appConfig } from './index';

/**
 * Security Configuration Module
 * Handles all security-related configurations and settings
 */

export interface CorsConfig {
  enabled: boolean;
  origins: string[];
  credentials: boolean;
  methods: string[];
  allowedHeaders: string[];
  exposedHeaders: string[];
  maxAge: number;
}

export interface RateLimitConfig {
  enabled: boolean;
  general: {
    windowMs: number;
    maxRequests: number;
  };
  auth: {
    windowMs: number;
    maxAttempts: number;
  };
  payment: {
    windowMs: number;
    maxAttempts: number;
  };
  create: {
    windowMs: number;
    maxRequests: number;
  };
  admin: {
    windowMs: number;
    maxRequests: number;
  };
}

export interface HelmetConfig {
  enabled: boolean;
  contentSecurityPolicy: {
    enabled: boolean;
    directives: {
      defaultSrc: string[];
      styleSrc: string[];
      fontSrc: string[];
      scriptSrc: string[];
      imgSrc: string[];
      connectSrc: string[];
      frameSrc: string[];
      objectSrc: string[];
      upgradeInsecureRequests: any[];
    };
  };
  hsts: {
    enabled: boolean;
    maxAge: number;
    includeSubDomains: boolean;
    preload: boolean;
  };
  hidePoweredBy: boolean;
  noSniff: boolean;
  xssFilter: boolean;
  referrerPolicy: {
    enabled: boolean;
    policy: string;
  };
}

export interface InputValidationConfig {
  enabled: boolean;
  sanitize: boolean;
  strict: boolean;
  customValidators: {
    password: {
      minLength: number;
      requireUppercase: boolean;
      requireLowercase: boolean;
      requireNumbers: boolean;
      requireSpecialChars: boolean;
    };
    email: {
      allowSubdomains: boolean;
      allowPlusSign: boolean;
    };
  };
}

export interface JWTConfig {
  enabled: boolean;
  secret: string;
  expiresIn: string;
  issuer?: string;
  audience?: string;
}

export interface APIKeyConfig {
  enabled: boolean;
  headerName: string;
  keys: string[];
}

// Load CORS configuration
function loadCorsConfig(): CorsConfig {
  return {
    enabled: appConfig.security.cors.enabled,
    origins: appConfig.security.cors.origins,
    credentials: appConfig.security.cors.credentials,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'Accept',
      'Origin',
      'Access-Control-Request-Method',
      'Access-Control-Request-Headers',
      'X-API-Key',
      'X-Request-ID'
    ],
    exposedHeaders: [
      'X-Total-Count',
      'X-Rate-Limit-Remaining',
      'X-Rate-Limit-Reset'
    ],
    maxAge: appConfig.security.cors.maxAge,
  };
}

// Load rate limiting configuration
function loadRateLimitConfig(): RateLimitConfig {
  return {
    enabled: appConfig.security.rateLimiting.enabled,
    general: {
      windowMs: appConfig.security.rateLimiting.windowMs,
      maxRequests: appConfig.security.rateLimiting.maxRequests,
    },
    auth: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxAttempts: appConfig.security.rateLimiting.authMaxAttempts,
    },
    payment: {
      windowMs: 10 * 60 * 1000, // 10 minutes
      maxAttempts: appConfig.security.rateLimiting.paymentMaxAttempts,
    },
    create: {
      windowMs: 60 * 60 * 1000, // 1 hour
      maxRequests: 50,
    },
    admin: {
      windowMs: 60 * 60 * 1000, // 1 hour
      maxRequests: 100,
    },
  };
}

// Load Helmet configuration
function loadHelmetConfig(): HelmetConfig {
  return {
    enabled: appConfig.security.helmet.enabled,
    contentSecurityPolicy: {
      enabled: appConfig.security.helmet.contentSecurityPolicy,
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", "https://api.paymentGateway.com"],
        frameSrc: ["'none'"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: [],
      },
    },
    hsts: {
      enabled: true,
      maxAge: appConfig.security.helmet.hsts.maxAge,
      includeSubDomains: appConfig.security.helmet.hsts.includeSubDomains,
      preload: appConfig.security.helmet.hsts.preload,
    },
    hidePoweredBy: true,
    noSniff: true,
    xssFilter: true,
    referrerPolicy: {
      enabled: true,
      policy: 'strict-origin-when-cross-origin',
    },
  };
}

// Load input validation configuration
function loadInputValidationConfig(): InputValidationConfig {
  return {
    enabled: true,
    sanitize: true,
    strict: true,
    customValidators: {
      password: {
        minLength: 8,
        requireUppercase: true,
        requireLowercase: true,
        requireNumbers: true,
        requireSpecialChars: true,
      },
      email: {
        allowSubdomains: true,
        allowPlusSign: true,
      },
    },
  };
}

// Load JWT configuration
function loadJWTConfig(): JWTConfig | undefined {
  if (!appConfig.security.jwt) return undefined;

  return {
    enabled: true,
    secret: appConfig.security.jwt.secret,
    expiresIn: appConfig.security.jwt.expiresIn,
    issuer: 'maysar-order-service',
    audience: 'maysar-api',
  };
}

// Load API key configuration
function loadAPIKeyConfig(): APIKeyConfig {
  const apiKeys = appConfig.env.API_KEY ? [appConfig.env.API_KEY] : [];

  return {
    enabled: apiKeys.length > 0,
    headerName: 'X-API-Key',
    keys: apiKeys,
  };
}

// Export configuration instances
export const corsConfig = loadCorsConfig();
export const rateLimitConfig = loadRateLimitConfig();
export const helmetConfig = loadHelmetConfig();
export const inputValidationConfig = loadInputValidationConfig();
export const jwtConfig = loadJWTConfig();
export const apiKeyConfig = loadAPIKeyConfig();

// Security utilities
export function isSecureOrigin(origin: string): boolean {
  return corsConfig.origins.includes(origin);
}

export function isValidAPIKey(key: string): boolean {
  return apiKeyConfig.keys.includes(key);
}

export function getSecurityHeaders(): Record<string, string> {
  const headers: Record<string, string> = {};

  if (helmetConfig.enabled) {
    headers['X-Content-Type-Options'] = 'nosniff';
    headers['X-Frame-Options'] = 'DENY';
    headers['X-XSS-Protection'] = '1; mode=block';
    headers['Referrer-Policy'] = helmetConfig.referrerPolicy.policy;
    headers['Permissions-Policy'] = 'camera=(), microphone=(), geolocation=(), payment=(self)';
  }

  headers['X-API-Version'] = 'v1';

  return headers;
}

// Log security configuration summary
export function logSecurityConfigSummary(): void {
  console.log('🔒 Security Configuration:');
  console.log(`  CORS: ${corsConfig.enabled ? 'Enabled' : 'Disabled'} (${corsConfig.origins.length} origins)`);
  console.log(`  Rate Limiting: ${rateLimitConfig.enabled ? 'Enabled' : 'Disabled'}`);
  console.log(`  Helmet: ${helmetConfig.enabled ? 'Enabled' : 'Disabled'}`);
  console.log(`  JWT: ${jwtConfig?.enabled ? 'Enabled' : 'Disabled'}`);
  console.log(`  API Keys: ${apiKeyConfig.enabled ? 'Enabled' : 'Disabled'}`);
  console.log(`  Input Validation: ${inputValidationConfig.enabled ? 'Enabled' : 'Disabled'}`);
}

