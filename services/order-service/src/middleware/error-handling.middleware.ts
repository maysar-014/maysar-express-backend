/**
 * Error Handling Middleware
 * Comprehensive error handling and response formatting
 */

import { Request, Response, NextFunction } from 'express';
import { AppError, ErrorType, ErrorSeverity, shouldAlert } from '../domain/errors';
import { handleCriticalError } from '../infrastructure/monitoring/alerting';
import { logSecurityConfigSummary } from '../config/security.config';
import { logMonitoringConfigSummary } from '../config/monitoring.config';

/**
 * Global error handling middleware
 */
export function errorHandler(
  error: any,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Log the error
  logError(error, req);

  // Check if error should trigger alerts
  if (shouldTriggerAlert(error)) {
    triggerAlert(error, req);
  }

  // Determine if error is operational (expected) or programming error
  const isOperationalError = isOperational(error);

  // Send appropriate response
  if (isOperationalError) {
    sendOperationalErrorResponse(error, req, res);
  } else {
    sendProgrammingErrorResponse(error, req, res);
  }

  // For programming errors, we might want to exit the process
  if (!isOperationalError && isCriticalError(error)) {
    // In production, you might want to gracefully shutdown
    // For now, just log it
    console.error('🚨 Critical programming error detected - consider graceful shutdown');
  }
}

/**
 * Log error with appropriate level and context
 */
function logError(error: any, req: Request): void {
  const errorContext = {
    method: req.method,
    url: req.url,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    userId: (req as any).userId,
    correlationId: req.get('X-Request-ID') || req.get('x-request-id'),
    timestamp: new Date().toISOString(),
  };

  if (error instanceof AppError) {
    // Structured logging for known errors
    const logLevel = getLogLevel(error.severity);
    console[logLevel](`[${error.type}] ${error.message}`, {
      ...errorContext,
      severity: error.severity,
      context: error.context,
      stack: error.stack,
    });
  } else {
    // Log unknown errors as errors
    console.error('Unhandled error:', {
      ...errorContext,
      error: error.message,
      stack: error.stack,
      name: error.name,
    });
  }
}

/**
 * Determine if error should trigger alerts
 */
function shouldTriggerAlert(error: any): boolean {
  if (error instanceof AppError) {
    return shouldAlert(error);
  }

  // Alert on unknown errors
  return true;
}

/**
 * Trigger alerts for critical errors
 */
