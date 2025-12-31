import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';

// Extend Express Request interface to include user
interface AuthRequest extends Request {
  user?: any;
}

// JWT secret from environment variables
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}

// JWT expiration time
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

/**
 * Middleware to authenticate JWT tokens
 */
export const authenticateToken = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.startsWith('Bearer ')
      ? authHeader.substring(7)
      : null;

    if (!token) {
      res.status(401).json({
        error: 'Access token required',
        message: 'Please provide a valid JWT token in the Authorization header'
      });
      return;
    }

    // Verify the token
    jwt.verify(token, JWT_SECRET, (err, decoded) => {
      if (err) {
        if (err.name === 'TokenExpiredError') {
          res.status(401).json({
            error: 'Token expired',
            message: 'Your session has expired. Please login again.'
          });
          return;
        }

        if (err.name === 'JsonWebTokenError') {
          res.status(401).json({
            error: 'Invalid token',
            message: 'The provided token is invalid or malformed.'
          });
          return;
        }

        res.status(401).json({
          error: 'Token verification failed',
          message: 'Unable to verify the authentication token.'
        });
        return;
      }

      // Token is valid, attach user to request
      req.user = decoded;
      next();
    });

  } catch (error) {
    console.error('Authentication middleware error:', error);
    res.status(500).json({
      error: 'Authentication error',
      message: 'An error occurred during authentication.'
    });
  }
};

/**
 * Middleware to require specific roles
 */
export const requireRole = (...requiredRoles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        error: 'Authentication required',
        message: 'You must be authenticated to access this resource.'
      });
      return;
    }

    const userRole = req.user.role || req.user.roles;

    // Handle both single role and array of roles
    const userRoles = Array.isArray(userRole) ? userRole : [userRole];

    // Check if user has any of the required roles
    const hasRequiredRole = requiredRoles.some(role =>
      userRoles.includes(role)
    );

    if (!hasRequiredRole) {
      res.status(403).json({
        error: 'Insufficient permissions',
        message: `This resource requires one of the following roles: ${requiredRoles.join(', ')}`,
        requiredRoles,
        userRoles
      });
      return;
    }

    next();
  };
};

/**
 * Middleware to require admin role
 */
export const requireAdmin = requireRole('admin', 'superadmin');

/**
 * Middleware to require seller role
 */
export const requireSeller = requireRole('seller', 'admin', 'superadmin');

/**
 * Middleware to require customer role
 */
export const requireCustomer = requireRole('customer', 'seller', 'admin', 'superadmin');

/**
 * Optional authentication - doesn't fail if no token provided
 */
export const optionalAuth = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.startsWith('Bearer ')
      ? authHeader.substring(7)
      : null;

    if (token) {
      jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (!err && decoded) {
          req.user = decoded;
        }
        next();
      });
    } else {
      next();
    }
  } catch (error) {
    // Silently fail for optional auth
    next();
  }
};

/**
 * Generate JWT token for user
 */
export const generateToken = (payload: object): string => {
  return jwt.sign(payload, JWT_SECRET!, {
    expiresIn: JWT_EXPIRES_IN,
    issuer: 'maysar-backend',
    audience: 'maysar-clients'
  } as jwt.SignOptions);
};

/**
 * Verify and decode JWT token without middleware
 */
export const verifyToken = (token: string): any => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
};

/**
 * Extract token from request headers
 */
export const extractToken = (req: Request): string | null => {
  const authHeader = req.headers['authorization'];
  return authHeader && authHeader.startsWith('Bearer ')
    ? authHeader.substring(7)
    : null;
};

// Export the extended Request interface for use in other files
export type { AuthRequest };
