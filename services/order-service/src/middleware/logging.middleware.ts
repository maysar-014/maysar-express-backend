/**
 * Logging Middleware
 * Request/response logging and monitoring middleware
 */

import expressWinston from 'express-winston';
import { Request, Response, NextFunction } from 'express';
import { logger, logRequest, apiLogger, securityLogger, performanceLogger } from '../infrastructure/monitoring/logger';
import { metricsCollector } from '../infrastructure/monitoring/metrics';
import { loggingConfig } from '../config/monitoring.config';

/**
 * Request logging middleware
 * Logs all incoming requests with structured data
 */
export const requestLoggingMiddleware = expressWinston.logger({
  winstonInstance: logger,
  meta: true,
  msg: 'HTTP {{req.method}} {{req.url}}',
  expressFormat: false,
  colorize: loggingConfig.colorize,
  ignoreRoute: (req: Request) => {
    // Don't log health check requests to reduce noise
    const ignoredRoutes = ['/health', '/health/ping', '/health/live', '/health/ready'];
    return ignoredRoutes.some(route => req.path.startsWith(route));
  },
  requestWhitelist: ['method', 'url', 'headers.user-agent', 'ip', 'body'],
  responseWhitelist: ['statusCode', 'headers'],
  bodyWhitelist: [], // Don't log request bodies for security
  bodyBlacklist: ['password', 'newPassword', 'confirmPassword', 'currentPassword', 'token', 'secret', 'key', 'accessToken', 'refreshToken', 'authorization'],
  dynamicMeta: (req: any, res: any) => {
    const meta: any = {};

    // Add user information if available
    if ((req as any).user) {
      meta.userId = (req as any).user.id;
      meta.userRole = (req as any).user.role;
    }

    // Add request ID for tracing
    meta.requestId = req.get('X-Request-ID') || req.get('x-request-id');

    // Add client information
    meta.clientIP = req.ip;
    meta.userAgent = req.get('User-Agent');

    // Add performance timing
    meta.requestStartTime = Date.now();

    return meta;
  },
});

/**
 * Error logging middleware
 * Logs errors with additional context
 */
export const errorLoggingMiddleware = expressWinston.errorLogger({
  winstonInstance: logger,
  msg: 'ERROR {{err.message}}',
  exceptionToMeta: (error: any) => ({
    stack: error.stack,
    status: error.status || error.statusCode,
    type: error.type || 'UnknownError',
  }),
});

/**
 * Performance monitoring middleware
 * Tracks request performance and logs slow requests
 */
export const performanceMonitoringMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const startTime = Date.now();
  const originalEnd = res.end;

  // Override response.end to capture completion
  res.end = function(chunk?: any, encodingOrCb?: BufferEncoding | (() => void), cb?: () => void) {
    const duration = Date.now() - startTime;

    // Record metrics
    metricsCollector.recordHttpRequest(
      req.method,
      req.route?.path || req.path,
      res.statusCode,
      duration
    );

    // Log API request
    apiLogger.api(req.method, req.path, res.statusCode, duration, (req as any).user?.id);

    // Log slow requests (>1 second)
    if (duration > 1000) {
      performanceLogger.performance(
        `slow_request_${req.method}_${req.path}`,
        duration,
        {
          statusCode: res.statusCode,
          userId: (req as any).user?.id,
          userAgent: req.get('User-Agent'),
          ip: req.ip,
        }
      );
    }

    // Log very slow requests (>5 seconds)
    if (duration > 5000) {
      performanceLogger.performance(
        `very_slow_request_${req.method}_${req.path}`,
        duration,
        {
          statusCode: res.statusCode,
          userId: (req as any).user?.id,
          userAgent: req.get('User-Agent'),
          ip: req.ip,
          warning: 'Request took longer than 5 seconds',
        }
      );
    }

    // Call original end method
    return originalEnd.call(this, chunk, encodingOrCb as any, cb);
  };

  next();
};

/**
 * Security monitoring middleware
 * Logs security-related events
 */
