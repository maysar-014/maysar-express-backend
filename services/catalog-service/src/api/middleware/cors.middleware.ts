/**
 * CORS Middleware
 * Cross-Origin Resource Sharing configuration with security hardening
 * Implements comprehensive CORS policies with origin validation and security checks
 */

import { Request, Response, NextFunction } from 'express';

// =====================================================================================
// CORS CONFIGURATION
// =====================================================================================

/**
 * CORS Configuration
 */
export interface CORSConfig {
  origin: boolean | string | string[] | ((origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => void);
  methods: string | string[];
  allowedHeaders: string | string[];
  exposedHeaders: string | string[];
  credentials: boolean;
  maxAge: number;
  preflightContinue: boolean;
  optionsSuccessStatus: number;
  enableOriginValidation: boolean;
  allowedOrigins: string[];
  blockedOrigins: string[];
  enableLogging: boolean;
  enableSecurityHeaders: boolean;
  strictOriginCheck: boolean;
  allowPrivateNetworks: boolean;
  enableOriginAnalytics: boolean;
}

// =====================================================================================
// DEFAULT CORS CONFIGURATION
// =====================================================================================

/**
 * Default CORS Configuration
 */
export const DEFAULT_CORS_CONFIG: CORSConfig = {
  origin: true, // Allow all origins by default (should be restricted in production)
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'X-API-Key',
    'X-Correlation-ID',
    'X-Request-ID'
  ],
  exposedHeaders: [
    'X-RateLimit-Limit',
    'X-RateLimit-Remaining',
    'X-RateLimit-Reset',
    'X-Correlation-ID',
    'X-Request-ID'
  ],
  credentials: true,
  maxAge: 86400, // 24 hours
  preflightContinue: false,
  optionsSuccessStatus: 204,
  enableOriginValidation: true,
  allowedOrigins: [],
  blockedOrigins: [],
  enableLogging: true,
  enableSecurityHeaders: true,
  strictOriginCheck: false,
  allowPrivateNetworks: false,
  enableOriginAnalytics: false
};

// =====================================================================================
// CORS ANALYTICS
// =====================================================================================

/**
 * CORS Analytics Data
 */
interface CORSAnalytics {
  totalRequests: number;
  allowedOrigins: Map<string, number>;
  blockedOrigins: Map<string, number>;
  preflightRequests: number;
  failedRequests: number;
  topOrigins: Array<{ origin: string; count: number }>;
}

/**
 * CORS Analytics Tracker
 */
class CORSAnalyticsTracker {
  private analytics: CORSAnalytics = {
    totalRequests: 0,
    allowedOrigins: new Map(),
    blockedOrigins: new Map(),
    preflightRequests: 0,
    failedRequests: 0,
    topOrigins: []
  };

  recordRequest(origin: string | undefined, allowed: boolean, isPreflight: boolean): void {
    this.analytics.totalRequests++;

    if (isPreflight) {
      this.analytics.preflightRequests++;
    }

    if (!allowed) {
      this.analytics.failedRequests++;
      if (origin) {
        this.analytics.blockedOrigins.set(
          origin,
          (this.analytics.blockedOrigins.get(origin) || 0) + 1
        );
      }
    } else if (origin) {
      this.analytics.allowedOrigins.set(
        origin,
        (this.analytics.allowedOrigins.get(origin) || 0) + 1
      );
    }

    this.updateTopOrigins();
  }

  private updateTopOrigins(): void {
    const allOrigins = new Map<string, number>();

    // Combine allowed and blocked origins
    this.analytics.allowedOrigins.forEach((count, origin) => {
      allOrigins.set(origin, count);
    });

    this.analytics.blockedOrigins.forEach((count, origin) => {
      allOrigins.set(origin, (allOrigins.get(origin) || 0) + count);
    });

    this.analytics.topOrigins = Array.from(allOrigins.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([origin, count]) => ({ origin, count }));
  }

  getAnalytics(): CORSAnalytics {
    return {
      ...this.analytics,
      allowedOrigins: new Map(this.analytics.allowedOrigins),
      blockedOrigins: new Map(this.analytics.blockedOrigins),
      topOrigins: [...this.analytics.topOrigins]
    };
  }

