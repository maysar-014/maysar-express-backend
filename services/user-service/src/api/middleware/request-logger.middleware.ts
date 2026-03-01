import { Request, Response, NextFunction } from 'express';
import { logger } from '../../infrastructure/services/logger.service';

/**
 * Request logging middleware
 * Logs all incoming HTTP requests with performance metrics
 */
export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
  const startTime = Date.now();
  const requestId = req.get('X-Request-ID') || generateRequestId();

  // Add request ID to response headers
  res.set('X-Request-ID', requestId);

  // Store request start time and ID for later use
  (req as any).startTime = startTime;
  (req as any).requestId = requestId;

  // Log the incoming request
  logger.info('Request Started', {
    requestId,
    method: req.method,
    url: req.url,
    path: req.path,
    query: req.query,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    forwardedFor: req.get('X-Forwarded-For'),
    contentLength: req.get('Content-Length'),
    contentType: req.get('Content-Type'),
    referer: req.get('Referer'),
    origin: req.get('Origin')
  });

  // Listen for response finish event to log response
  res.on('finish', () => {
    const endTime = Date.now();
    const duration = endTime - startTime;

    // Log the response
    const logData = {
      requestId: (req as any).requestId || req.get('X-Request-ID'),
      correlationId: (req as any).correlationId || req.get('X-Correlation-ID'),
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      executionTime: duration,
      userAgent: req.get('user-agent'),
      ip: req.ip
    };

    // Log based on status code
    if (res.statusCode >= 500) {
      logger.error('Request Completed with Server Error', logData);
    } else if (res.statusCode >= 400) {
      logger.warn('Request Completed with Client Error', logData);
    } else {
      logger.info('Request Completed', logData);
    }

    // Always log performance
    logger.logPerformance(`${req.method} ${req.route?.path || req.url}`, duration, {
      requestId: logData.requestId,
      correlationId: logData.correlationId
    });
  });

  next();
};

/**
 * Generate a unique request ID
 */
function generateRequestId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substr(2, 9);
  return `req_${timestamp}_${random}`;
}

/**
 * Middleware to add request ID to response if not present
 */
export const ensureRequestId = (req: Request, res: Response, next: NextFunction): void => {
  const requestId = req.get('X-Request-ID') || generateRequestId();
  res.set('X-Request-ID', requestId);
  (req as any).requestId = requestId;
  next();
};

/**
 * Middleware to log request body for debugging (development only)
 */
export const logRequestBody = (req: Request, _res: Response, next: NextFunction): void => {
  if (process.env.NODE_ENV === 'development' && req.body && Object.keys(req.body).length > 0) {
    logger.debug('Request Body', {
      requestId: (req as any).requestId,
      method: req.method,
      url: req.url,
      body: sanitizeRequestBody(req.body)
    });
  }
  next();
};

/**
 * Sanitize sensitive data from request body for logging
 */
function sanitizeRequestBody(body: any): any {
  if (!body || typeof body !== 'object') {
    return body;
  }

  const sanitized = { ...body };
  const sensitiveFields = [
    'password',
    'passwordHash',
    'token',
    'secret',
    'key',
    'authorization',
    'x-api-key'
  ];

  // Recursively sanitize sensitive fields
  function sanitize(obj: any): any {
    if (Array.isArray(obj)) {
      return obj.map(item => sanitize(item));
    }

    if (obj && typeof obj === 'object') {
      const result: any = {};
      for (const [key, value] of Object.entries(obj)) {
        if (sensitiveFields.includes(key.toLowerCase())) {
          result[key] = '[REDACTED]';
        } else {
          result[key] = sanitize(value);
        }
      }
      return result;
    }

    return obj;
  }

  return sanitize(sanitized);
}
