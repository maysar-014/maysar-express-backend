import { randomBytes } from 'crypto';
import { logger } from '../infrastructure/services/logger.service';

/**
 * Authentication Middleware Configuration
 * Configuration for authentication middleware features including
 * JWT validation, token blacklisting, device tracking, and brute force protection
 */

export interface AuthMiddlewareConfigInterface {
  // JWT Configuration
  jwt: {
    secret: string;
    algorithm: 'HS256' | 'HS384' | 'HS512' | 'RS256' | 'ES256';
    expirationTime: number;
    refreshExpirationTime: number;
  };

  // Token Blacklisting Configuration
  tokenBlacklisting: {
    enabled: boolean;
    storageType: 'memory' | 'redis' | 'database';
    cleanupInterval: number;
    maxBlacklistedTokens: number;
  };

  // API Key Configuration
  apiKey: {
    enabled: boolean;
    secret: string;
    expirationTime: number;
    maxKeysPerService: number;
    allowedServices: string[];
  };

  // Brute Force Protection Configuration
  bruteForce: {
    enabled: boolean;
    maxAttempts: number;
    lockoutTime: number;
    windowTime: number;
    resetOnSuccess: boolean;
    storageType: 'memory' | 'redis' | 'database';
  };

  // Device Tracking Configuration
  deviceTracking: {
    enabled: boolean;
    maxDevicesPerUser: number;
    deviceFingerprintSalt: string;
    suspiciousActivityThreshold: number;
    geoLocationEnabled: boolean;
    cleanupInterval: number;
  };

  // Session Management Configuration
  session: {
    enabled: boolean;
    expirationTime: number;
    extendOnActivity: boolean;
    maxConcurrentSessions: number;
    storageType: 'memory' | 'redis' | 'database';
  };

  // Rate Limiting Configuration
  rateLimiting: {
    enabled: boolean;
    windowMs: number;
    maxRequests: number;
    skipSuccessfulRequests: boolean;
    skipFailedRequests: boolean;
  };

  // Security Configuration
  security: {
    enableCircuitBreaker: boolean;
    circuitBreakerThreshold: number;
    circuitBreakerTimeout: number;
    enableAuditLogging: boolean;
    auditLogRetentionDays: number;
    enableMetrics: boolean;
  };
}

/**
 * Default Authentication Middleware Configuration
 */
const resolveSecret = (envName: string): string => {
  const value = process.env[envName]?.trim();
  if (value) {
    return value;
  }

  return randomBytes(32).toString('hex');
};

const resolveEnabled = (envName: string, fallback: boolean): boolean => {
  const raw = process.env[envName];
  if (raw === undefined) {
    return fallback;
  }

  return ['true', '1', 'yes', 'y'].includes(raw.toLowerCase());
};