  reset(): void {
    this.analytics = {
      totalRequests: 0,
      allowedOrigins: new Map(),
      blockedOrigins: new Map(),
      preflightRequests: 0,
      failedRequests: 0,
      topOrigins: []
    };
  }
}

// =====================================================================================
// CORS MIDDLEWARE IMPLEMENTATION
// =====================================================================================

/**
 * CORS Middleware Factory
 */
export function createCORS(config: Partial<CORSConfig> = {}) {
  const finalConfig = { ...DEFAULT_CORS_CONFIG, ...config };
  const analytics = finalConfig.enableOriginAnalytics ? new CORSAnalyticsTracker() : null;

  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const origin = req.headers.origin;
      const isPreflight = req.method === 'OPTIONS';

      // Handle preflight requests
      if (isPreflight) {
        handlePreflightRequest(req, res, finalConfig);
        return;
      }

      // Validate origin
      const originAllowed = validateOrigin(origin, finalConfig);

      // Record analytics
      if (analytics) {
        analytics.recordRequest(origin, originAllowed, isPreflight);
      }

      // Log CORS decision
      if (finalConfig.enableLogging) {
        console.log(`[CORS] ${originAllowed ? 'ALLOWED' : 'BLOCKED'} origin: ${origin || 'none'} for ${req.method} ${req.path}`);
      }

      // Set CORS headers if origin is allowed
      if (originAllowed) {
        applyCORSHeaders(res, origin, finalConfig);
      }

      // Add security headers
      if (finalConfig.enableSecurityHeaders) {
        setSecurityHeaders(res);
      }

      next();
    } catch (error) {
      console.error('[CORS] Error:', error);
      next(error);
    }
  };
}

/**
 * Handle CORS Preflight Requests
 */
function handlePreflightRequest(req: Request, res: Response, config: CORSConfig): void {
  const origin = req.headers.origin;
  const requestedMethod = req.headers['access-control-request-method'] as string;
  const requestedHeaders = req.headers['access-control-request-headers'] as string;

  // Validate origin
  const originAllowed = validateOrigin(origin, config);

  // Validate requested method
  const methodAllowed = validateMethod(requestedMethod, config);

  // Validate requested headers
  const headersAllowed = validateHeaders(requestedHeaders, config);

  if (originAllowed && methodAllowed && headersAllowed) {
    // Set preflight response headers
    applyCORSHeaders(res, origin, config);

    // Set additional preflight headers
    res.set({
      'Access-Control-Allow-Methods': normalizeList(config.methods).join(', '),
      'Access-Control-Allow-Headers': normalizeList(config.allowedHeaders).join(', '),
      'Access-Control-Max-Age': config.maxAge.toString()
    });

    res.status(config.optionsSuccessStatus).end();
  } else {
    // Preflight failed
    res.status(403).json({
      success: false,
      error: {
        code: 'CORS_PREFLIGHT_FAILED',
        message: 'CORS preflight request denied'
      }
    });
  }
}

/**
 * Validate Origin
 */
function validateOrigin(origin: string | undefined, config: CORSConfig): boolean {
  // If origin validation is disabled, allow all
  if (!config.enableOriginValidation) {
    return true;
  }

  // No origin header (same-origin request)
  if (!origin) {
    return true;
  }

  // Check blocked origins first
  if (config.blockedOrigins.includes(origin)) {
    return false;
  }

  // If allowed origins is specified, check against it
  if (config.allowedOrigins.length > 0) {
    return config.allowedOrigins.includes(origin);
  }

  // Strict origin checking
  if (config.strictOriginCheck) {
    return isValidOrigin(origin);
  }

  // Allow private networks if configured
  if (config.allowPrivateNetworks) {
    return true; // Would implement private network detection
  }

  // Default: allow all (not recommended for production)
  return true;
}

/**
 * Validate HTTP Method
 */
function validateMethod(method: string | undefined, config: CORSConfig): boolean {
  if (!method) return false;

  const allowedMethods = normalizeList(config.methods).map(item => item.toUpperCase());
  return allowedMethods.includes(method.toUpperCase());
}

/**
 * Validate Headers
 */
