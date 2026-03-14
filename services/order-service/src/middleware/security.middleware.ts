import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import { Request, Response, NextFunction } from 'express';
import { RateLimitingMiddleware } from './rate-limiting.middleware';
import { ValidationMiddleware } from './validation.middleware';

/**
 * Security Middleware Stack
 * Implements enterprise-grade security headers and configurations
 */

export class SecurityMiddleware {

  /**
   * Configure Helmet security headers
   * Protects against common web vulnerabilities
   */
  static getHelmetConfig() {
    return helmet({
      // Content Security Policy
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
          fontSrc: ["'self'", "https://fonts.gstatic.com"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
          connectSrc: ["'self'", "https://api.pesapal.com"],
          frameSrc: ["'none'"],
          objectSrc: ["'none'"],
          upgradeInsecureRequests: [],
        },
      },

      // Hide X-Powered-By header
      hidePoweredBy: true,

      // HTTP Strict Transport Security
      hsts: {
        maxAge: 31536000, // 1 year
        includeSubDomains: true,
        preload: true
      },

      // Prevent clickjacking
      frameguard: { action: 'deny' },

      // Prevent MIME type sniffing
      noSniff: true,

      // XSS protection
      xssFilter: true,

      // Prevent referrer leakage
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
    });
  }

  /**
   * Configure CORS settings
   * Controls cross-origin resource sharing
   */
  static getCorsConfig() {
    const corsOptions = {
      origin: function (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
        // Allow requests with no origin (mobile apps, Postman, etc.)
        if (!origin) return callback(null, true);

        const allowedOrigins = process.env.CORS_ORIGIN?.split(',') || [
          'http://localhost:3000',
          'http://localhost:3001',
          'https://maysar.com',
          'https://admin.maysar.com'
        ];

        if (allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-Requested-With',
        'Accept',
        'Origin',
        'Access-Control-Request-Method',
        'Access-Control-Request-Headers',
        'X-API-Key',
        'X-Request-ID'
      ],
      exposedHeaders: [
        'X-Total-Count',
        'X-Rate-Limit-Remaining',
        'X-Rate-Limit-Reset'
      ],
      maxAge: 86400, // 24 hours
      optionsSuccessStatus: 200 // Some legacy browsers choke on 204
    };

    return cors(corsOptions);
  }

  /**
   * Configure compression middleware
   * Reduces response size for better performance
   */
  static getCompressionConfig() {
    return compression({
      level: 6, // Balanced compression level
      threshold: 1024, // Only compress responses > 1KB
      filter: (req: Request, res: Response) => {
        // Don't compress responses with this request header
        if (req.headers['x-no-compression']) {
          return false;
        }

        // Use compression filter function
        return compression.filter(req, res);
      }
    });
  }

  /**
   * Security headers middleware
   * Additional custom security headers
   */
  static securityHeaders() {
    return (req: Request, res: Response, next: NextFunction) => {
      // Remove server information
      res.removeHeader('X-Powered-By');

      // Add custom security headers
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('X-Frame-Options', 'DENY');
      res.setHeader('X-XSS-Protection', '1; mode=block');
      res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
      res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(self)');

      // API versioning header
      res.setHeader('X-API-Version', 'v1');

      // Request ID for tracing
      const requestId = req.headers['x-request-id'] || generateRequestId();
      res.setHeader('X-Request-ID', requestId);

      next();
    };
  }

  /**
   * Input sanitization middleware
   * Basic input cleaning before validation
   */
  static sanitizeInput() {
    return (req: Request, res: Response, next: NextFunction) => {
      // Sanitize query parameters
      if (req.query) {
        Object.keys(req.query).forEach(key => {
          if (typeof req.query[key] === 'string') {
            // Basic sanitization - remove potential script tags
            req.query[key] = (req.query[key] as string)
              .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
              .replace(/javascript:/gi, '')
              .trim();
          }
        });
      }

      // Sanitize body parameters for non-file uploads
      if (req.body && req.headers['content-type']?.includes('application/json')) {
        sanitizeObject(req.body);
      }

      next();
    };
  }
}

/**
 * Helper function to generate request IDs
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Recursive object sanitization
 */
function sanitizeObject(obj: any): void {
  if (typeof obj !== 'object' || obj === null) return;

  Object.keys(obj).forEach(key => {
    if (typeof obj[key] === 'string') {
      // Basic sanitization - remove potential script tags and dangerous patterns
      obj[key] = obj[key]
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+\s*=/gi, '') // Remove event handlers
        .trim();
    } else if (typeof obj[key] === 'object') {
      sanitizeObject(obj[key]);
    }
  });
}

/**
 * Combined security middleware stack
 * Apply all security middlewares in the correct order
 */
export const securityStack = [
  // Rate limiting (applied first for early rejection)
  RateLimitingMiddleware.routeBasedRateLimit(),

  // Security headers and configurations
  SecurityMiddleware.securityHeaders(),
  SecurityMiddleware.getHelmetConfig(),
  SecurityMiddleware.getCorsConfig(),
  SecurityMiddleware.getCompressionConfig(),

  // Input processing
  SecurityMiddleware.sanitizeInput(),
  ValidationMiddleware.sanitizeInput()
];

