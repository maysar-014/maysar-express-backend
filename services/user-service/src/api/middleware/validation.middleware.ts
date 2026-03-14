import { Request, Response, NextFunction } from 'express';
import { createError } from './error.middleware';
import { logger } from '../../infrastructure/services/logger.service';

/**
 * Validation error response
 */
export interface ValidationError {
  field: string;
  message: string;
  value?: unknown;
}

/**
 * Validation result
 */
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

interface ValidationDetail {
  path: Array<string | number>;
  message: string;
  context?: { value?: unknown };
}

interface JoiLikeError {
  isJoi: boolean;
  details: ValidationDetail[];
}

interface ValidatableSchema {
  validate(value: unknown, options?: Record<string, unknown>): { error?: JoiLikeError; value: unknown };
}

/**
 * Request validation middleware factory
 */
export const validateRequest = (schema: ValidatableSchema) => {
  return (_req: Request, _res: Response, next: NextFunction) => {
    try {
      const { error, value } = schema.validate(_req.body, {
        abortEarly: false,
        stripUnknown: true,
        convert: true
      });

      if (error) {
        const errors: ValidationError[] = error.details.map((detail) => ({
          field: detail.path.join('.'),
          message: detail.message,
          value: detail.context?.value
        }));

        logger.warn('Request validation failed', {
          path: _req.path,
          method: _req.method,
          errors: errors.map(e => `${e.field}: ${e.message}`)
        });

        return next(createError.unprocessableEntity('Validation failed', 'VALIDATION_FAILED'));
      }

      // Replace request body with validated and sanitized data
      _req.body = value;
      next();
    } catch (err) {
      logger.error('Validation middleware error', { error: err, path: _req.path });
      next(createError.internalServerError('Validation processing failed'));
    }
  };
};

/**
 * Query parameter validation middleware
 */
export const validateQuery = (schema: ValidatableSchema) => {
  return (_req: Request, _res: Response, next: NextFunction) => {
    try {
      const { error, value } = schema.validate(_req.query, {
        abortEarly: false,
        stripUnknown: true,
        convert: true
      });

      if (error) {
        const errors: ValidationError[] = error.details.map((detail) => ({
          field: detail.path.join('.'),
          message: detail.message,
          value: detail.context?.value
        }));

        logger.warn('Query validation failed', {
          path: _req.path,
          method: _req.method,
          query: _req.query,
          errors: errors.map(e => `${e.field}: ${e.message}`)
        });

        return next(createError.badRequest('Invalid query parameters'));
      }

      // Replace query with validated and sanitized data
      _req.query = value as Request['query'];
      next();
    } catch (err) {
      logger.error('Query validation error', { error: err, path: _req.path });
      next(createError.internalServerError('Query validation failed'));
    }
  };
};

/**
 * Route parameter validation middleware
 */
export const validateParams = (schema: ValidatableSchema) => {
  return (_req: Request, _res: Response, next: NextFunction) => {
    try {
      const { error, value } = schema.validate(_req.params, {
        abortEarly: false,
        convert: true
      });

      if (error) {
        const errors: ValidationError[] = error.details.map((detail) => ({
          field: detail.path.join('.'),
          message: detail.message,
          value: detail.context?.value
        }));

        logger.warn('Parameter validation failed', {
          path: _req.path,
          method: _req.method,
          params: _req.params,
          errors: errors.map(e => `${e.field}: ${e.message}`)
        });

        return next(createError.badRequest('Invalid route parameters'));
      }

      // Replace params with validated data
      _req.params = value as Request['params'];
      next();
    } catch (err) {
      logger.error('Parameter validation error', { error: err, path: _req.path });
      next(createError.internalServerError('Parameter validation failed'));
    }
  };
};

/**
 * Global validation error handler
 */
export const validationErrorHandler = (
  error: unknown,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Handle Joi validation errors
  if (isJoiLikeError(error)) {
    const errors: ValidationError[] = error.details.map((detail) => ({
      field: detail.path.join('.'),
      message: detail.message,
      value: detail.context?.value
    }));

    logger.warn('Joi validation error', {
      path: req.path,
      method: req.method,
      errors: errors.map(e => `${e.field}: ${e.message}`)
    });

    res.status(422).json({
      error: {
        message: 'Validation failed',
        code: 'VALIDATION_FAILED',
        details: errors,
        timestamp: new Date().toISOString()
      }
    });
  }

  next(error);
};

/**
 * Sanitization middleware for request data
 */
export const sanitizeRequest = (req: Request, _res: Response, next: NextFunction) => {
  // Trim string fields in body
  if (req.body && typeof req.body === 'object') {
    sanitizeObject(req.body);
  }

  // Trim string fields in query
  if (req.query && typeof req.query === 'object') {
    sanitizeObject(req.query);
  }

  next();
};

/**
 * Recursively sanitize object fields
 */
