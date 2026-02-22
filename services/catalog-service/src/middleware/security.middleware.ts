/**
 * Security Middleware
 * Provides security-related middleware functions for request validation and protection
 */

import { Request, Response, NextFunction } from 'express';

export interface SecurityConfig {
  enableRateLimit: boolean;
  enableCsrf: boolean;
  enableXss: boolean;
  enableSqlInjection: boolean;
}

export class SecurityMiddleware {
  constructor(private config: SecurityConfig) {}

  /**
   * Rate limiting middleware
   */
  rateLimit(maxRequests: number = 100, windowMs: number = 15 * 60 * 1000) {
    const requests = new Map<string, { count: number; resetTime: number }>();

    return (req: Request, res: Response, next: NextFunction) => {
      if (!this.config.enableRateLimit) {
        return next();
      }

      const clientId = req.ip || 'unknown';
      const now = Date.now();
      const windowStart = now - windowMs;

      const clientData = requests.get(clientId);
      if (!clientData || clientData.resetTime < windowStart) {
        requests.set(clientId, { count: 1, resetTime: now + windowMs });
        return next();
      }

      if (clientData.count >= maxRequests) {
        return res.status(429).json({
          error: 'Too Many Requests',
          message: 'Rate limit exceeded'
        });
      }

      clientData.count++;
      next();
    };
  }

  /**
   * CSRF protection middleware
   */
  csrfProtection() {
    return (req: Request, res: Response, next: NextFunction) => {
      if (!this.config.enableCsrf) {
        return next();
      }

      // Simple CSRF token validation
      const token = req.headers['x-csrf-token'] || req.body._csrf;
      if (!token) {
        return res.status(403).json({
          error: 'CSRF token missing'
        });
      }

      // In a real implementation, validate the token
      next();
    };
  }

  /**
   * XSS protection middleware
   */
  xssProtection() {
    return (req: Request, res: Response, next: NextFunction) => {
      if (!this.config.enableXss) {
        return next();
      }

      // Set XSS protection headers
      res.setHeader('X-XSS-Protection', '1; mode=block');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('X-Frame-Options', 'DENY');

      next();
    };
  }

  /**
   * SQL injection protection middleware
   */
  sqlInjectionProtection() {
    return (req: Request, res: Response, next: NextFunction) => {
      if (!this.config.enableSqlInjection) {
        return next();
      }

      // Basic SQL injection pattern detection
      const sqlPatterns = [
        /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER)\b)/i,
        /(UNION|OR|AND)\s+\d+\s*=\s*\d+/i,
        /['"]\s*(OR|AND)\s*['"]\s*=\s*['"]?/i
      ];

      const checkForSqlInjection = (value: any): boolean => {
        if (typeof value === 'string') {
          return sqlPatterns.some(pattern => pattern.test(value));
        }
        if (typeof value === 'object' && value !== null) {
          return Object.values(value).some(checkForSqlInjection);
        }
        return false;
      };

      if (checkForSqlInjection(req.body) || checkForSqlInjection(req.query)) {
        return res.status(400).json({
          error: 'Potential SQL injection detected'
        });
      }

      next();
    };
  }

  /**
   * Combined security middleware
   */
  secure() {
    return [
      this.xssProtection(),
      this.csrfProtection(),
      this.sqlInjectionProtection(),
      this.rateLimit()
    ];
  }
}