export const securityMonitoringMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Log rate limiting
  if (res.get('X-RateLimit-Remaining') === '0') {
    securityLogger.security('rate_limit_exceeded', 'medium', {
      ip: req.ip || 'unknown',
      userAgent: req.get('User-Agent') || 'unknown',
      endpoint: req.path || 'unknown',
      method: req.method,
    });

    metricsCollector.recordRateLimitHit(req.path || 'unknown', req.ip || 'unknown');
  }

  // Log suspicious patterns
  const suspiciousPatterns = [
    /\.\./,  // Directory traversal
    /<script/i,  // XSS attempts
    /union.*select/i,  // SQL injection attempts
    /eval\(/i,  // Code injection
  ];

  const requestData = JSON.stringify({
    url: req.url,
    body: req.body,
    query: req.query,
    headers: req.headers,
  });

  const hasSuspiciousContent = suspiciousPatterns.some(pattern =>
    pattern.test(requestData)
  );

  if (hasSuspiciousContent) {
    securityLogger.security('suspicious_request_detected', 'high', {
      ip: req.ip || 'unknown',
      userAgent: req.get('User-Agent') || 'unknown',
      endpoint: req.path || 'unknown',
      method: req.method,
      requestData: requestData.substring(0, 500), // Limit logged data
    });
  }

  // Log authentication failures
  res.on('finish', () => {
    if (res.statusCode === 401 || res.statusCode === 403) {
      securityLogger.security('authentication_failure', 'medium', {
        ip: req.ip,
        endpoint: req.path || 'unknown',
        method: req.method,
        statusCode: res.statusCode,
        userAgent: req.get('User-Agent'),
      });

      metricsCollector.recordAuthAttempt(false);
    }

    if (res.statusCode === 200 && req.method === 'POST' && req.path.includes('/auth')) {
      metricsCollector.recordAuthAttempt(true);
    }
  });

  next();
};

/**
 * Request tracing middleware
 * Adds request ID for distributed tracing
 */
export const requestTracingMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Generate or use existing request ID
  const requestId = req.get('X-Request-ID') ||
                   req.get('x-request-id') ||
                   `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Add request ID to request and response
  (req as any).requestId = requestId;
  res.set('X-Request-ID', requestId);

  // Add to async local storage for child operations
  (req as any).startTime = Date.now();

  next();
};

/**
 * Database query monitoring middleware
 * Logs database operations with performance metrics
 */
export const databaseMonitoringMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const originalPrismaQuery = (global as any).prismaQuery;
  const requestId = (req as any).requestId;

  // Monkey patch Prisma query method for monitoring
  if (!originalPrismaQuery) {
    const { PrismaClient } = require('@prisma/client');
    const originalQuery = PrismaClient.prototype.$queryRaw;

    PrismaClient.prototype.$queryRaw = async function(...args: any[]) {
      const startTime = Date.now();

      try {
        const result = await originalQuery.apply(this, args);
        const duration = Date.now() - startTime;

        // Log successful query
        logger.debug('Database query executed', {
          duration,
          success: true,
          requestId,
          query: args[0]?.sql || 'Unknown query',
        });

        return result;
      } catch (error) {
        const duration = Date.now() - startTime;

        // Log failed query
        logger.error('Database query failed', {
          duration,
          success: false,
          requestId,
          error: (error as Error).message,
          query: args[0]?.sql || 'Unknown query',
        });

        throw error;
      }
    };

    (global as any).prismaQuery = originalQuery;
  }

  next();
};

/**
 * Business metrics middleware
 * Tracks business-specific events
 */
export const businessMetricsMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Track business events based on request patterns
  if (req.method === 'POST' && req.path.includes('/orders')) {
    // Will be tracked when order is actually created in the controller
    (req as any).trackOrderCreated = true;
  }

  if (req.method === 'POST' && req.path.includes('/payments')) {
    // Will be tracked when payment is processed
    (req as any).trackPaymentProcessed = true;
  }

  next();
};

/**
 * Combined logging middleware stack
 * Applies all logging and monitoring middleware
 */
export const loggingMiddlewareStack = [
  requestTracingMiddleware,
  performanceMonitoringMiddleware,
  securityMonitoringMiddleware,
  databaseMonitoringMiddleware,
  businessMetricsMiddleware,
  requestLoggingMiddleware,
  errorLoggingMiddleware,
];

export default loggingMiddlewareStack;