function sanitizeObject(obj: Record<string, unknown>): void {
  for (const key in obj) {
    const value = obj[key];
    if (typeof value === 'string') {
      const trimmed = value.trim();
      // Remove potential XSS characters
      obj[key] = trimmed.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    } else if (typeof value === 'object' && value !== null) {
      sanitizeObject(value as Record<string, unknown>);
    }
  }
}

/**
 * File upload validation (placeholder for future implementation)
 */
export const validateFileUpload = (_options?: {
  maxSize?: number;
  allowedTypes?: string[];
  required?: boolean;
}) => {
  return (_req: Request, _res: Response, next: NextFunction) => {
    // File upload validation logic would go here
    // This is a placeholder for future implementation
    next();
  };
};

/**
 * Authentication validation middleware (placeholder)
 */
export const validateAuth = (_options?: {
  required?: boolean;
  roles?: string[];
}) => {
  return (_req: Request, _res: Response, next: NextFunction) => {
    // Authentication validation logic would go here
    // This is a placeholder - in a real implementation, this would validate JWT tokens
    // and set req.user with user information

    // For now, we'll assume authentication is handled elsewhere
    next();
  };
};

/**
 * Authorization middleware for role-based access
 */
export const requireRole = (...allowedRoles: string[]) => {
  return (_req: Request, _res: Response, next: NextFunction) => {
    const user = extractUserInfo(_req.user);

    if (!user) {
      return next(createError.unauthorized('Authentication required'));
    }

    if (!allowedRoles.includes(user.role)) {
      logger.warn('Access denied due to insufficient role', {
        userId: user.id,
        userRole: user.role,
        requiredRoles: allowedRoles,
        path: _req.path
      });

      return next(createError.forbidden('Insufficient permissions'));
    }

    next();
  };
};

/**
 * Ownership validation middleware
 */
export const validateOwnership = (resourceIdParam: string) => {
  return (_req: Request, _res: Response, next: NextFunction) => {
    const user = extractUserInfo(_req.user);
    const resourceId = _req.params[resourceIdParam];

    if (!user) {
      return next(createError.unauthorized('Authentication required'));
    }

    // Check if user owns the resource
    // This is a placeholder - actual ownership validation would depend on the resource
    const userOwnsResource = user.id === resourceId || user.role === 'SYSTEM';

    if (!userOwnsResource) {
      logger.warn('Access denied due to ownership mismatch', {
        userId: user.id,
        resourceId,
        path: _req.path
      });

      return next(createError.forbidden('Access denied'));
    }

    next();
  };
};

/**
 * Rate limiting validation (additional checks beyond rate limiting)
 */
export const validateRateLimit = (_options?: {
  maxRequests?: number;
  windowMs?: number;
  keyGenerator?: (req: Request) => string;
}) => {
  return (_req: Request, _res: Response, next: NextFunction) => {
    // Additional rate limit validation logic
    // This could check for suspicious patterns or whitelist/blacklist
    next();
  };
};

/**
 * Input sanitization for SQL injection prevention
 */
export const sanitizeSqlInput = (req: Request, _res: Response, next: NextFunction) => {
  // Additional SQL injection prevention
  // This is a safety net - the main protection should be in the repository layer

  const dangerousPatterns = [
    /(\bUNION\b|\bSELECT\b|\bINSERT\b|\bUPDATE\b|\bDELETE\b|\bDROP\b|\bCREATE\b|\bALTER\b)/i,
    /(-{2}|\/\*|\*\/)/,
    /('|(\\x27)|(\\x2D))/i
  ];

  const checkForDangerousInput = (input: unknown): boolean => {
    if (typeof input === 'string') {
      return dangerousPatterns.some(pattern => pattern.test(input));
    } else if (Array.isArray(input)) {
      return input.some(item => checkForDangerousInput(item));
    } else if (typeof input === 'object' && input !== null) {
      return Object.values(input).some(value => checkForDangerousInput(value));
    }
    return false;
  };

  if (checkForDangerousInput(req.body) || checkForDangerousInput(req.query)) {
    logger.warn('Potentially dangerous input detected', {
      ip: req.ip,
        path: req.path,
      userAgent: req.get('User-Agent')
    });

    return next(createError.badRequest('Invalid input detected'));
  }

  next();
};

function isJoiLikeError(error: unknown): error is JoiLikeError {
  if (typeof error !== 'object' || error === null) {
    return false;
  }

  const candidate = error as Partial<JoiLikeError>;
  return Boolean(candidate.isJoi) && Array.isArray(candidate.details);
}

function extractUserInfo(user: unknown): { id: string; role: string } | null {
  if (typeof user !== 'object' || user === null) {
    return null;
  }

  const userRecord = user as Record<string, unknown>;
  const id = typeof userRecord.id === 'string' ? userRecord.id : undefined;
  const role = typeof userRecord.role === 'string' ? userRecord.role : undefined;

  if (!id || !role) {
    return null;
  }

  return { id, role };
}
