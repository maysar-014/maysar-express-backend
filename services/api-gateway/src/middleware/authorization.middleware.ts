/**
 * Authorization Middleware
 * 
 * Handles role-based and permission-based authorization for the Maysar API Gateway
 */

import { Request, Response, NextFunction } from 'express';
import { AuthContext } from '../types';

export interface AuthorizationOptions {
  requiredRoles?: string[];
  requiredPermissions?: string[];
  allowSelf?: boolean;
  userIdParam?: string;
}

export class AuthorizationMiddleware {
  middleware(options?: AuthorizationOptions) {
    return (req: Request, res: Response, next: NextFunction) => {
      const opts = {
        requiredRoles: [],
        requiredPermissions: [],
        allowSelf: false,
        userIdParam: 'userId',
        ...options,
      };

      try {
        // Check if user is authenticated
        if (!req.auth) {
          return this.sendAuthError(res, 'Authentication required', 401);
        }

        // Check role requirements
        if (opts.requiredRoles.length > 0) {
          const hasRequiredRole = this.checkRoles(req.auth, opts.requiredRoles);
          if (!hasRequiredRole) {
            return this.sendAuthError(res, 'Insufficient role permissions', 403);
          }
        }

        // Check permission requirements
        if (opts.requiredPermissions.length > 0) {
          const hasRequiredPermissions = this.checkPermissions(req.auth, opts.requiredPermissions);
          if (!hasRequiredPermissions) {
            return this.sendAuthError(res, 'Insufficient permissions', 403);
          }
        }

        // Check self-access permissions
        if (opts.allowSelf) {
          const isSelfAccess = this.checkSelfAccess(req, req.auth, opts.userIdParam);
          if (!isSelfAccess) {
            return this.sendAuthError(res, 'Access denied', 403);
          }
        }

        next();
      } catch (error) {
        return this.sendAuthError(res, 'Authorization failed', 500);
      }
    };
  }

  private checkRoles(auth: AuthContext, requiredRoles: string[]): boolean {
    // Admin role bypasses all checks
    if (auth.role === 'admin') {
      return true;
    }

    // Check if user has any of the required roles
    return requiredRoles.some(role => auth.role === role);
  }

  private checkPermissions(auth: AuthContext, requiredPermissions: string[]): boolean {
    // Admin role has all permissions
    if (auth.role === 'admin') {
      return true;
    }

    // Check if user has all required permissions
    return requiredPermissions.every(permission => 
      auth.permissions.includes(permission)
    );
  }

  private checkSelfAccess(req: Request, auth: AuthContext, userIdParam: string): boolean {
    // Admin can access anything
    if (auth.role === 'admin') {
      return true;
    }

    // Check if accessing own resource
    const requestedUserId = req.params[userIdParam] || req.query[userIdParam];
    if (requestedUserId && requestedUserId === auth.userId) {
      return true;
    }

    return false;
  }

  private sendAuthError(res: Response, message: string, statusCode: number): void {
    res.status(statusCode).json({
      success: false,
      error: {
        code: 'AUTHORIZATION_ERROR',
        message,
      },
      timestamp: new Date().toISOString(),
    });
  }

  // Utility method to check if user has specific permission
  static hasPermission(auth: AuthContext, permission: string): boolean {
    if (auth.role === 'admin') {
      return true;
    }
    return auth.permissions.includes(permission);
  }

  // Utility method to check if user has specific role
  static hasRole(auth: AuthContext, role: string): boolean {
    if (auth.role === 'admin') {
      return true;
    }
    return auth.role === role;
  }

  // Utility method to check if user can access resource
  static canAccess(auth: AuthContext, resourceUserId: string): boolean {
    if (auth.role === 'admin') {
      return true;
    }
    return auth.userId === resourceUserId;
  }
}

// Default authorization middleware instance
export const authorizationMiddleware = new AuthorizationMiddleware();

// Export middleware function
export const authorize = authorizationMiddleware.middleware();

// Pre-defined authorization middleware functions
export const requireAdmin = authorizationMiddleware.middleware({
  requiredRoles: ['admin'],
});

export const requireAuthenticated = authorizationMiddleware.middleware({
  requiredRoles: ['user', 'admin', 'seller', 'courier', 'enabler', 'supplier'],
});

export const requireSeller = authorizationMiddleware.middleware({
  requiredRoles: ['seller'],
});

export const requireCourier = authorizationMiddleware.middleware({
  requiredRoles: ['courier'],
});

export const requireEnabler = authorizationMiddleware.middleware({
  requiredRoles: ['enabler'],
});

export const requireSupplier = authorizationMiddleware.middleware({
  requiredRoles: ['supplier'],
});

export const allowSelfOrAdmin = authorizationMiddleware.middleware({
  allowSelf: true,
});