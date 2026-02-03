import { Request, Response, NextFunction } from 'express';
import { logger } from '../../infrastructure/services/logger.service';

/**
 * Request logging middleware
 * Logs all incoming requests with correlation IDs and timing information
 */
export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
  const startTime = Date.now();
  const requestId = req.headers['x-request-id'] || generateRequestId();
  
  // Add request ID to headers for downstream services
  res.setHeader('X-Request-ID', requestId as string);
  
  // Log request start
  logger.info('Request started', {
    requestId,
    method: req.method,
    url: req.url,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    timestamp: new Date().toISOString()
  });

  // Capture original end function
  const originalEnd = res.end;
  
  // Override res.end to log response
  res.end = function(chunk?: any, encoding?: any) {
    const duration = Date.now() - startTime;
    
    logger.info('Request completed', {
      requestId,
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      contentLength: res.get('Content-Length'),
      timestamp: new Date().toISOString()
    });

    // Call original end function
    originalEnd.call(this, chunk, encoding);
    return this;
  };

  next();
};

/**
 * Generate a unique request ID
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Security event logger middleware
 * Logs security-related events for audit purposes
 */
export const securityLogger = (req: Request, res: Response, next: NextFunction): void => {
  const securityEvents: string[] = [];

  // Log authentication attempts
  if (req.headers.authorization) {
    securityEvents.push('AUTH_TOKEN_PRESENT');
  }

  // Log potential security issues
  if (req.headers['x-forwarded-for']) {
    securityEvents.push('PROXY_REQUEST');
  }

  if (req.headers['x-real-ip']) {
    securityEvents.push('REAL_IP_HEADER');
  }

  // Log after response
  const originalEnd = res.end;
  res.end = function(chunk?: any, encoding?: any) {
    if (securityEvents.length > 0) {
      logger.warn('Security events detected', {
        requestId: req.headers['x-request-id'],
        method: req.method,
        url: req.url,
        statusCode: res.statusCode,
        events: securityEvents,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        timestamp: new Date().toISOString()
      });
    }
    originalEnd.call(this, chunk, encoding);
    return this;
  };

  next();
};

/**
 * Performance monitoring middleware
 * Tracks request performance and identifies slow operations
 */
export const performanceLogger = (req: Request, res: Response, next: NextFunction): void => {
  const startTime = process.hrtime.bigint();
  const startMemory = process.memoryUsage();

  const originalEnd = res.end;
  res.end = function(chunk?: any, encoding?: any) {
    const endTime = process.hrtime.bigint();
    const endMemory = process.memoryUsage();
    
    const duration = Number(endTime - startTime) / 1000000; // Convert to milliseconds
    const memoryDelta = {
      rss: endMemory.rss - startMemory.rss,
      heapUsed: endMemory.heapUsed - startMemory.heapUsed,
      heapTotal: endMemory.heapTotal - startMemory.heapTotal,
      external: endMemory.external - startMemory.external
    };

    // Log slow requests
    if (duration > 1000) {
      logger.warn('Slow request detected', {
        requestId: req.headers['x-request-id'],
        method: req.method,
        url: req.url,
        duration: `${duration.toFixed(2)}ms`,
        memoryDelta,
        timestamp: new Date().toISOString()
      });
    }

    // Log memory usage for all requests in development
    if (process.env.NODE_ENV === 'development') {
      logger.debug('Request performance metrics', {
        requestId: req.headers['x-request-id'],
        method: req.method,
        url: req.url,
        duration: `${duration.toFixed(2)}ms`,
        memoryDelta,
        timestamp: new Date().toISOString()
      });
    }

    originalEnd.call(this, chunk, encoding);
    return this;
  };

  next();
};