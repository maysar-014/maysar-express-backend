/**
 * Authentication Middleware for Auth Service
 * Centralized authentication middleware that validates tokens and manages user sessions
 * Provides service-to-service authentication capabilities
 */

import { Request, Response, NextFunction } from 'express';
import { AuthServiceClient } from '../../infrastructure/clients/auth-service.client';
import { logger } from '../../infrastructure/services/logger.service';

// =====================================================================================
// AUTHENTICATION CONFIGURATION
// =====================================================================================

/**
 * Authentication Configuration Interface
 */
export interface AuthMiddlewareConfig {
  jwtSecret: string;
  jwtAlgorithm: 'HS256' | 'HS384' | 'HS512';
  tokenExpirationTime: number;
  enableTokenBlacklisting: boolean;
  enableBruteForceProtection: boolean;
  bruteForceMaxAttempts: number;
  bruteForceLockoutTime: number;
  enableDeviceTracking: boolean;
  enableSessionLogging: boolean;
  enableApiKeyAuth: boolean;
  enableServiceAuth: boolean;
  serviceAuthHeader: string;
  allowedServiceKeys: string[];
}

/**
 * Default Authentication Configuration
 */
export const DEFAULT_AUTH_CONFIG: AuthMiddlewareConfig = {
  jwtSecret: process.env.JWT_SECRET || 'default-secret-change-in-production',
  jwtAlgorithm: 'HS256',
  tokenExpirationTime: 15 * 60 * 1000, // 15 minutes
  enableTokenBlacklisting: true,
  enableBruteForceProtection: true,
  bruteForceMaxAttempts: 5,
  bruteForceLockoutTime: 15 * 60 * 1000, // 15 minutes
  enableDeviceTracking: true,
  enableSessionLogging: true,
  enableApiKeyAuth: true,
  enableServiceAuth: true,
  serviceAuthHeader: 'X-Service-Key',
  allowedServiceKeys: process.env.ALLOWED_SERVICE_KEYS?.split(',') || []
};

// =====================================================================================
// USER CONTEXT & AUTHENTICATION TYPES
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
 * Service Authentication Context
 */
export interface ServiceContext {
  serviceId: string;
  serviceKey: string;
  permissions: string[];
  timestamp: number;
  ipAddress: string;
  userAgent: string;
}

/**
 * Authentication Result
 */
export interface AuthResult {
  authenticated: boolean;
  user?: UserContext;
  service?: ServiceContext;
  error?: {
    code: string;
    message: string;
  };
}

// =====================================================================================
// AUTHENTICATION MIDDLEWARE CLASS
// =====================================================================================

/**
 * Authentication Middleware
 * Provides centralized authentication for the auth service itself
 */
export class AuthenticationMiddleware {
  private config: AuthMiddlewareConfig;
  private authServiceClient: AuthServiceClient;

  constructor(config?: Partial<AuthMiddlewareConfig>) {
    this.config = { ...DEFAULT_AUTH_CONFIG, ...config };
    this.authServiceClient = new AuthServiceClient();
  }

