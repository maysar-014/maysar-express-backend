/**
 * Security Middleware
 * 
 * Handles security headers and protection for the Maysar API Gateway
 */

import { Request, Response, NextFunction } from 'express';

export interface SecurityOptions {
  helmet?: boolean;
  hsts?: boolean;
  csp?: string;
  xssProtection?: boolean;
  contentTypeNosniff?: boolean;
  frameOptions?: 'DENY' | 'SAMEORIGIN' | 'ALLOW-FROM';
  frameOptionsUri?: string;
  referrerPolicy?: string;
}

export class SecurityMiddleware {
  private options: SecurityOptions;

  constructor(options?: Partial<SecurityOptions>) {
    this.options = {
      helmet: true,
      hsts: true,
      csp: "default-src 'self'",
      xssProtection: true,
      contentTypeNosniff: true,
      frameOptions: 'DENY',
      referrerPolicy: 'strict-origin-when-cross-origin',
      ...options,
    };
  }

  middleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      // Set security headers
      this.setSecurityHeaders(res);

      // Additional security checks
      this.performSecurityChecks(req, res);

      next();
    };
  }

  private setSecurityHeaders(res: Response): void {
    if (this.options.helmet) {
      // Remove X-Powered-By header
      res.removeHeader('X-Powered-By');

      // Set various security headers
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('X-Frame-Options', this.options.frameOptions!);
      res.setHeader('X-XSS-Protection', '1; mode=block');
      res.setHeader('Referrer-Policy', this.options.referrerPolicy!);
    }

    if (this.options.hsts) {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    }

    if (this.options.csp) {
      res.setHeader('Content-Security-Policy', this.options.csp);
    }

    if (this.options.frameOptions === 'ALLOW-FROM' && this.options.frameOptionsUri) {
      res.setHeader('X-Frame-Options', `ALLOW-FROM ${this.options.frameOptionsUri}`);
    }
  }

  private performSecurityChecks(req: Request, res: Response): void {
    // Check for suspicious headers
    this.checkSuspiciousHeaders(req);

    // Validate request size
    this.validateRequestSize(req);

    // Check for common attack patterns
    this.checkAttackPatterns(req);
  }

  private checkSuspiciousHeaders(req: Request): void {
    const suspiciousHeaders = [
      'x-forwarded-for',
      'x-real-ip',
      'x-cluster-client-ip',
      'x-originating-ip',
    ];

    for (const header of suspiciousHeaders) {
      const value = req.headers[header];
      if (value && typeof value === 'string' && value.includes(';')) {
        // Log potential header injection attempt
        console.warn(`Potential header injection attempt detected: ${header} = ${value}`);
      }
    }
  }

  private validateRequestSize(req: Request): void {
    const contentLength = req.headers['content-length'];
    if (contentLength) {
      const size = parseInt(contentLength, 10);
      if (size > 10 * 1024 * 1024) { // 10MB limit
        throw new Error('Request too large');
      }
    }
  }

  private checkAttackPatterns(req: Request): void {
    // Check for SQL injection patterns
    const sqlPatterns = [
      /(\bselect\b|\binsert\b|\bupdate\b|\bdelete\b|\bdrop\b|\bunion\b)/i,
      /('|(\\')|(;)|(--)|(\||(\%27)|(\%3B)|(\%2D\%2D))/,
    ];

    // Check query parameters
    for (const [key, value] of Object.entries(req.query)) {
      if (typeof value === 'string') {
        for (const pattern of sqlPatterns) {
          if (pattern.test(value)) {
            throw new Error('Potential SQL injection detected');
          }
        }
      }
    }

    // Check request body
    if (req.body && typeof req.body === 'object') {
      const bodyStr = JSON.stringify(req.body);
      for (const pattern of sqlPatterns) {
        if (pattern.test(bodyStr)) {
          throw new Error('Potential SQL injection detected');
        }
      }
    }
  }
}

// Default security middleware instance
export const securityMiddleware = new SecurityMiddleware();

// Export middleware function
export const security = securityMiddleware.middleware();