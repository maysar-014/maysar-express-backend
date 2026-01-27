/**
 * Auth Delegation Middleware
 * 
 * Delegates authentication validation to the Auth Service instead of
 * performing direct JWT validation in the gateway. This follows the
 * Gateway Auth Separation Plan to maintain clear separation of concerns.
 */

import { Request, Response, NextFunction } from 'express';
import { AuthDelegationService } from '../services/auth-delegation.service';
import { GatewayError } from '../types/index';

export interface AuthDelegationOptions {
  required?: boolean;
  scopes?: string[];
  roles?: string[];
  timeout?: number;
  cacheTTL?: number;
  fallbackToPublic?: boolean;
}

export class AuthDelegationMiddleware {
  private authDelegationService: AuthDelegationService;
  private defaultOptions: AuthDelegationOptions;

  constructor(options?: Partial<AuthDelegationOptions>) {
    this.authDelegationService = new AuthDelegationService();
    this.defaultOptions = {
      required: true,
      scopes: [],
      roles: [],
      timeout: 5000,
      cacheTTL: 300000, // 5 minutes
      fallbackToPublic: false,
      ...options,
    };
  }

  middleware(options?: Partial<AuthDelegationOptions>) {
    return async (req: Request, res: Response, next: NextFunction) => {
      const opts = { ...this.defaultOptions, ...options };

      try {
        // Extract token from request
        const token = this.extractToken(req);
        
        if (!token) {
          if (opts.required) {
            return this.sendAuthError(res, 'Authentication token required', 401);
          } else if (opts.fallbackToPublic) {
            // Set public context and continue
            this.setPublicContext(req);
            return next();
          } else {
            return next();
          }
        }

        // Validate token with Auth Service
        const authResult = await this.authDelegationService.validateToken(token, {
          scopes: opts.scopes,
          roles: opts.roles,
          timeout: opts.timeout,
          cacheTTL: opts.cacheTTL,
        });

        if (!authResult.valid) {
          return this.sendAuthError(res, authResult.error || 'Authentication failed', 401);
        }

        // Set authentication context
        this.setAuthContext(req, authResult.context);
        next();

      } catch (error) {
        console.error('Auth delegation error:', error);
        
        if (error instanceof Error && 'statusCode' in error) {
          const gatewayError = error as GatewayError;
          return this.sendAuthError(res, gatewayError.message, gatewayError.statusCode);
        }
        
        // Fallback to public if auth service is unavailable
        if (opts.fallbackToPublic) {
          this.setPublicContext(req);
          return next();
        }
        
        return this.sendAuthError(res, 'Authentication service unavailable', 503);
      }
    };
  }

  private extractToken(req: Request): string | null {
    // Check Authorization header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    // Check cookies for token
    if (req.cookies && req.cookies.token) {
      return req.cookies.token;
    }

    // Check query parameter (for WebSocket connections)
    if (req.query && 'token' in req.query) {
      const tokenValue = req.query.token;
      if (typeof tokenValue === 'string') {
        return tokenValue;
      } else if (Array.isArray(tokenValue) && tokenValue.length > 0) {
        return tokenValue[0] as string;
      }
    }

    return null;
  }

  private setAuthContext(req: Request, context: any): void {
    // Set authentication context on request
    (req as any).auth = {
      userId: context.userId,
      email: context.email,
      role: context.role,
      roles: context.roles || [],
      permissions: context.permissions || [],
      sessionId: context.sessionId,
      token: context.token,
      expiresAt: context.expiresAt,
      authenticated: true,
    };

    // Set user context for logging and monitoring
    (req as any).user = {
      id: context.userId,
      email: context.email,
      role: context.role,
    };
  }

  private setPublicContext(req: Request): void {
    (req as any).auth = {
      userId: null,
      email: null,
      role: 'public',
      roles: ['public'],
      permissions: [],
      sessionId: null,
      token: null,
      expiresAt: null,
      authenticated: false,
    };

    (req as any).user = {
      id: null,
      email: null,
      role: 'public',
    };
  }

  private sendAuthError(res: Response, message: string, statusCode: number): void {
    res.status(statusCode).json({
      success: false,
      error: {
        code: statusCode === 401 ? 'UNAUTHORIZED' : 'AUTH_SERVICE_ERROR',
        message,
      },
      timestamp: new Date().toISOString(),
      requestId: (res as any).requestId || 'unknown',
    });
  }
}

// Default auth delegation middleware instance
export const authDelegationMiddleware = new AuthDelegationMiddleware();

// Export middleware function with default options
export const authenticate = authDelegationMiddleware.middleware();

// Export middleware function with required authentication
export const requireAuth = authDelegationMiddleware.middleware({ required: true });

// Export middleware function with optional authentication
export const optionalAuth = authDelegationMiddleware.middleware({ required: false });

// Export middleware function with specific scopes
export const requireScopes = (scopes: string[]) => 
  authDelegationMiddleware.middleware({ required: true, scopes });

// Export middleware function with specific roles
export const requireRoles = (roles: string[]) => 
  authDelegationMiddleware.middleware({ required: true, roles });

// Export middleware function with fallback to public
export const publicOrAuth = authDelegationMiddleware.middleware({ 
  required: false, 
  fallbackToPublic: true 
});