  /**
   * JWT Authentication Middleware
   * Validates JWT tokens for user authentication
   */
  authenticate(): (req: Request, res: Response, next: NextFunction) => Promise<void> {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const authHeader = req.headers.authorization;
        const token = this.extractTokenFromHeader(authHeader);

        if (!token) {
          return this.sendUnauthorized(res, 'MISSING_TOKEN', 'Authentication token required');
        }

        // Check if token is blacklisted
        if (this.config.enableTokenBlacklisting) {
          const isBlacklisted = await this.checkTokenBlacklist(token);
          if (isBlacklisted) {
            return this.sendUnauthorized(res, 'TOKEN_BLACKLISTED', 'Token has been revoked');
          }
        }

        // Validate token with auth service
        const validationResponse = await this.authServiceClient.validateToken(token);
        
        if (!validationResponse.valid) {
          return this.sendUnauthorized(res, 'INVALID_TOKEN', validationResponse.error || 'Invalid or expired authentication token');
        }

        // Extract user context from validation response
        const userContext = this.extractUserContext(validationResponse.payload, req);

        // Validate session
        if (!this.validateUserSession(userContext)) {
          return this.sendUnauthorized(res, 'SESSION_INVALID', 'User session is invalid or expired');
        }

        // Attach user context to request
        (req as any).user = userContext;

        // Log authentication success
        if (this.config.enableSessionLogging) {
          logger.info('User authenticated', {
            userId: userContext.userId,
            email: userContext.email,
            sessionId: userContext.sessionId,
            ipAddress: userContext.ipAddress
          });
        }

        next();
      } catch (error) {
        logger.error('Authentication error', { error: error instanceof Error ? error.message : String(error) });
        return this.sendError(res, 'AUTHENTICATION_ERROR', 'Authentication failed due to internal error');
      }
    };
  }

  /**
   * Optional Authentication Middleware
   * Allows both authenticated and anonymous access
   */
  optionalAuthenticate(): (req: Request, res: Response, next: NextFunction) => Promise<void> {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const authHeader = req.headers.authorization;
        const token = this.extractTokenFromHeader(authHeader);

        if (!token) {
          // No token provided, continue as anonymous user
          (req as any).user = null;
          return next();
        }

        // Attempt authentication
        const validationResponse = await this.authServiceClient.validateToken(token);

        if (validationResponse.valid) {
          const userContext = this.extractUserContext(validationResponse.payload, req);
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
  authenticateApiKey(): (req: Request, res: Response, next: NextFunction) => Promise<void> {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const apiKey = req.headers[this.config.serviceAuthHeader.toLowerCase()] as string;

        if (!apiKey) {
          return this.sendUnauthorized(res, 'MISSING_API_KEY', 'API key required for service authentication');
        }

        // Verify API key
        const isValid = await this.verifyApiKey(apiKey);
        if (!isValid) {
          return this.sendUnauthorized(res, 'INVALID_API_KEY', 'Invalid API key');
        }

        // Attach service context
        const serviceContext: ServiceContext = {
          serviceId: this.extractServiceId(apiKey),
          serviceKey: this.hashApiKey(apiKey),
          permissions: ['read', 'write'], // Default permissions for valid services
          timestamp: Date.now(),
          ipAddress: req.ip || req.connection.remoteAddress || 'unknown',
          userAgent: req.headers['user-agent'] || 'unknown'
        };

        (req as any).service = serviceContext;

        if (this.config.enableSessionLogging) {
          logger.info('Service authenticated', {
            serviceId: serviceContext.serviceId,
            timestamp: serviceContext.timestamp,
            ipAddress: serviceContext.ipAddress
          });
        }

        next();
      } catch (error) {
        logger.error('API key authentication error', { error: error instanceof Error ? error.message : String(error) });
        return this.sendError(res, 'API_KEY_ERROR', 'API key authentication failed');
      }
    };
  }

  /**
   * Service Authentication Middleware
   * Validates service-to-service requests with service keys
   */
  authenticateService(): (req: Request, res: Response, next: NextFunction) => Promise<void> {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const serviceKey = req.headers[this.config.serviceAuthHeader.toLowerCase()] as string;

        if (!serviceKey) {
          return this.sendUnauthorized(res, 'MISSING_SERVICE_KEY', 'Service key required');
        }

        // Verify service key
        const isValid = this.config.allowedServiceKeys.includes(serviceKey);
        if (!isValid) {
          return this.sendUnauthorized(res, 'INVALID_SERVICE_KEY', 'Invalid service key');
        }

        // Attach service context
        const serviceContext: ServiceContext = {
          serviceId: this.extractServiceId(serviceKey),
          serviceKey: this.hashApiKey(serviceKey),
          permissions: ['read', 'write', 'admin'], // Full permissions for trusted services
          timestamp: Date.now(),
          ipAddress: req.ip || req.connection.remoteAddress || 'unknown',
          userAgent: req.headers['user-agent'] || 'unknown'
        };

        (req as any).service = serviceContext;

        if (this.config.enableSessionLogging) {
          logger.info('Service authenticated', {
            serviceId: serviceContext.serviceId,
            timestamp: serviceContext.timestamp,
            ipAddress: serviceContext.ipAddress
          });
        }

        next();
      } catch (error) {
        logger.error('Service authentication error', { error: error instanceof Error ? error.message : String(error) });
        return this.sendError(res, 'SERVICE_AUTH_ERROR', 'Service authentication failed');
      }
    };
  }

  /**
   * Combined Authentication Middleware
   * Supports both JWT and API key authentication
   */
  authenticateCombined(): (req: Request, res: Response, next: NextFunction) => Promise<void> {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const authHeader = req.headers.authorization;
        const token = this.extractTokenFromHeader(authHeader);
        const apiKey = req.headers[this.config.serviceAuthHeader.toLowerCase()] as string;

        // Try JWT authentication first
        if (token) {
          const validationResponse = await this.authServiceClient.validateToken(token);
          
          if (validationResponse.valid) {
            const userContext = this.extractUserContext(validationResponse.payload, req);
            (req as any).user = userContext;
            (req as any).authType = 'jwt';
            
            if (this.config.enableSessionLogging) {
              logger.info('JWT authentication successful', {
                userId: userContext.userId,
                email: userContext.email
              });
            }
            return next();
          }
        }

        // Try API key authentication
        if (apiKey) {
          const isValid = await this.verifyApiKey(apiKey);
          if (isValid) {
            const serviceContext: ServiceContext = {
              serviceId: this.extractServiceId(apiKey),
              serviceKey: this.hashApiKey(apiKey),
              permissions: ['read', 'write'],
              timestamp: Date.now(),
              ipAddress: req.ip || req.connection.remoteAddress || 'unknown',
              userAgent: req.headers['user-agent'] || 'unknown'
            };

            (req as any).service = serviceContext;
            (req as any).authType = 'api-key';

            if (this.config.enableSessionLogging) {
              logger.info('API key authentication successful', {
                serviceId: serviceContext.serviceId
              });
            }
            return next();
          }
        }

        // No valid authentication found
        return this.sendUnauthorized(res, 'NO_VALID_AUTH', 'No valid authentication provided');
      } catch (error) {
        logger.error('Combined authentication error', { error: error instanceof Error ? error.message : String(error) });
        return this.sendError(res, 'COMBINED_AUTH_ERROR', 'Authentication failed');
      }
    };
  }

  // =====================================================================================
  // HELPER METHODS
  // =====================================================================================

  /**
   * Extract JWT Token from Authorization Header
   */
  private extractTokenFromHeader(authHeader: string | undefined): string | null {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }
    return authHeader.substring(7).trim();
  }

  /**
   * Extract User Context from Token Payload
   */
  private extractUserContext(tokenPayload: any, req: Request): UserContext {
    const deviceId = this.generateDeviceId(req);

    return {
      userId: tokenPayload.userId,
      email: tokenPayload.email,
      roles: tokenPayload.roles || [],
      permissions: tokenPayload.permissions || [],
      sessionId: tokenPayload.sessionId || this.generateSessionId(),
      deviceId,
      ipAddress: req.ip || req.connection.remoteAddress || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown',
      issuedAt: tokenPayload.iat * 1000,
      expiresAt: tokenPayload.exp * 1000,
      geoLocation: this.config.enableDeviceTracking ? this.getGeoLocation(req) : undefined
    };
  }

  /**
   * Validate User Session
   */
  private validateUserSession(userContext: UserContext): boolean {
    // Check token expiration
    if (Date.now() > userContext.expiresAt) {
      return false;
    }

    // Additional session validation logic can be added here
    return true;
  }

  /**
   * Check Token Blacklist
   */
  private async checkTokenBlacklist(token: string): Promise<boolean> {
    try {
      const response = await this.authServiceClient.checkTokenBlacklist(token);
      return response.isBlacklisted;
    } catch (error) {
      logger.error('Token blacklist check failed', { error: error instanceof Error ? error.message : String(error) });
      return false; // Fail open for availability
    }
  }

  /**
   * Verify API Key
   */
  private async verifyApiKey(apiKey: string): Promise<boolean> {
    try {
      const response = await this.authServiceClient.validateApiKey(apiKey);
      return response.valid;
    } catch (error) {
      logger.error('API key verification failed', { error: error instanceof Error ? error.message : String(error) });
      return false;
    }
  }

  /**
   * Extract Service ID from API Key
   */
  private extractServiceId(apiKey: string): string {
    // Simple extraction - in production, decode from API key or lookup in database
    return apiKey.substring(0, 8); // First 8 characters as service ID
  }

  /**
   * Hash API Key for Storage
   */
  private hashApiKey(apiKey: string): string {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(apiKey).digest('hex');
  }

  /**
   * Generate Device ID
   */
  private generateDeviceId(req: Request): string {
    const crypto = require('crypto');
    const fingerprint = [
      req.headers['user-agent'],
      req.ip,
      req.headers['accept-language']
    ].join('|');
    return crypto.createHash('md5').update(fingerprint).digest('hex');
  }

  /**
   * Generate Session ID
   */
  private generateSessionId(): string {
    const crypto = require('crypto');
    return crypto.createHash('sha256')
      .update(`${Date.now()}-${Math.random()}`)
      .digest('hex')
      .substring(0, 32);
  }

  /**
   * Get Geo Location (Mock for now)
   */
  private getGeoLocation(req: Request): { country: string; region: string; city: string } | undefined {
    // In production, use a geo-IP service
    return {
      country: 'US',
      region: 'CA',
      city: 'San Francisco'
    };
  }

  /**
   * Send Unauthorized Response
   */
  private sendUnauthorized(res: Response, code: string, message: string): void {
    res.status(401).json({
      success: false,
      error: {
        code,
        message
      }
    });
  }

  /**
   * Send Error Response
   */
  private sendError(res: Response, code: string, message: string): void {
    res.status(500).json({
      success: false,
      error: {
        code,
        message
      }
    });
  }
}

