/**
 * Request Validation Middleware
 * Comprehensive request validation with security hardening and performance optimization
 * Implements input sanitization, schema validation, and security checks
 */

import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { createHash } from 'crypto';
import { isSystemId } from '@shared/ids/id';

// =====================================================================================
// VALIDATION CONFIGURATION
// =====================================================================================

/**
 * Validation Configuration
 */
export interface ValidationConfig {
  enableSanitization: boolean;
  enableSecurityChecks: boolean;
  enableRateLimiting: boolean;
  maxRequestSize: number;
  allowedContentTypes: string[];
  enableRequestLogging: boolean;
}

/**
 * Default Validation Configuration
 */
export const DEFAULT_VALIDATION_CONFIG: ValidationConfig = {
  enableSanitization: true,
  enableSecurityChecks: true,
  enableRateLimiting: true,
  maxRequestSize: 10 * 1024 * 1024, // 10MB
  allowedContentTypes: [
    'application/json',
    'application/x-www-form-urlencoded',
    'multipart/form-data'
  ],
  enableRequestLogging: true
};

// =====================================================================================
// SECURITY VALIDATION SCHEMAS
// =====================================================================================

/**
 * Common Security Validation Schemas
 */
export const SecuritySchemas = {
  /**
   * ID Validation
   */
  uuid: z.string().refine(isSystemId, 'Invalid ID format'),

  /**
   * Email Validation with Security Checks
   */
  email: z.string()
    .min(1, 'Email is required')
    .max(254, 'Email too long')
    .email('Invalid email format')
    .refine(
      (email) => !/<script/i.test(email) && !/javascript:/i.test(email),
      'Email contains malicious content'
    ),

  /**
   * Password Validation
   */
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password too long')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain uppercase, lowercase, and number'),

  /**
   * Safe String Validation (XSS Protection)
   */
  safeString: z.string()
    .max(10000, 'Text too long')
    .refine(
      (str) => !/<script/i.test(str) && !/javascript:/i.test(str) && !/on\w+=/i.test(str),
      'Input contains potentially malicious content'
    ),

  /**
   * URL Validation
   */
  url: z.string()
    .url('Invalid URL format')
    .refine(
      (url) => {
        try {
          const parsedUrl = new URL(url);
          // Block localhost and internal IPs in production
          if (process.env.NODE_ENV === 'production') {
            const hostname = parsedUrl.hostname.toLowerCase();
            if (hostname === 'localhost' || hostname === '127.0.0.1' ||
                hostname.startsWith('192.168.') || hostname.startsWith('10.') ||
                hostname.startsWith('172.')) {
              return false;
            }
          }
          return true;
        } catch {
          return false;
        }
      },
      'URL contains restricted hostname'
    ),

  /**
   * Numeric ID Validation
   */
  numericId: z.string()
    .regex(/^\d+$/, 'Must be a valid numeric ID')
    .transform((val) => parseInt(val, 10))
    .refine((val) => val > 0, 'ID must be positive'),

  /**
   * Pagination Parameters
   */
  pagination: z.object({
    page: z.string().regex(/^\d+$/).transform(Number).refine(n => n >= 1).optional(),
    limit: z.string().regex(/^\d+$/).transform(Number).refine(n => n >= 1 && n <= 1000).optional(),
    sortBy: z.string().max(50).optional(),
    sortOrder: z.enum(['asc', 'desc']).optional()
  }).optional()
};

// =====================================================================================
// REQUEST VALIDATION MIDDLEWARE
// =====================================================================================

/**
 * Request Size Validation Middleware
 */
export function validateRequestSize(config: Partial<ValidationConfig> = {}) {
  const { maxRequestSize } = { ...DEFAULT_VALIDATION_CONFIG, ...config };

  return (req: Request, res: Response, next: NextFunction) => {
    const contentLength = parseInt(req.headers['content-length'] || '0', 10);

    if (contentLength > maxRequestSize) {
      return res.status(413).json({
        success: false,
        error: {
          code: 'PAYLOAD_TOO_LARGE',
          message: `Request payload too large. Maximum allowed: ${maxRequestSize} bytes`
        }
      });
    }

    next();
  };
}