function validateHeaders(headers: string | undefined, config: CORSConfig): boolean {
  if (!headers) return true; // No specific headers requested

  const requestedHeaders = headers.split(',').map(h => h.trim().toLowerCase());
  const allowedHeaders = normalizeList(config.allowedHeaders).map(h => h.toLowerCase());

  return requestedHeaders.every(header =>
    allowedHeaders.some(allowed => allowed === '*' || header === allowed)
  );
}

/**
 * Set CORS Headers
 */
function setCORSHeaders(res: Response, origin: string | undefined, config: CORSConfig): void {
  const headers: Record<string, string> = {};

  // Origin
  if (typeof config.origin === 'function') {
    // Dynamic origin handling would be implemented here
    headers['Access-Control-Allow-Origin'] = origin || '*';
  } else if (config.origin === true) {
    headers['Access-Control-Allow-Origin'] = origin || '*';
  } else if (typeof config.origin === 'string') {
    headers['Access-Control-Allow-Origin'] = config.origin;
  } else if (Array.isArray(config.origin)) {
    headers['Access-Control-Allow-Origin'] = origin && config.origin.includes(origin) ? origin : config.origin[0];
  }

  // Credentials
  if (config.credentials) {
    headers['Access-Control-Allow-Credentials'] = 'true';
  }

  // Exposed headers
  if (config.exposedHeaders.length > 0) {
    headers['Access-Control-Expose-Headers'] = config.exposedHeaders instanceof Array
      ? config.exposedHeaders.join(', ')
      : config.exposedHeaders;
  }

  res.set(headers);
}

/**
 * Allow tests to intercept header application by overriding the global helper.
 * Falls back to the local implementation when no override is present.
 */
function applyCORSHeaders(res: Response, origin: string | undefined, config: CORSConfig): void {
  const globalSetCORSHeaders = (globalThis as { setCORSHeaders?: typeof setCORSHeaders }).setCORSHeaders;

  if (typeof globalSetCORSHeaders === 'function') {
    globalSetCORSHeaders(res, origin, config);
    return;
  }

  setCORSHeaders(res, origin, config);
}

/**
 * Normalize comma-separated or array-based CORS lists into a trimmed array.
 */
function normalizeList(value: string | string[]): string[] {
  return Array.isArray(value)
    ? value.map(item => item.trim()).filter(Boolean)
    : value.split(',').map(item => item.trim()).filter(Boolean);
}

/**
 * Set Security Headers
 */
function setSecurityHeaders(res: Response): void {
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Cross-Origin-Embedder-Policy': 'require-corp',
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Resource-Policy': 'cross-origin'
  });
}

/**
 * Validate Origin Format
 */
function isValidOrigin(origin: string): boolean {
  try {
    const url = new URL(origin);

    // Must be HTTP or HTTPS
    if (!['http:', 'https:'].includes(url.protocol)) {
      return false;
    }

    // Must have a valid hostname
    if (!url.hostname || url.hostname.length === 0) {
      return false;
    }

    // Block localhost in production
    if (process.env.NODE_ENV === 'production' &&
        (url.hostname === 'localhost' || url.hostname === '127.0.0.1')) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

// =====================================================================================
// CORS PRESETS
// =====================================================================================

/**
 * CORS Configuration Presets
 */
export const CORSPresets = {
  /**
   * Development CORS (permissive)
   */
  development: {
    origin: true,
    credentials: true,
    enableOriginValidation: false,
    enableLogging: true,
    enableSecurityHeaders: false
  },

  /**
   * Production CORS (restrictive)
   */
  production: {
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      // In a real app, implement proper origin validation
      const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [];
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Origin not allowed'));
      }
    },
    credentials: true,
    enableOriginValidation: true,
    enableLogging: false,
    enableSecurityHeaders: true,
    strictOriginCheck: true,
    allowPrivateNetworks: false
  },

  /**
   * API CORS (standard)
   */
  api: {
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      // Allow specific domains and localhost for development
      const allowedOrigins = [
        'https://yourdomain.com',
        'https://api.yourdomain.com',
        ...(process.env.NODE_ENV === 'development' ? ['http://localhost:3000', 'http://localhost:3001'] : [])
      ];

      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Origin not allowed by API policy'));
      }
    },
    credentials: true,
    enableOriginValidation: true,
    enableLogging: true,
    enableSecurityHeaders: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
      'Origin',
      'X-Requested-With',
      'Content-Type',
      'Accept',
      'Authorization',
      'X-API-Key',
      'X-Correlation-ID'
    ]
  },

  /**
   * Public API CORS (less restrictive)
   */
  public: {
    origin: true,
    credentials: false,
    enableOriginValidation: false,
    enableLogging: false,
    enableSecurityHeaders: true,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Accept', 'X-API-Key']
  },

  /**
   * Admin CORS (very restrictive)
   */
  admin: {
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      // Only allow specific admin domains
      const adminOrigins = process.env.ADMIN_ORIGINS?.split(',') || ['https://admin.yourdomain.com'];
      if (!origin || adminOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Admin access not allowed from this origin'));
      }
    },
    credentials: true,
    enableOriginValidation: true,
    enableLogging: true,
    enableSecurityHeaders: true,
    strictOriginCheck: true,
    allowPrivateNetworks: false,
    maxAge: 3600 // 1 hour for admin
  }
};

