import rateLimit from 'express-rate-limit';
import { Request, Response, NextFunction } from 'express';

/**
 * Rate Limiting Middleware
 * Implements multiple rate limiting strategies for different endpoints
 */

export class RateLimitingMiddleware {

  /**
   * General API rate limiter
   * Standard rate limiting for most endpoints
   */
  static getGeneralLimiter() {
    return rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // limit each IP to 100 requests per windowMs
      message: {
        error: 'Too many requests from this IP, please try again later.',
        retryAfter: '15 minutes'
      },
      standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
      legacyHeaders: false, // Disable the `X-RateLimit-*` headers
      skip: (req: Request) => {
        // Skip rate limiting for health checks
        return req.path === '/health' || req.path === '/health/ready' || req.path === '/health/live';
      },
      handler: (req: Request, res: Response) => {
        res.status(429).json({
          error: 'Too many requests',
          message: 'Rate limit exceeded. Please try again later.',
          retryAfter: Math.ceil((res.get('Retry-After') as any) / 1000) || 900
        });
      }
    });
  }

  /**
   * Strict rate limiter for sensitive operations
   * Tighter limits for authentication and payment endpoints
   */
  static getStrictLimiter() {
    return rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 10, // limit each IP to 10 requests per windowMs
      message: {
        error: 'Too many sensitive requests from this IP',
        retryAfter: '15 minutes'
      },
      standardHeaders: true,
      legacyHeaders: false,
      handler: (req: Request, res: Response) => {
        res.status(429).json({
          error: 'Too many requests',
          message: 'Rate limit exceeded for sensitive operations. Please try again later.',
          retryAfter: Math.ceil((res.get('Retry-After') as any) / 1000) || 900
        });
      }
    });
  }

  /**
   * Login rate limiter
   * Very strict limits for authentication attempts
   */
  static getAuthLimiter() {
    return rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 5, // limit each IP to 5 login attempts per windowMs
      message: {
        error: 'Too many login attempts',
        retryAfter: '15 minutes'
      },
      standardHeaders: true,
      legacyHeaders: false,
      skipSuccessfulRequests: true, // Don't count successful logins
      skipFailedRequests: false, // Count failed attempts
      handler: (req: Request, res: Response) => {
        res.status(429).json({
          error: 'Too many login attempts',
          message: 'Account temporarily locked due to too many failed login attempts.',
          retryAfter: Math.ceil((res.get('Retry-After') as any) / 1000) || 900
        });
      }
    });
  }

  /**
   * API creation rate limiter
   * Limits for resource creation endpoints
   */
  static getCreateLimiter() {
    return rateLimit({
      windowMs: 60 * 60 * 1000, // 1 hour
      max: 50, // limit each IP to 50 creations per hour
      message: {
        error: 'Too many resources created',
        retryAfter: '1 hour'
      },
      standardHeaders: true,
      legacyHeaders: false,
      handler: (req: Request, res: Response) => {
        res.status(429).json({
          error: 'Too many resources created',
          message: 'Rate limit exceeded for resource creation. Please try again later.',
          retryAfter: Math.ceil((res.get('Retry-After') as any) / 1000) || 3600
        });
      }
    });
  }

  /**
   * Payment rate limiter
   * Strict limits for payment operations
   */
  static getPaymentLimiter() {
    return rateLimit({
      windowMs: 10 * 60 * 1000, // 10 minutes
      max: 20, // limit each IP to 20 payment attempts per windowMs
      message: {
        error: 'Too many payment attempts',
        retryAfter: '10 minutes'
      },
      standardHeaders: true,
      legacyHeaders: false,
      handler: (req: Request, res: Response) => {
        res.status(429).json({
          error: 'Too many payment attempts',
          message: 'Rate limit exceeded for payment operations. Please try again later.',
          retryAfter: Math.ceil((res.get('Retry-After') as any) / 1000) || 600
        });
      }
    });
  }

  /**
   * Admin operations rate limiter
   * Very strict limits for admin endpoints
   */
  static getAdminLimiter() {
    return rateLimit({
      windowMs: 60 * 60 * 1000, // 1 hour
      max: 100, // limit each IP to 100 admin requests per hour
      message: {
        error: 'Too many admin requests',
        retryAfter: '1 hour'
      },
      standardHeaders: true,
      legacyHeaders: false,
      handler: (req: Request, res: Response) => {
        res.status(429).json({
          error: 'Too many admin requests',
          message: 'Rate limit exceeded for admin operations.',
          retryAfter: Math.ceil((res.get('Retry-After') as any) / 1000) || 3600
        });
      }
    });
  }

  /**
   * Middleware to apply appropriate rate limiting based on route
   */
  static routeBasedRateLimit() {
    return (req: Request, res: Response, next: NextFunction) => {
      const path = req.path.toLowerCase();

      // Apply different limits based on route patterns
      if (path.includes('/auth') || path.includes('/login')) {
        return RateLimitingMiddleware.getAuthLimiter()(req, res, next);
      }

      if (path.includes('/payment') || path.includes('/pay')) {
        return RateLimitingMiddleware.getPaymentLimiter()(req, res, next);
      }

      if (path.includes('/admin') || path.includes('/management')) {
        return RateLimitingMiddleware.getAdminLimiter()(req, res, next);
      }

      if (req.method === 'POST' && (path.includes('/order') || path.includes('/create'))) {
        return RateLimitingMiddleware.getCreateLimiter()(req, res, next);
      }

      // Default to general limiter
      return RateLimitingMiddleware.getGeneralLimiter()(req, res, next);
    };
  }
}