/**
 * Content Type Validation Middleware
 */
export function validateContentType(config: Partial<ValidationConfig> = {}) {
  const { allowedContentTypes } = { ...DEFAULT_VALIDATION_CONFIG, ...config };

  return (req: Request, res: Response, next: NextFunction) => {
    const contentType = req.headers['content-type']?.split(';')[0]?.toLowerCase();

    if (req.method !== 'GET' && req.method !== 'HEAD' && contentType &&
        !allowedContentTypes.some(type => contentType.includes(type))) {
      return res.status(415).json({
        success: false,
        error: {
          code: 'UNSUPPORTED_MEDIA_TYPE',
          message: `Content-Type '${contentType}' not supported. Allowed: ${allowedContentTypes.join(', ')}`
        }
      });
    }

    next();
  };
}

/**
 * Input Sanitization Middleware
 */
export function sanitizeInput(config: Partial<ValidationConfig> = {}) {
  const { enableSanitization } = { ...DEFAULT_VALIDATION_CONFIG, ...config };

  return (req: Request, res: Response, next: NextFunction) => {
    if (!enableSanitization) {
      return next();
    }

    // Sanitize query parameters
    if (req.query) {
      Object.keys(req.query).forEach(key => {
        if (typeof req.query[key] === 'string') {
          req.query[key] = sanitizeString(req.query[key] as string);
        }
      });
    }

    // Sanitize body parameters (for non-multipart requests)
    if (req.body && typeof req.body === 'object' && !req.is('multipart/*')) {
      req.body = sanitizeObject(req.body);
    }

    // Sanitize route parameters
    if (req.params) {
      Object.keys(req.params).forEach(key => {
        req.params[key] = sanitizeString(req.params[key]);
      });
    }

    next();
  };
}

/**
 * Security Headers Validation Middleware
 */
export function validateSecurityHeaders(config: Partial<ValidationConfig> = {}) {
  const { enableSecurityChecks } = { ...DEFAULT_VALIDATION_CONFIG, ...config };

  return (req: Request, res: Response, next: NextFunction) => {
    if (!enableSecurityChecks) {
      return next();
    }

    const violations: string[] = [];

    // Check for suspicious headers
    const suspiciousHeaders = [
      'x-forwarded-host',
      'x-forwarded-scheme',
      'x-real-ip'
    ];

    suspiciousHeaders.forEach(header => {
      if (req.headers[header]) {
        violations.push(`Suspicious header detected: ${header}`);
      }
    });

    // Check for overly long headers
    Object.entries(req.headers).forEach(([key, value]) => {
      if (typeof value === 'string' && value.length > 10000) {
        violations.push(`Header too long: ${key}`);
      }
    });

    // Check for SQL injection patterns in common fields
    const sqlPatterns = /(\bUNION\b|\bSELECT\b|\bINSERT\b|\bUPDATE\b|\bDELETE\b|\bDROP\b|\bEXEC\b)/i;
    const checkFields = [req.url, req.headers.referer, req.headers['user-agent']];

    checkFields.forEach(field => {
      if (field && sqlPatterns.test(field)) {
        violations.push('Potential SQL injection detected');
      }
    });

    if (violations.length > 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'SECURITY_VIOLATION',
          message: 'Request blocked due to security violations',
          details: violations
        }
      });
    }

    next();
  };
}

/**
 * Request Fingerprinting Middleware
 * Creates a unique fingerprint for request deduplication and rate limiting
 */
export function createRequestFingerprint(config: Partial<ValidationConfig> = {}) {
  const { enableRequestLogging } = { ...DEFAULT_VALIDATION_CONFIG, ...config };

  return (req: Request, res: Response, next: NextFunction) => {
    const fingerprint = createHash('sha256')
      .update(`${req.ip}-${req.method}-${req.originalUrl}-${Date.now()}`)
      .digest('hex');

    (req as any).fingerprint = fingerprint;

    if (enableRequestLogging) {
      console.log(`[VALIDATION] Request fingerprint: ${fingerprint.substring(0, 8)}`);
    }

    next();
  };
}