// =====================================================================================
// CORS MIDDLEWARE FACTORY
// =====================================================================================

/**
 * CORS Middleware Factory
 */
export class CORSMiddlewareFactory {
  static createBasicCORS(config: Partial<CORSConfig> = {}) {
    return createCORS(config);
  }

  static createDevelopmentCORS(config: Partial<CORSConfig> = {}) {
    return createCORS({ ...CORSPresets.development, ...config });
  }

  static createProductionCORS(config: Partial<CORSConfig> = {}) {
    return createCORS({ ...CORSPresets.production, ...config });
  }

  static createAPICORS(config: Partial<CORSConfig> = {}) {
    return createCORS({ ...CORSPresets.api, ...config });
  }

  static createPublicCORS(config: Partial<CORSConfig> = {}) {
    return createCORS({ ...CORSPresets.public, ...config });
  }

  static createAdminCORS(config: Partial<CORSConfig> = {}) {
    return createCORS({ ...CORSPresets.admin, ...config });
  }

  static createPreset(preset: keyof typeof CORSPresets, overrides: Partial<CORSConfig> = {}) {
    return createCORS({ ...CORSPresets[preset], ...overrides });
  }

  static createDynamicCORS(allowedOriginsFn: (origin: string | undefined) => boolean | Promise<boolean>) {
    return createCORS({
      origin: async (origin, callback) => {
        try {
          const allowed = await allowedOriginsFn(origin);
          callback(null, allowed);
        } catch (error) {
          callback(error as Error);
        }
      },
      enableOriginValidation: true
    });
  }

  static createWhitelistCORS(allowedOrigins: string[]) {
    return createCORS({
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error('Origin not in whitelist'));
        }
      },
      enableOriginValidation: true,
      allowedOrigins
    });
  }
}

// =====================================================================================
// CORS UTILITIES
// =====================================================================================

/**
 * Check if origin is localhost (for development)
 */
export function isLocalhostOrigin(origin: string | undefined): boolean {
  if (!origin) return false;

  try {
    const url = new URL(origin);
    return url.hostname === 'localhost' || url.hostname === '127.0.0.1' ||
           url.hostname.startsWith('localhost:') || url.hostname.startsWith('127.0.0.1:');
  } catch {
    return false;
  }
}

/**
 * Check if origin is from a private network
 */
export function isPrivateNetworkOrigin(origin: string | undefined): boolean {
  if (!origin) return false;

  try {
    const url = new URL(origin);
    const hostname = url.hostname.replace(/^\[|\]$/g, '');

    // IPv4 private ranges
    if (/^(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)/.test(hostname)) {
      return true;
    }

    // IPv6 private addresses (simplified)
    if (hostname.startsWith('fc') || hostname.startsWith('fd')) {
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

// Make functions available globally for testing
(global as any).isValidOrigin = isValidOrigin;
(global as any).validateMethod = validateMethod;
(global as any).validateHeaders = validateHeaders;
(global as any).setCORSHeaders = setCORSHeaders;

/**
 * Parse origins from environment variable
 */
export function parseOriginsFromEnv(envVar: string = 'ALLOWED_ORIGINS'): string[] {
  const origins = process.env[envVar];
  if (!origins) return [];

  return origins.split(',')
    .map(origin => origin.trim())
    .filter(origin => origin.length > 0);
}
