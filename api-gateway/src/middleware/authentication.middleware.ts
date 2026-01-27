/**
 * Authentication Middleware
 * 
 * Handles authentication for the Maysar API Gateway using Auth Delegation.
 * This middleware delegates authentication validation to the Auth Service
 * to maintain proper service separation and architectural boundaries.
 */

import { Request, Response, NextFunction } from 'express';
import { authDelegationMiddleware } from './auth-delegation.middleware';

// Extend Express Request interface to include auth property
declare global {
  namespace Express {
    interface Request {
      auth?: any;
    }
  }
}

export interface AuthenticationOptions {
  required?: boolean;
  scopes?: string[];
  roles?: string[];
  fallbackToPublic?: boolean;
}

export class AuthenticationMiddleware {
  private authDelegationMiddleware = authDelegationMiddleware;

  middleware(options?: AuthenticationOptions) {
    return this.authDelegationMiddleware.middleware({
      required: options?.required ?? true,
      scopes: options?.scopes || [],
      roles: options?.roles || [],
      fallbackToPublic: options?.fallbackToPublic ?? false,
    });
  }
}

// Default authentication middleware instance
export const authenticationMiddleware = new AuthenticationMiddleware();

// Export middleware function with default options (required authentication)
export const authenticate = authenticationMiddleware.middleware();

// Export middleware function with optional authentication
export const optionalAuthenticate = authenticationMiddleware.middleware({ required: false });

// Export middleware function with specific scopes
export const requireScopes = (scopes: string[]) => 
  authenticationMiddleware.middleware({ required: true, scopes });

// Export middleware function with specific roles
export const requireRoles = (roles: string[]) => 
  authenticationMiddleware.middleware({ required: true, roles });

// Export middleware function with fallback to public
export const publicOrAuth = authenticationMiddleware.middleware({ 
  required: false, 
  fallbackToPublic: true 
});