/**
 * Comprehensive Request Validation Middleware
 * Combines all validation layers
 */
export function createValidationMiddleware(config: Partial<ValidationConfig> = {}) {
  const finalConfig = { ...DEFAULT_VALIDATION_CONFIG, ...config };

  return [
    validateRequestSize(finalConfig),
    validateContentType(finalConfig),
    sanitizeInput(finalConfig),
    validateSecurityHeaders(finalConfig),
    createRequestFingerprint(finalConfig)
  ];
}

interface LegacyFieldSchema {
  required?: boolean;
  // Allow widened string literals from legacy tests while still validating known values at runtime.
  type?: 'string' | 'number' | 'boolean' | 'array' | string;
  format?: 'email' | 'uuid' | string;
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  custom?: (value: string) => string | null;
}

interface LegacyRequestSchema {
  body?: Record<string, LegacyFieldSchema>;
  query?: Record<string, LegacyFieldSchema>;
  params?: Record<string, LegacyFieldSchema>;
}

interface LegacyValidatorOptions {
  sanitize?: boolean;
  allowUnknown?: boolean;
  stripUnknown?: boolean;
}

// =====================================================================================
// SCHEMA VALIDATION HELPERS
// =====================================================================================

/**
 * Validate Request Against Schema
 */
export function validateRequest<T>(
  schema: z.ZodSchema<T>,
  source?: 'body' | 'query' | 'params'
): (req: Request, res: Response, next: NextFunction) => void;
export function validateRequest(
  schema: LegacyRequestSchema
): (req: Request, res: Response, next: NextFunction) => void;
export function validateRequest<T>(
  schema: z.ZodSchema<T> | LegacyRequestSchema,
  source: 'body' | 'query' | 'params' = 'body'
) {
  if (!(schema instanceof z.ZodType)) {
    return validateLegacyRequest(schema, { sanitize: true, allowUnknown: false, stripUnknown: false });
  }

  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = req[source];
      const parser = typeof (schema as z.ZodSchema<T> & { strict?: () => z.ZodSchema<T> }).strict === 'function'
        ? (schema as z.ZodSchema<T> & { strict: () => z.ZodSchema<T> }).strict()
        : schema;
      const validatedData = parser.parse(data);

      // Replace the original data with validated/sanitized data
      req[source] = validatedData;

      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Request validation failed',
            details: error.issues.map((err: any) => ({
              field: err.path.join('.'),
              message: err.message
            }))
          }
        });
      }

      next(error);
    }
  };
}