async function triggerAlert(error: any, req: Request): Promise<void> {
  try {
    await handleCriticalError(error, {
      url: req.url,
      method: req.method,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      userId: (req as any).userId,
      requestId: req.get('X-Request-ID') || req.get('x-request-id'),
    });
  } catch (alertError) {
    // If alerting fails, log the alert failure but don't create a loop
    console.error('🚨 ALERT SYSTEM FAILURE:', {
      originalError: error.message,
      alertError: alertError instanceof Error ? alertError.message : 'Unknown alert error',
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * Check if error is operational (expected) or programming error
 */
function isOperational(error: any): boolean {
  if (error instanceof AppError) {
    return error.isOperational;
  }

  // Network errors, timeouts, etc. are often operational
  if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT' || error.code === 'ENOTFOUND') {
    return true;
  }

  // 4xx errors are usually operational (client errors)
  if (error.status && error.status >= 400 && error.status < 500) {
    return true;
  }

  // Everything else is considered a programming error
  return false;
}

/**
 * Check if error is critical and might require process restart
 */
function isCriticalError(error: any): boolean {
  if (error instanceof AppError) {
    return error.severity === ErrorSeverity.CRITICAL;
  }

  // Database connection errors, out of memory, etc.
  return error.code === 'CONNECTION_LOST' ||
         error.code === 'OUT_OF_MEMORY' ||
         error.message?.includes('heap out of memory');
}

/**
 * Send response for operational errors
 */
function sendOperationalErrorResponse(error: any, req: Request, res: Response): void {
  let statusCode = 500;
  let message = 'Internal server error';
  let details: any = undefined;

  if (error instanceof AppError) {
    statusCode = getHttpStatusCode(error);
    message = error.message;

    // Include additional context for client (without sensitive data)
    if (error.type === ErrorType.VALIDATION_ERROR) {
      // For validation errors, the context might include field information
      details = {
        type: error.type,
        retryable: error.retryable,
      };
    }
  } else {
    // Map common errors to appropriate status codes
    if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') {
      statusCode = 503;
      message = 'Service temporarily unavailable';
    } else if (error.status) {
      statusCode = error.status;
      message = error.message || message;
    }
  }

  // Include retry information for retryable errors
  const retryable = error instanceof AppError ? error.retryable : false;
  if (retryable) {
    res.set('Retry-After', '30'); // Suggest retry after 30 seconds
  }

  res.status(statusCode).json({
    error: {
      message,
      code: statusCode,
      type: error instanceof AppError ? error.type : 'INTERNAL_ERROR',
      timestamp: new Date().toISOString(),
      requestId: req.get('X-Request-ID') || req.get('x-request-id'),
      retryable,
      ...(details && { details }),
    },
  });
}

/**
 * Send response for programming errors
 */
function sendProgrammingErrorResponse(error: any, req: Request, res: Response): void {
  // Don't expose internal error details to clients
  res.status(500).json({
    error: {
      message: 'Internal server error',
      code: 500,
      type: 'INTERNAL_ERROR',
      timestamp: new Date().toISOString(),
      requestId: req.get('X-Request-ID') || req.get('x-request-id'),
    },
  });
}

/**
 * Map AppError types to HTTP status codes
 */
function getHttpStatusCode(error: AppError): number {
  switch (error.type) {
    case ErrorType.VALIDATION_ERROR:
    case ErrorType.BUSINESS_RULE_VIOLATION:
      return 400;

    case ErrorType.UNAUTHORIZED:
      return 401;

    case ErrorType.FORBIDDEN:
      return 403;

    case ErrorType.ORDER_NOT_FOUND:
    case ErrorType.INVALID_ORDER_STATUS:
      return 404;

    case ErrorType.RATE_LIMIT_EXCEEDED:
      return 429;

    case ErrorType.DATABASE_ERROR:
    case ErrorType.EXTERNAL_SERVICE_ERROR:
    case ErrorType.NETWORK_ERROR:
    case ErrorType.PESAPAL_ERROR:
    case ErrorType.SUPABASE_ERROR:
    case ErrorType.REDIS_ERROR:
      return 503;

    case ErrorType.TIMEOUT_ERROR:
      return 504;

    case ErrorType.SERVICE_UNAVAILABLE:
      return 503;

    case ErrorType.INSUFFICIENT_INVENTORY:
    case ErrorType.PAYMENT_FAILED:
      return 422; // Unprocessable Entity

    case ErrorType.INTERNAL_ERROR:
    default:
      return 500;
  }
}

/**
 * Get appropriate log level for error severity
 */
function getLogLevel(severity: ErrorSeverity): 'error' | 'warn' | 'info' {
  switch (severity) {
    case ErrorSeverity.CRITICAL:
    case ErrorSeverity.HIGH:
      return 'error';
    case ErrorSeverity.MEDIUM:
      return 'warn';
    case ErrorSeverity.LOW:
    default:
      return 'info';
  }
}

/**
 * Async error wrapper for routes that return promises
 */
export function asyncErrorHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}

/**
 * Error recovery middleware for graceful degradation
 */
export function gracefulDegradationHandler(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Check if critical services are available
  const servicesStatus = checkServiceAvailability();

  // Add service status to request for use in route handlers
  (req as any).serviceStatus = servicesStatus;

  // If critical services are down, enable degraded mode
  if (!servicesStatus.database || !servicesStatus.cache) {
    (req as any).degradedMode = true;
    res.set('X-Degraded-Mode', 'true');
  }

  next();
}

/**
 * Check availability of external services
 */
function checkServiceAvailability(): {
  database: boolean;
  cache: boolean;
  externalAPIs: boolean;
} {
  // In a real implementation, this would check actual service health
  // For now, return optimistic status
  return {
    database: true,
    cache: true,
    externalAPIs: true,
  };
}

/**
 * Recovery middleware for failed operations
 */
export function recoveryHandler(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Store original response methods
  const originalJson = res.json;
  const originalStatus = res.status;

  // Override response methods to enable recovery
  res.json = function(data: any) {
    // If this is an error response and we have recovery options, try them
    if (data.error && (req as any).degradedMode) {
      const recoveryResponse = attemptRecovery(data, req);
      if (recoveryResponse) {
        return originalJson.call(this, recoveryResponse);
      }
    }

    return originalJson.call(this, data);
  };

  next();
}

/**
 * Attempt recovery for failed operations in degraded mode
 */
function attemptRecovery(errorResponse: any, req: Request): any | null {
  // Implement recovery strategies based on error type and degraded mode
  // For example:
  // - Return cached data if database is down
  // - Provide simplified response if external API is unavailable
  // - Queue operations for later retry

  if (errorResponse.error?.type === ErrorType.DATABASE_ERROR) {
    // Return cached or default response
    return {
      ...errorResponse,
      warning: 'Data may be outdated due to temporary database issues',
      cached: true,
    };
  }

  if (errorResponse.error?.type === ErrorType.EXTERNAL_SERVICE_ERROR) {
    // Provide fallback response
    return {
      ...errorResponse,
      warning: 'Some features are temporarily unavailable',
      degraded: true,
    };
  }

  return null; // No recovery possible
}

/**
 * Request timeout middleware
 */
export function timeoutHandler(timeoutMs: number = 30000) {
  return (req: Request, res: Response, next: NextFunction) => {
    const timeout = setTimeout(() => {
      if (!res.headersSent) {
        clearTimeout(timeout);
        const error = new Error(`Request timeout after ${timeoutMs}ms`);
        (error as any).status = 408;
        next(error);
      }
    }, timeoutMs);

    res.on('finish', () => {
      clearTimeout(timeout);
    });

    next();
  };
}

/**
 * Error logging middleware (for additional context)
 */
export function errorLoggingHandler(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Add request start time for duration calculation
  (req as any).startTime = Date.now();

  // Log request
  console.log(`➡️  ${req.method} ${req.url}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    requestId: req.get('X-Request-ID'),
  });

  // Log response when finished
  res.on('finish', () => {
    const duration = Date.now() - (req as any).startTime;

    if (res.statusCode >= 400) {
      console.warn(`❌ ${req.method} ${req.url} ${res.statusCode} ${duration}ms`);
    } else {
      console.log(`✅ ${req.method} ${req.url} ${res.statusCode} ${duration}ms`);
    }
  });

  next();
}
