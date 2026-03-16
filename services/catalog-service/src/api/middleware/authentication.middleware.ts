// @ts-nocheck
/**
 * Authentication Middleware
 * JWT token validation and user authentication with security hardening
 * Implements token verification, user context extraction, and session management
 */

import { Request, Response, NextFunction } from 'express';
import { createHash, timingSafeEqual } from 'crypto';
import jwt from 'jsonwebtoken';

// =====================================================================================
// AUTHENTICATION CONFIGURATION
// =====================================================================================

/**
 * Authentication Configuration
 */
export interface AuthConfig {
  jwtSecret: string;
  jwtAlgorithm: 'HS256' | 'HS384' | 'HS512';
  tokenExpirationTime: number;
  refreshTokenExpirationTime: number;
  enableTokenBlacklisting: boolean;
  maxConcurrentSessions: number;
  enableBruteForceProtection: boolean;
  bruteForceMaxAttempts: number;
  bruteForceLockoutTime: number;
  enableDeviceTracking: boolean;
  enableGeoBlocking: boolean;
  allowedCountries: string[];
  enableSessionLogging: boolean;
}

/**
 * Default Authentication Configuration
 */
export const DEFAULT_AUTH_CONFIG: AuthConfig = {
  jwtSecret: process.env.JWT_SECRET || 'default-secret-change-in-production',
  jwtAlgorithm: 'HS256',
  tokenExpirationTime: 15 * 60 * 1000, // 15 minutes
  refreshTokenExpirationTime: 7 * 24 * 60 * 60 * 1000, // 7 days
  enableTokenBlacklisting: false,
  maxConcurrentSessions: 0,
  enableBruteForceProtection: false,
  bruteForceMaxAttempts: 5,
  bruteForceLockoutTime: 15 * 60 * 1000, // 15 minutes
  enableDeviceTracking: true,
  enableGeoBlocking: false,
  allowedCountries: [],
  enableSessionLogging: true
};

// =====================================================================================
// USER CONTEXT & SESSION TYPES
// =====================================================================================

/**
 * User Authentication Context
 */
export interface UserContext {
  userId: string;
  email: string;
  roles: string[];
  permissions: string[];
  sessionId: string;
  deviceId: string;
  ipAddress: string;
  userAgent: string;
  issuedAt: number;
  expiresAt: number;
  geoLocation?: {
    country: string;
    region: string;
    city: string;
  };
}

/**
 * Authentication Result
 */
export interface AuthResult {
  authenticated: boolean;
  user?: UserContext;
  error?: {
    code: string;
    message: string;
  };
}

/**
 * Session Store Interface
 */
export interface SessionStore {
  get(sessionId: string): Promise<UserContext | null>;
  set(sessionId: string, context: UserContext): Promise<void>;
  delete(sessionId: string): Promise<void>;
  has(sessionId: string): Promise<boolean>;
  cleanup(): Promise<void>;
}

/**
 * Token Blacklist Interface
 */
export interface TokenBlacklist {
  isBlacklisted(token: string): Promise<boolean>;
  blacklist(token: string, expiresAt: number): Promise<void>;
  cleanup(): Promise<void>;
}

// =====================================================================================
// AUTHENTICATION MIDDLEWARE
// =====================================================================================

/**
 * JWT Authentication Middleware
 * Validates JWT tokens and extracts user context
 */
export function authenticate(config: Partial<AuthConfig> = {}) {
  const finalConfig = { ...DEFAULT_AUTH_CONFIG, ...config };

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authHeader = req.headers.authorization;
      const token = extractTokenFromHeader(authHeader);

      if (!token) {
        res.status(401).json({
          success: false,
          error: {
            code: 'MISSING_TOKEN',
            message: 'Authentication token required'
          }
        });
        return;
      }

      // Check if token is blacklisted
      if (finalConfig.enableTokenBlacklisting) {
        const isBlacklisted = await checkTokenBlacklist(token);
        if (isBlacklisted) {
          res.status(401).json({
            success: false,
            error: {
              code: 'TOKEN_BLACKLISTED',
              message: 'Token has been revoked'
            }
          });
          return;
        }
      }

      // Verify and decode token
      const decoded = await verifyJWTToken(token, finalConfig);

      if (!decoded) {
        res.status(401).json({
          success: false,
          error: {
            code: 'INVALID_TOKEN',
            message: 'Invalid or expired authentication token'
          }
        });
        return;
      }

      // Extract user context
      const userContext = await extractUserContext(decoded, req, finalConfig);

      // Validate session
      const sessionValid = await validateUserSession(userContext, finalConfig);
      if (!sessionValid) {
        res.status(401).json({
          success: false,
          error: {
            code: 'SESSION_INVALID',
            message: 'User session is invalid or expired'
          }
        });
        return;
      }

      // Attach user context to request
      (req as any).user = userContext;

      // Log authentication success
      if (finalConfig.enableSessionLogging) {
        console.log(`[AUTH] User authenticated: ${userContext.userId} (${userContext.sessionId})`);
      }

      next();
    } catch (error) {
      console.error('[AUTH] Authentication error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'AUTHENTICATION_ERROR',
          message: 'Authentication failed due to internal error'
        }
      });
      return;
    }
  };
}

