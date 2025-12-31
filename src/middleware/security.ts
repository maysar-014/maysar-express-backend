import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import express from 'express';

// Rate limiting configurations
const createRateLimit = (
  windowMs: number,
  max: number,
  message: string,
  skipSuccessfulRequests = false
) => {
  return rateLimit({
    windowMs,
    max,
    message: {
      error: 'Too many requests',
      message,
      retryAfter: Math.ceil(windowMs / 1000)
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests,
    skip: (req) => {
      // Skip rate limiting for health checks
      return req.path === '/health' || req.path === '/api/v1/health';
    }
  });
};

// General API rate limiting
export const apiLimiter = createRateLimit(
  15 * 60 * 1000, // 15 minutes
  100, // limit each IP to 100 requests per windowMs
  'Too many requests from this IP, please try again after 15 minutes.'
);

// Strict rate limiting for authentication endpoints
export const authLimiter = createRateLimit(
  15 * 60 * 1000, // 15 minutes
  5, // limit each IP to 5 requests per windowMs
  'Too many authentication attempts, please try again after 15 minutes.',
  true // skip successful requests
);

// Rate limiting for sensitive operations
export const sensitiveOperationLimiter = createRateLimit(
  60 * 1000, // 1 minute
  10, // limit each IP to 10 requests per minute
  'Too many sensitive operations, please try again after 1 minute.'
);

// CORS configuration
export const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);

    const allowedOrigins = process.env.ALLOWED_ORIGINS
      ? process.env.ALLOWED_ORIGINS.split(',')
      : ['http://localhost:3000', 'http://localhost:3001'];

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin'
  ],
  exposedHeaders: ['X-Total-Count', 'X-Rate-Limit-Remaining'],
  maxAge: 86400 // 24 hours
};

// Helmet configuration for security headers
export const helmetConfig = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://api.stripe.com", "https://js.stripe.com"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
  crossOriginEmbedderPolicy: false, // Disable for API compatibility
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  },
  noSniff: true,
  xssFilter: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
});

// Request size limits
export const requestLimits = {
  json: express.json({
    limit: process.env.REQUEST_SIZE_LIMIT || '10mb',
    strict: true,
    verify: (req: express.Request, res: express.Response, buf: Buffer) => {
      // Custom JSON verification if needed
      try {
        JSON.parse(buf.toString());
      } catch (e) {
        res.status(400).json({
          error: 'Invalid JSON',
          message: 'The request body contains invalid JSON.'
        });
        throw new Error('Invalid JSON');
      }
    }
  }),
  urlencoded: express.urlencoded({
    limit: process.env.REQUEST_SIZE_LIMIT || '10mb',
    extended: true,
    parameterLimit: 1000
  }),
  text: express.text({
    limit: process.env.REQUEST_SIZE_LIMIT || '1mb'
  }),
  raw: express.raw({
    limit: process.env.REQUEST_SIZE_LIMIT || '10mb'
  })
};

// Security headers middleware
export const securityHeaders = (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) => {
  // Additional security headers not covered by Helmet
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');

  // Remove server information
  res.removeHeader('X-Powered-By');

  // Add request ID for tracing
  const requestId = req.headers['x-request-id'] || `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  res.setHeader('X-Request-ID', requestId);
  (req as any).requestId = requestId;

  next();
};

// Request logging middleware (basic)
export const requestLogger = (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) => {
  const start = Date.now();
  const timestamp = new Date().toISOString();

  // Log request
  console.log(`[${timestamp}] ${req.method} ${req.originalUrl} - IP: ${req.ip}`);

  // Log response
  res.on('finish', () => {
    const duration = Date.now() - start;
    const statusCode = res.statusCode;
    const statusColor = statusCode >= 400 ? '\x1b[31m' : statusCode >= 300 ? '\x1b[33m' : '\x1b[32m';
    const resetColor = '\x1b[0m';

    console.log(`[${new Date().toISOString()}] ${statusColor}${req.method} ${req.originalUrl} ${statusCode}${resetColor} - ${duration}ms`);
  });

  next();
};

// Input sanitization middleware
export const inputSanitizer = (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) => {
  // Basic input sanitization
  const sanitizeString = (str: string) => {
    if (typeof str !== 'string') return str;
    // Remove potentially dangerous characters
    return str.replace(/[<>'"&]/g, '');
  };

  const sanitizeObject = (obj: any): any => {
    if (typeof obj === 'string') {
      return sanitizeString(obj);
    } else if (Array.isArray(obj)) {
      return obj.map(sanitizeObject);
    } else if (obj && typeof obj === 'object') {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(obj)) {
        sanitized[key] = sanitizeObject(value);
      }
      return sanitized;
    }
    return obj;
  };

  // Sanitize request body, query, and params
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObject(req.body);
  }

  if (req.query && typeof req.query === 'object') {
    req.query = sanitizeObject(req.query);
  }

  if (req.params && typeof req.params === 'object') {
    req.params = sanitizeObject(req.params);
  }

  next();
};

// Complete security middleware stack
export const securityMiddleware = [
  // Request logging (first)
  requestLogger,

  // Security headers
  helmetConfig,
  securityHeaders,

  // CORS
  cors(corsOptions),

  // Rate limiting
  apiLimiter,

  // Request parsing with size limits
  requestLimits.json,
  requestLimits.urlencoded,

  // Input sanitization
  inputSanitizer
];

// Specialized middleware stacks for different routes
export const authSecurityMiddleware = [
  requestLogger,
  helmetConfig,
  securityHeaders,
  cors(corsOptions),
  authLimiter, // Stricter rate limiting for auth
  requestLimits.json,
  requestLimits.urlencoded,
  inputSanitizer
];

export const adminSecurityMiddleware = [
  requestLogger,
  helmetConfig,
  securityHeaders,
  cors(corsOptions),
  sensitiveOperationLimiter, // Stricter rate limiting for admin operations
  requestLimits.json,
  requestLimits.urlencoded,
  inputSanitizer
];
