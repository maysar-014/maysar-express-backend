import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';

export interface ValidationError {
  field: string;
  message: string;
  value?: any;
  location?: string;
}

export interface ValidationErrorResponse {
  success: false;
  error: {
    type: 'VALIDATION_ERROR';
    message: string;
    details: ValidationError[];
    timestamp: string;
    requestId?: string;
  };
}

export class ValidationMiddleware {
  /**
   * Middleware to handle validation errors from express-validator
   * Transforms validation errors into a standardized API response format
   */
  static handleValidationErrors(req: Request, res: Response, next: NextFunction): void {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      const validationErrors: ValidationError[] = errors.array().map(error => ({
        field: (error as any).param || (error as any).path || 'unknown',
        message: error.msg,
        value: (error as any).value,
        location: (error as any).location
      }));

      const errorResponse: ValidationErrorResponse = {
        success: false,
        error: {
          type: 'VALIDATION_ERROR',
          message: 'Input validation failed',
          details: validationErrors,
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] as string || undefined
        }
      };

      // Log validation errors for monitoring
      console.warn('Validation errors:', {
        method: req.method,
        path: req.path,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        errors: validationErrors,
        timestamp: errorResponse.error.timestamp
      });

      res.status(400).json(errorResponse);
      return;
    }

    next();
  }

  /**
   * Middleware to sanitize and normalize input data
   * Removes potentially harmful characters and normalizes data formats
   */
  static sanitizeInput(req: Request, res: Response, next: NextFunction): void {
    // Sanitize string fields from body, query, and params
    const sanitizeString = (value: any): any => {
      if (typeof value === 'string') {
        // Remove null bytes and other potentially harmful characters
        return value.replace(/[\x00-\x1F\x7F-\x9F]/g, '').trim();
      }
      return value;
    };

    const sanitizeObject = (obj: any): any => {
      if (Array.isArray(obj)) {
        return obj.map(item => sanitizeObject(item));
      } else if (obj !== null && typeof obj === 'object') {
        const sanitized: any = {};
        for (const [key, value] of Object.entries(obj)) {
          sanitized[key] = sanitizeObject(value);
        }
        return sanitized;
      } else {
        return sanitizeString(obj);
      }
    };

    // Sanitize request data
    req.body = sanitizeObject(req.body);
    req.query = sanitizeObject(req.query);
    req.params = sanitizeObject(req.params);

    next();
  }

  /**
   * Middleware to validate content type for JSON requests
   */
  static validateContentType(req: Request, res: Response, next: NextFunction): void {
    const contentType = req.get('content-type');

    // Check if request has body and should be JSON
    if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.body && Object.keys(req.body).length > 0) {
      if (!contentType || !contentType.includes('application/json')) {
        const errorResponse: ValidationErrorResponse = {
          success: false,
          error: {
            type: 'VALIDATION_ERROR',
            message: 'Content-Type must be application/json for requests with body',
            details: [{
              field: 'content-type',
              message: 'Missing or invalid Content-Type header',
              value: contentType,
              location: 'headers'
            }],
            timestamp: new Date().toISOString(),
            requestId: req.headers['x-request-id'] as string || undefined
          }
        };

        res.status(400).json(errorResponse);
        return;
      }
    }

    next();
  }

  /**
   * Middleware to validate request size limits
   */
  static validateRequestSize(maxSize: string = '10mb') {
    return (req: Request, res: Response, next: NextFunction): void => {
      const contentLength = parseInt(req.get('content-length') || '0');

      if (contentLength > parseSize(maxSize)) {
        const errorResponse: ValidationErrorResponse = {
          success: false,
          error: {
            type: 'VALIDATION_ERROR',
            message: 'Request size exceeds limit',
            details: [{
              field: 'content-length',
              message: `Request size ${contentLength} bytes exceeds maximum allowed size ${maxSize}`,
              value: contentLength,
              location: 'headers'
            }],
            timestamp: new Date().toISOString(),
            requestId: req.headers['x-request-id'] as string || undefined
          }
        };

        res.status(413).json(errorResponse);
        return;
      }

      next();
    };
  }

  /**
   * Middleware to validate API versioning
   */
  static validateApiVersion(req: Request, res: Response, next: NextFunction): void {
    const acceptHeader = req.get('accept') || '';
    const apiVersion = req.headers['api-version'] as string;

    // Check for API version in header or accept header
    if (!apiVersion && !acceptHeader.includes('application/vnd.maysar.v')) {
      // Allow requests without version for backward compatibility
      // but log for monitoring
      console.info('API version not specified:', {
        method: req.method,
        path: req.path,
        headers: {
          'api-version': apiVersion,
          'accept': acceptHeader
        }
      });
    }

    next();
  }

  /**
   * Middleware to validate rate limits (placeholder for actual implementation)
   */
  static validateRateLimit(req: Request, res: Response, next: NextFunction): void {
    // This would typically integrate with a rate limiting library
    // For now, just pass through
    next();
  }

  /**
   * Middleware to validate authentication/authorization
   */
  static validateAuthentication(req: Request, res: Response, next: NextFunction): void {
    // Extract and validate JWT token
    const authHeader = req.get('authorization');
    const token = req.headers['x-api-token'] as string;

    if (!authHeader && !token) {
      // For now, allow unauthenticated requests but log
      console.warn('Unauthenticated request:', {
        method: req.method,
        path: req.path,
        ip: req.ip
      });
    }

    // TODO: Implement actual JWT validation
    // if (!isValidToken) {
    //   return res.status(401).json({ error: 'Invalid or missing authentication token' });
    // }

    next();
  }

  /**
   * Combined middleware for API endpoints
   * Applies all necessary validation middleware in correct order
   */
  static createApiValidationChain() {
    return [
      ValidationMiddleware.validateContentType,
      ValidationMiddleware.sanitizeInput,
      ValidationMiddleware.validateApiVersion,
      ValidationMiddleware.validateAuthentication,
      ValidationMiddleware.validateRateLimit
    ];
  }

  /**
   * Middleware to log validation attempts for monitoring
   */
  static logValidationAttempts(req: Request, res: Response, next: NextFunction): void {
    const startTime = Date.now();

    // Log after response is sent
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      const statusCode = res.statusCode;

      console.info('Validation completed:', {
        method: req.method,
        path: req.path,
        statusCode,
        duration: `${duration}ms`,
        userAgent: req.get('User-Agent'),
        ip: req.ip
      });
    });

    next();
  }
}

/**
 * Helper function to parse size strings like '10mb', '5kb', etc.
 */
function parseSize(size: string): number {
  const units: { [key: string]: number } = {
    'b': 1,
    'kb': 1024,
    'mb': 1024 * 1024,
    'gb': 1024 * 1024 * 1024
  };

  const match = size.toLowerCase().match(/^(\d+(?:\.\d+)?)\s*(b|kb|mb|gb)?$/);
  if (!match) return 0;

  const value = parseFloat(match[1]);
  const unit = match[2] || 'b';

  return Math.floor(value * units[unit]);
}