export const DEFAULT_AUTH_MIDDLEWARE_CONFIG: AuthMiddlewareConfigInterface = {
  // JWT Configuration
  jwt: {
    secret: resolveSecret('JWT_SECRET'),
    algorithm: 'HS256',
    expirationTime: 15 * 60 * 1000, // 15 minutes
    refreshExpirationTime: 7 * 24 * 60 * 60 * 1000 // 7 days
  },

  // Token Blacklisting Configuration
  tokenBlacklisting: {
    enabled: resolveEnabled('ENABLE_TOKEN_BLACKLISTING', true),
    storageType: (process.env.TOKEN_BLACKLIST_STORAGE as any) || 'memory',
    cleanupInterval: parseInt(process.env.TOKEN_BLACKLIST_CLEANUP_INTERVAL || '3600000'), // 1 hour
    maxBlacklistedTokens: parseInt(process.env.MAX_BLACKLISTED_TOKENS || '10000')
  },

  // API Key Configuration
  apiKey: {
    enabled: process.env.ENABLE_API_KEYS === 'true',
    secret: resolveSecret('API_KEY_SECRET'),
    expirationTime: parseInt(process.env.API_KEY_EXPIRATION || '2592000000'), // 30 days
    maxKeysPerService: parseInt(process.env.MAX_API_KEYS_PER_SERVICE || '10'),
    allowedServices: process.env.ALLOWED_SERVICES?.split(',') || []
  },

  // Brute Force Protection Configuration
  bruteForce: {
    enabled: resolveEnabled('ENABLE_BRUTE_FORCE_PROTECTION', true),
    maxAttempts: parseInt(process.env.BRUTE_FORCE_MAX_ATTEMPTS || '5'),
    lockoutTime: parseInt(process.env.BRUTE_FORCE_LOCKOUT_TIME || '900000'), // 15 minutes
    windowTime: parseInt(process.env.BRUTE_FORCE_WINDOW_TIME || '900000'), // 15 minutes
    resetOnSuccess: process.env.BRUTE_FORCE_RESET_ON_SUCCESS !== 'false',
    storageType: (process.env.BRUTE_FORCE_STORAGE as any) || 'memory'
  },

  // Device Tracking Configuration
  deviceTracking: {
    enabled: resolveEnabled('ENABLE_DEVICE_TRACKING', true),
    maxDevicesPerUser: parseInt(process.env.MAX_DEVICES_PER_USER || '5'),
    deviceFingerprintSalt: resolveSecret('DEVICE_FINGERPRINT_SALT'),
    suspiciousActivityThreshold: parseInt(process.env.SUSPICIOUS_ACTIVITY_THRESHOLD || '3'),
    geoLocationEnabled: process.env.ENABLE_GEOLOCATION === 'true',
    cleanupInterval: parseInt(process.env.DEVICE_TRACKING_CLEANUP_INTERVAL || '86400000') // 24 hours
  },

  // Session Management Configuration
  session: {
    enabled: resolveEnabled('ENABLE_SESSION_MANAGEMENT', true),
    expirationTime: parseInt(process.env.SESSION_EXPIRATION_TIME || '28800000'), // 8 hours
    extendOnActivity: process.env.SESSION_EXTEND_ON_ACTIVITY !== 'false',
    maxConcurrentSessions: parseInt(process.env.MAX_CONCURRENT_SESSIONS || '3'),
    storageType: (process.env.SESSION_STORAGE as any) || 'memory'
  },

  // Rate Limiting Configuration
  rateLimiting: {
    enabled: resolveEnabled('ENABLE_RATE_LIMITING', true),
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000'), // 1 minute
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
    skipSuccessfulRequests: process.env.RATE_LIMIT_SKIP_SUCCESSFUL !== 'false',
    skipFailedRequests: process.env.RATE_LIMIT_SKIP_FAILED !== 'false'
  },

  // Security Configuration
  security: {
    enableCircuitBreaker: process.env.ENABLE_CIRCUIT_BREAKER === 'true',
    circuitBreakerThreshold: parseInt(process.env.CIRCUIT_BREAKER_THRESHOLD || '5'),
    circuitBreakerTimeout: parseInt(process.env.CIRCUIT_BREAKER_TIMEOUT || '60000'), // 1 minute
    enableAuditLogging: process.env.ENABLE_AUDIT_LOGGING !== 'false',
    auditLogRetentionDays: parseInt(process.env.AUDIT_LOG_RETENTION_DAYS || '90'),
    enableMetrics: process.env.ENABLE_METRICS !== 'false'
  }
};

/**
 * Authentication Middleware Configuration Class
 */
export class AuthMiddlewareConfig {
  private config: AuthMiddlewareConfigInterface;

  constructor(customConfig?: Partial<AuthMiddlewareConfigInterface>) {
    this.config = { ...DEFAULT_AUTH_MIDDLEWARE_CONFIG, ...customConfig };
    this.validateConfig();
  }

  /**
   * Get complete configuration
   */
  getConfig(): AuthMiddlewareConfigInterface {
    return { ...this.config };
  }