function validateLegacyRequest(
  schema: LegacyRequestSchema,
  options: LegacyValidatorOptions
): (req: Request, res: Response, next: NextFunction) => void {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const details: string[] = [];
      (['body', 'query', 'params'] as const).forEach((section) => {
        const sectionSchema = schema[section];
        if (!sectionSchema) return;

        const sourceData = (req[section] ?? {}) as Record<string, unknown>;

        if (options.stripUnknown && !options.allowUnknown) {
          Object.keys(sourceData).forEach((key) => {
            if (!sectionSchema[key]) {
              delete sourceData[key];
            }
          });
        } else if (!options.allowUnknown) {
          Object.keys(sourceData).forEach((key) => {
            if (!sectionSchema[key]) {
              details.push(`${key} is not allowed`);
            }
          });
        }

        Object.entries(sectionSchema).forEach(([field, fieldSchema]) => {
          const rawValue = sourceData[field];
          const hasValue = rawValue !== undefined && rawValue !== null && rawValue !== '';

          if (fieldSchema.required && !hasValue) {
            details.push(`${field} is required`);
            return;
          }

          if (!hasValue) return;

          let value = rawValue;
          if (options.sanitize && typeof value === 'string') {
            value = value.trim();
            sourceData[field] = value;
          }

          if (fieldSchema.type === 'number') {
            const numberValue = typeof value === 'number' ? value : Number(value);
            if (Number.isNaN(numberValue)) {
              details.push(`${field} must be a number`);
              return;
            }
            value = numberValue;
            sourceData[field] = numberValue;
          }

          if (fieldSchema.type === 'boolean') {
            if (typeof value !== 'boolean' && value !== 'true' && value !== 'false') {
              details.push(`${field} must be a boolean`);
              return;
            }
            sourceData[field] = value === true || value === 'true';
          }

          if (fieldSchema.type === 'array' && !Array.isArray(value)) {
            details.push(`${field} must be an array`);
            return;
          }

          if (fieldSchema.type === 'string' && typeof value !== 'string') {
            details.push(`${field} must be a string`);
            return;
          }

          if (typeof value === 'string') {
            if (fieldSchema.minLength !== undefined && value.length < fieldSchema.minLength) {
              details.push(`${field} must be at least ${fieldSchema.minLength} characters`);
            }
            if (fieldSchema.maxLength !== undefined && value.length > fieldSchema.maxLength) {
              details.push(`${field} must be at most ${fieldSchema.maxLength} characters`);
            }
            if (fieldSchema.format === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
              details.push(`${field} must be a valid email`);
            }
            if (fieldSchema.format === 'uuid' && !isSystemId(value)) {
              details.push(`${field} must be a valid ID`);
            }
            if (fieldSchema.custom) {
              const customError = fieldSchema.custom(value);
              if (customError) {
                details.push(customError);
              }
            }
          }

          if (typeof value === 'number') {
            if (fieldSchema.min !== undefined && value < fieldSchema.min) {
              details.push(`${field} must be greater than or equal to ${fieldSchema.min}`);
            }
            if (fieldSchema.max !== undefined && value > fieldSchema.max) {
              details.push(`${field} must be less than or equal to ${fieldSchema.max}`);
            }
          }
        });
      });

      if (details.length > 0) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Request validation failed',
            details
          },
          meta: {
            timestamp: new Date()
          }
        });
        return;
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Async Schema Validation
 */
export async function validateRequestAsync<T>(
  schema: z.ZodSchema<T>,
  source: 'body' | 'query' | 'params' = 'body'
) {
  return (req: Request, res: Response, next: NextFunction) => {
    (async () => {
      try {
        const data = req[source];
        const validatedData = await schema.parseAsync(data);
        req[source] = validatedData;
        next();
      } catch (error) {
        if (error instanceof z.ZodError) {
          return res.status(400).json({
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Request validation failed',
              details: error.issues.map((err: any) => ({
                field: err.path.join('.'),
                message: err.message
              }))
            }
          });
        }
        next(error);
      }
    })();
  };
}

// =====================================================================================
// UTILITY FUNCTIONS
// =====================================================================================

/**
 * Sanitize String Input
 */
function sanitizeString(str: string): string {
  return str
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
    .trim();
}

/**
 * Sanitize Object Recursively
 */
function sanitizeObject(obj: any): any {
  if (typeof obj === 'string') {
    return sanitizeString(obj);
  }

  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }

  if (obj && typeof obj === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      sanitized[key] = sanitizeObject(value);
    }
    return sanitized;
  }

  return obj;
}

/**
 * Validation Middleware Factory
 * Creates pre-configured validation middleware
 */
export class ValidationMiddlewareFactory {
  static createBasicValidation(config: Partial<ValidationConfig> = {}) {
    return createValidationMiddleware(config);
  }

  static createStrictValidation(config: Partial<ValidationConfig> = {}) {
    return createValidationMiddleware({
      ...config,
      enableSanitization: true,
      enableSecurityChecks: true,
      enableRateLimiting: true,
      maxRequestSize: 5 * 1024 * 1024 // 5MB for strict mode
    });
  }

  static createLenientValidation(config: Partial<ValidationConfig> = {}) {
    return createValidationMiddleware({
      ...config,
      enableSanitization: false,
      enableSecurityChecks: false,
      maxRequestSize: 50 * 1024 * 1024 // 50MB for lenient mode
    });
  }
}

export function createValidator(options: LegacyValidatorOptions = {}) {
  return (schema: LegacyRequestSchema) =>
    validateLegacyRequest(schema, {
      sanitize: options.sanitize ?? true,
      allowUnknown: options.allowUnknown ?? false,
      stripUnknown: options.stripUnknown ?? false
    });
}