// =====================================================================================
// MIDDLEWARE FACTORY
// =====================================================================================

/**
 * Authentication Middleware Factory
 * Creates pre-configured authentication middleware instances
 */
export class AuthenticationMiddlewareFactory {
  static createJWTAuth(config?: Partial<AuthMiddlewareConfig>): (req: Request, res: Response, next: NextFunction) => Promise<void> {
    const middleware = new AuthenticationMiddleware(config);
    return middleware.authenticate();
  }

  static createOptionalAuth(config?: Partial<AuthMiddlewareConfig>): (req: Request, res: Response, next: NextFunction) => Promise<void> {
    const middleware = new AuthenticationMiddleware(config);
    return middleware.optionalAuthenticate();
  }

  static createApiKeyAuth(config?: Partial<AuthMiddlewareConfig>): (req: Request, res: Response, next: NextFunction) => Promise<void> {
    const middleware = new AuthenticationMiddleware(config);
    return middleware.authenticateApiKey();
  }

  static createServiceAuth(config?: Partial<AuthMiddlewareConfig>): (req: Request, res: Response, next: NextFunction) => Promise<void> {
    const middleware = new AuthenticationMiddleware(config);
    return middleware.authenticateService();
  }

  static createCombinedAuth(config?: Partial<AuthMiddlewareConfig>): (req: Request, res: Response, next: NextFunction) => Promise<void> {
    const middleware = new AuthenticationMiddleware(config);
    return middleware.authenticateCombined();
  }
}

// =====================================================================================
// EXPRESS REQUEST EXTENSIONS
// =====================================================================================

/**
 * Express Request Extensions for Authentication
 */
declare global {
  namespace Express {
    interface Request {
      user?: UserContext | null;
      service?: ServiceContext | null;
      authType?: 'jwt' | 'api-key' | 'service-key';
    }
  }
}