/**
 * Optional Authentication Middleware
 * Allows both authenticated and anonymous access
 */
export function optionalAuthenticate(config: Partial<AuthConfig> = {}) {
  const finalConfig = { ...DEFAULT_AUTH_CONFIG, ...config };

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authHeader = req.headers.authorization;
      const token = extractTokenFromHeader(authHeader);

      if (!token) {
        // No token provided, continue as anonymous user
        (req as any).user = null;
        return next();
      }

      // Attempt authentication
      const decoded = await verifyJWTToken(token, finalConfig);

      if (decoded) {
        const userContext = await extractUserContext(decoded, req, finalConfig);
        (req as any).user = userContext;
      } else {
        (req as any).user = null;
      }

      next();
    } catch (error) {
      // On error, continue as anonymous
      (req as any).user = null;
      next();
    }
  };
}

/**
 * API Key Authentication Middleware
 * For service-to-service authentication
 */
export function authenticateApiKey(config: Partial<AuthConfig> = {}) {
  const finalConfig = { ...DEFAULT_AUTH_CONFIG, ...config };

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const apiKey = req.headers['x-api-key'] as string;

      if (!apiKey) {
        res.status(401).json({
          success: false,
          error: {
            code: 'MISSING_API_KEY',
            message: 'API key required for service authentication'
          }
        });
        return;
      }

      // Verify API key
      const isValid = await verifyApiKey(apiKey);
      if (!isValid) {
        res.status(401).json({
          success: false,
          error: {
            code: 'INVALID_API_KEY',
            message: 'Invalid API key'
          }
        });
        return;
      }

      // Attach service context
      (req as any).service = {
        authenticated: true,
        apiKey: hashApiKey(apiKey), // Store hashed version only
        timestamp: Date.now()
      };

      next();
    } catch (error) {
      console.error('[AUTH] API key authentication error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'API_KEY_ERROR',
          message: 'API key authentication failed'
        }
      });
      return;
    }
  };
}

/**
 * Brute Force Protection Middleware
 */
export function bruteForceProtection(config: Partial<AuthConfig> = {}) {
  const finalConfig = { ...DEFAULT_AUTH_CONFIG, ...config };

  if (!finalConfig.enableBruteForceProtection) {
    return (req: Request, res: Response, next: NextFunction) => next();
  }

  return async (req: Request, res: Response, next: NextFunction) => {
    const clientId = req.ip || req.connection.remoteAddress || 'unknown';
    const attempts = await getLoginAttempts(clientId);

    if (attempts >= finalConfig.bruteForceMaxAttempts) {
      const lockoutUntil = await getLockoutTime(clientId);

      if (lockoutUntil && lockoutUntil > Date.now()) {
        const remainingTime = Math.ceil((lockoutUntil - Date.now()) / 1000);
        return res.status(429).json({
          success: false,
          error: {
            code: 'TOO_MANY_ATTEMPTS',
            message: `Too many failed attempts. Try again in ${remainingTime} seconds`
          }
        });
      } else {
        // Reset lockout
        await resetLoginAttempts(clientId);
      }
    }

    next();
  };
}

/**
 * Device Tracking Middleware
 */
export function deviceTracking(config: Partial<AuthConfig> = {}) {
  const finalConfig = { ...DEFAULT_AUTH_CONFIG, ...config };

  if (!finalConfig.enableDeviceTracking) {
    return (req: Request, res: Response, next: NextFunction) => next();
  }

  return async (req: Request, res: Response, next: NextFunction) => {
    const deviceId = generateDeviceId(req);
    const userAgent = req.headers['user-agent'] || 'unknown';
    const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';

    (req as any).device = {
      deviceId,
      userAgent,
      ipAddress,
      timestamp: Date.now()
    };

    next();
  };
}

// =====================================================================================
// AUTHENTICATION HELPERS
// =====================================================================================

/**
 * Extract JWT Token from Authorization Header
 */
function extractTokenFromHeader(authHeader: string | undefined): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  return authHeader.substring(7).trim();
}

/**
 * Verify JWT Token
 */
async function verifyJWTToken(token: string, config: AuthConfig): Promise<any> {
  try {
    if (!token) return null;
    const decoded = jwt.verify(token, config.jwtSecret, {
      algorithms: [config.jwtAlgorithm]
    });
    return decoded;
  } catch (error) {
    console.error('[AUTH] Token verification error:', error);
    return null;
  }
}