  /**
   * Get JWT configuration
   */
  getJwtConfig() {
    return { ...this.config.jwt };
  }

  /**
   * Get token blacklisting configuration
   */
  getTokenBlacklistingConfig() {
    return { ...this.config.tokenBlacklisting };
  }

  /**
   * Get API key configuration
   */
  getApiKeyConfig() {
    return { ...this.config.apiKey };
  }

  /**
   * Get brute force protection configuration
   */
  getBruteForceConfig() {
    return { ...this.config.bruteForce };
  }

  /**
   * Get device tracking configuration
   */
  getDeviceTrackingConfig() {
    return { ...this.config.deviceTracking };
  }

  /**
   * Get session management configuration
   */
  getSessionConfig() {
    return { ...this.config.session };
  }

  /**
   * Get rate limiting configuration
   */
  getRateLimitingConfig() {
    return { ...this.config.rateLimiting };
  }

  /**
   * Get security configuration
   */
  getSecurityConfig() {
    return { ...this.config.security };
  }

  /**
   * Validate configuration values
   */
  private validateConfig(): void {
    const errors: string[] = [];

    // Validate JWT configuration
    if (!this.config.jwt.secret || this.config.jwt.secret === 'default-secret-change-in-production') {
      errors.push('JWT secret should be changed from default value');
    }

    if (this.config.jwt.expirationTime <= 0) {
      errors.push('JWT expiration time must be positive');
    }

    // Validate token blacklisting configuration
    if (this.config.tokenBlacklisting.enabled) {
      if (!['memory', 'redis', 'database'].includes(this.config.tokenBlacklisting.storageType)) {
        errors.push('Invalid token blacklisting storage type');
      }
    }

    // Validate API key configuration
    if (this.config.apiKey.enabled) {
      if (!this.config.apiKey.secret || this.config.apiKey.secret === 'api-key-secret-change-in-production') {
        errors.push('API key secret should be changed from default value');
      }
    }

    if (this.config.deviceTracking.deviceFingerprintSalt === 'device-fingerprint-salt') {
      errors.push('Device fingerprint salt should be changed from default value');
    }

    // Validate brute force protection configuration
    if (this.config.bruteForce.enabled) {
      if (this.config.bruteForce.maxAttempts <= 0) {
        errors.push('Brute force max attempts must be positive');
      }
      if (this.config.bruteForce.lockoutTime <= 0) {
        errors.push('Brute force lockout time must be positive');
      }
    }

    // Validate device tracking configuration
    if (this.config.deviceTracking.enabled) {
      if (this.config.deviceTracking.maxDevicesPerUser <= 0) {
        errors.push('Max devices per user must be positive');
      }
    }

    // Validate session management configuration
    if (this.config.session.enabled) {
      if (this.config.session.expirationTime <= 0) {
        errors.push('Session expiration time must be positive');
      }
      if (this.config.session.maxConcurrentSessions <= 0) {
        errors.push('Max concurrent sessions must be positive');
      }
    }

    // Validate rate limiting configuration
    if (this.config.rateLimiting.enabled) {
      if (this.config.rateLimiting.windowMs <= 0) {
        errors.push('Rate limiting window must be positive');
      }
      if (this.config.rateLimiting.maxRequests <= 0) {
        errors.push('Rate limiting max requests must be positive');
      }
    }

    // Log validation errors
    if (errors.length > 0) {
      logger.warn('Configuration validation warnings', { errors });
    }
  }

  /**
   * Get configuration for logging (sensitive data redacted)
   */
  getConfigForLogging(): Partial<AuthMiddlewareConfigInterface> {
    const config = { ...this.config };

    // Redact sensitive information
    config.jwt.secret = '***REDACTED***';
    config.apiKey.secret = '***REDACTED***';
    config.deviceTracking.deviceFingerprintSalt = '***REDACTED***';

    return config;
  }
}