/**
 * Extract User Context from Token Payload
 */
async function extractUserContext(
  tokenPayload: any,
  req: Request,
  config: AuthConfig
): Promise<UserContext> {
  const deviceId = generateDeviceId(req);

  return {
    userId: tokenPayload.userId,
    email: tokenPayload.email,
    roles: tokenPayload.roles || [],
    permissions: tokenPayload.permissions || [],
    sessionId: generateSessionId(),
    deviceId,
    ipAddress: req.ip || req.connection.remoteAddress || 'unknown',
    userAgent: req.headers['user-agent'] || 'unknown',
    issuedAt: tokenPayload.iat * 1000,
    expiresAt: tokenPayload.exp * 1000,
    geoLocation: config.enableGeoBlocking ? await getGeoLocation(req) : undefined
  };
}

/**
 * Validate User Session
 */
async function validateUserSession(userContext: UserContext, config: AuthConfig): Promise<boolean> {
  // Check token expiration
  if (Date.now() > userContext.expiresAt) {
    return false;
  }

  // Check geo-blocking if enabled
  if (config.enableGeoBlocking && userContext.geoLocation) {
    if (!config.allowedCountries.includes(userContext.geoLocation.country)) {
      return false;
    }
  }

  // Check concurrent sessions limit
  if (config.maxConcurrentSessions > 0) {
    const activeSessions = await getActiveSessions(userContext.userId);
    if (activeSessions >= config.maxConcurrentSessions) {
      return false;
    }
  }

  return true;
}

/**
 * Check Token Blacklist
 */
async function checkTokenBlacklist(token: string): Promise<boolean> {
  throw new Error('Token blacklist store is not configured.');
}

/**
 * Verify API Key
 */
async function verifyApiKey(apiKey: string): Promise<boolean> {
  const configuredKeys = (process.env.CATALOG_API_KEYS || process.env.API_KEYS || '')
    .split(',')
    .map(key => key.trim())
    .filter(Boolean);
  if (configuredKeys.length === 0) {
    throw new Error('No API keys configured. Set CATALOG_API_KEYS to enable API key auth.');
  }
  return configuredKeys.includes(apiKey);
}

/**
 * Hash API Key for Storage
 */
function hashApiKey(apiKey: string): string {
  return createHash('sha256').update(apiKey).digest('hex');
}

/**
 * Generate Device ID
 */
function generateDeviceId(req: Request): string {
  const fingerprint = [
    req.headers['user-agent'],
    req.ip,
    req.headers['accept-language']
  ].join('|');

  return createHash('md5').update(fingerprint).digest('hex');
}

/**
 * Generate Session ID
 */
function generateSessionId(): string {
  return createHash('sha256')
    .update(`${Date.now()}-${Math.random()}`)
    .digest('hex')
    .substring(0, 32);
}

/**
 * Get Geo Location
 */
async function getGeoLocation(req: Request): Promise<{ country: string; region: string; city: string }> {
  return undefined as any;
}

/**
 * Get Login Attempts
 */
async function getLoginAttempts(clientId: string): Promise<number> {
  throw new Error('Login attempt tracking store is not configured.');
}

/**
 * Get Lockout Time
 */
async function getLockoutTime(clientId: string): Promise<number | null> {
  throw new Error('Login lockout tracking store is not configured.');
}

/**
 * Reset Login Attempts
 */
async function resetLoginAttempts(clientId: string): Promise<void> {
  throw new Error('Login attempt tracking store is not configured.');
}

/**
 * Get Active Sessions
 */
async function getActiveSessions(userId: string): Promise<number> {
  throw new Error('Session store is not configured.');
}

// =====================================================================================
// AUTHENTICATION MIDDLEWARE FACTORY
// =====================================================================================

/**
 * Authentication Middleware Factory
 * Creates pre-configured authentication middleware
 */
export class AuthenticationMiddlewareFactory {
  static createJWTAuth(config: Partial<AuthConfig> = {}) {
    return authenticate(config);
  }

  static createOptionalAuth(config: Partial<AuthConfig> = {}) {
    return optionalAuthenticate(config);
  }

  static createApiKeyAuth(config: Partial<AuthConfig> = {}) {
    return authenticateApiKey(config);
  }

  static createSecureStack(config: Partial<AuthConfig> = {}) {
    return [
      bruteForceProtection(config),
      deviceTracking(config),
      authenticate(config)
    ];
  }
}

/**
 * Express Request Extensions
 */
declare global {
  namespace Express {
    interface Request {
      user?: UserContext | null;
      service?: {
        authenticated: boolean;
        apiKey: string;
        timestamp: number;
      };
      device?: {
        deviceId: string;
        userAgent: string;
        ipAddress: string;
        timestamp: number;
      };
    }
  }
}
