/**
 * Error Handling Middleware
 * Comprehensive error handling with security considerations and monitoring integration
 * Implements error classification, logging, and safe error responses
 */

import { Request, Response, NextFunction } from 'express';

type AsyncHandler = (req: Request, res: Response, next: NextFunction) => unknown;

// =====================================================================================
// ERROR CONFIGURATION
// =====================================================================================

/**
 * Error Handling Configuration
 */
export interface ErrorConfig {
  enableDetailedErrors: boolean;
  enableErrorLogging: boolean;
  enableErrorMonitoring: boolean;
  logStackTraces: boolean;
  sanitizeErrorMessages: boolean;
  maxErrorResponseSize: number;
  sensitiveFields: string[];
  enableErrorCorrelation: boolean;
  enableErrorMetrics: boolean;
  errorRetentionDays: number;
  alertOnErrors: boolean;
  alertThreshold: number;
}

/**
 * Default Error Configuration
 */
export const DEFAULT_ERROR_CONFIG: ErrorConfig = {
  enableDetailedErrors: process.env.NODE_ENV === 'development',
  enableErrorLogging: true,
  enableErrorMonitoring: true,
  logStackTraces: process.env.NODE_ENV === 'development',
  sanitizeErrorMessages: true,
  maxErrorResponseSize: 2048,
  sensitiveFields: ['password', 'token', 'secret', 'key', 'authorization'],
  enableErrorCorrelation: true,
  enableErrorMetrics: true,
  errorRetentionDays: 30,
  alertOnErrors: true,
  alertThreshold: 10
};

// =====================================================================================
// ERROR TYPES & INTERFACES
// =====================================================================================

/**
 * Error Classification
 */
export enum ErrorType {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR = 'AUTHORIZATION_ERROR',
  BUSINESS_LOGIC_ERROR = 'BUSINESS_LOGIC_ERROR',
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  CONFIGURATION_ERROR = 'CONFIGURATION_ERROR',
  SECURITY_ERROR = 'SECURITY_ERROR',
  RATE_LIMIT_ERROR = 'RATE_LIMIT_ERROR',
  SYSTEM_ERROR = 'SYSTEM_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

/**
 * Error Severity Levels
 */
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

/**
 * Application Error Interface
 */
export interface AppError extends Error {
  type: ErrorType;
  severity: ErrorSeverity;
  code: string;
  statusCode: number;
  isOperational: boolean;
  context?: Record<string, any>;
  correlationId?: string;
  userId?: string;
}

/**
 * Error Response
 */
export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
    correlationId?: string;
    timestamp: string;
  };
}

/**
 * Error Log Entry
 */
export interface ErrorLogEntry {
  timestamp: string;
  correlationId: string;
  type: ErrorType;
  severity: ErrorSeverity;
  code: string;
  message: string;
  stack?: string;
  context: Record<string, any>;
  request: {
    method: string;
    url: string;
    ip: string;
    userAgent?: string;
    userId?: string;
  };
}

// =====================================================================================
// ERROR HANDLING MIDDLEWARE
// =====================================================================================

/**
 * Global Error Handler Middleware
 * Central error handling for all routes
 */
export function errorHandler(config: Partial<ErrorConfig> = {}) {
  const finalConfig = { ...DEFAULT_ERROR_CONFIG, ...config };

  return async (error: any, req: Request, res: Response, next: NextFunction) => {
    try {
      // Classify and normalize the error
      const appError = await classifyError(error, req);

      // Generate correlation ID if enabled
      const correlationId = finalConfig.enableErrorCorrelation
        ? generateCorrelationId()
        : undefined;

      // Log the error
      if (finalConfig.enableErrorLogging) {
        await logError(appError, req, correlationId, finalConfig);
      }

      // Send error metrics
      if (finalConfig.enableErrorMetrics) {
        await sendErrorMetrics(appError, finalConfig);
      }

      // Check for alert conditions
      if (finalConfig.alertOnErrors) {
        await checkErrorAlerts(appError, finalConfig);
      }

      // Send safe error response
      const errorResponse = createErrorResponse(appError, correlationId, finalConfig);
      res.status(appError.statusCode).json(errorResponse);

    } catch (handlerError) {
      // Fallback error handling - if error handler itself fails
      console.error('[ERROR] Error handler failed:', handlerError);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred',
          correlationId: generateCorrelationId(),
          timestamp: new Date().toISOString()
        }
      });
    }
  };
}

/**
 * Async Error Wrapper
 * Wraps async route handlers to catch rejected promises
 */
export function asyncErrorHandler(fn: AsyncHandler) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = fn(req, res, next);
    if (result && typeof result.catch === 'function') {
      result.catch(next);
    }
  };
}

/**
 * 404 Not Found Handler
 */
export function notFoundHandler(req: Request, res: Response, next: NextFunction) {
  const error: AppError = {
    name: 'NotFoundError',
    message: `Route ${req.originalUrl} not found`,
    type: ErrorType.SYSTEM_ERROR,
    severity: ErrorSeverity.LOW,
    code: 'ROUTE_NOT_FOUND',
    statusCode: 404,
    isOperational: true,
    context: {
      method: req.method,
      url: req.originalUrl
    }
  };

  next(error);
}

/**
 * Unhandled Rejection Handler
 */
export function unhandledRejectionHandler(config: Partial<ErrorConfig> = {}) {
  const finalConfig = { ...DEFAULT_ERROR_CONFIG, ...config };

  return (reason: any, promise: Promise<any>) => {
    console.error('[ERROR] Unhandled Rejection:', reason);

    const error: AppError = {
      name: 'UnhandledRejectionError',
      message: 'Unhandled promise rejection',
      type: ErrorType.SYSTEM_ERROR,
      severity: ErrorSeverity.HIGH,
      code: 'UNHANDLED_REJECTION',
      statusCode: 500,
      isOperational: false,
      context: {
        reason: reason?.message || String(reason),
        promise: promise.toString()
      }
    };

    if (finalConfig.enableErrorLogging) {
      logError(error, null, generateCorrelationId(), finalConfig);
    }

    if (finalConfig.alertOnErrors) {
      checkErrorAlerts(error, finalConfig);
    }

    // In production, you might want to gracefully shutdown
    // process.exit(1);
  };
}

/**
 * Uncaught Exception Handler
 */
export function uncaughtExceptionHandler(config: Partial<ErrorConfig> = {}) {
  const finalConfig = { ...DEFAULT_ERROR_CONFIG, ...config };

  return (error: Error) => {
    console.error('[ERROR] Uncaught Exception:', error);

    const appError: AppError = {
      name: 'UncaughtExceptionError',
      message: 'Uncaught exception occurred',
      type: ErrorType.SYSTEM_ERROR,
      severity: ErrorSeverity.CRITICAL,
      code: 'UNCAUGHT_EXCEPTION',
      statusCode: 500,
      isOperational: false,
      context: {
        error: error.message,
        stack: finalConfig.logStackTraces ? error.stack : undefined
      }
    };

    if (finalConfig.enableErrorLogging) {
      logError(appError, null, generateCorrelationId(), finalConfig);
    }

    if (finalConfig.alertOnErrors) {
      checkErrorAlerts(appError, finalConfig);
    }

    // Always exit on uncaught exceptions
    process.exit(1);
  };
}

// =====================================================================================
// ERROR CLASSIFICATION & PROCESSING
// =====================================================================================

/**
 * Classify and normalize errors
 */
async function classifyError(error: any, req: Request): Promise<AppError> {
  // Handle known error types
  if (error && typeof error === 'object' && 'type' in error && 'severity' in error && 'code' in error) {
    return error as AppError;
  }

  // Handle validation errors
  if (error.name === 'ValidationError' || error.message?.includes('validation')) {
    return {
      name: error.name || 'ValidationError',
      message: sanitizeErrorMessage(error.message, DEFAULT_ERROR_CONFIG),
      type: ErrorType.VALIDATION_ERROR,
      severity: ErrorSeverity.LOW,
      code: 'VALIDATION_FAILED',
      statusCode: 400,
      isOperational: true,
      context: { originalError: error.message }
    };
  }

  // Handle database errors
  if (error.code?.startsWith('P') || error.message?.includes('database')) {
    return {
      name: error.name || 'DatabaseError',
      message: 'Database operation failed',
      type: ErrorType.DATABASE_ERROR,
      severity: ErrorSeverity.MEDIUM,
      code: 'DATABASE_ERROR',
      statusCode: 500,
      isOperational: false,
      context: {
        originalCode: error.code,
        originalMessage: DEFAULT_ERROR_CONFIG.logStackTraces ? error.message : undefined
      }
    };
  }

  // Handle network/external service errors
  if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
    return {
      name: error.name || 'NetworkError',
      message: 'External service unavailable',
      type: ErrorType.EXTERNAL_SERVICE_ERROR,
      severity: ErrorSeverity.MEDIUM,
      code: 'SERVICE_UNAVAILABLE',
      statusCode: 503,
      isOperational: false,
      context: { originalCode: error.code }
    };
  }

  // Handle authentication errors
  if (error.message?.includes('token') || error.message?.includes('auth')) {
    return {
      name: error.name || 'AuthError',
      message: 'Authentication failed',
      type: ErrorType.AUTHENTICATION_ERROR,
      severity: ErrorSeverity.MEDIUM,
      code: 'AUTHENTICATION_FAILED',
      statusCode: 401,
      isOperational: true,
      context: { originalError: error.message }
    };
  }

  // Handle authorization errors
  if (error.message?.includes('permission') || error.message?.includes('forbidden')) {
    return {
      name: error.name || 'AuthzError',
      message: 'Insufficient permissions',
      type: ErrorType.AUTHORIZATION_ERROR,
      severity: ErrorSeverity.MEDIUM,
      code: 'INSUFFICIENT_PERMISSIONS',
      statusCode: 403,
      isOperational: true,
      context: { originalError: error.message }
    };
  }

  // Default to system error
  return {
    name: error.name || 'Error',
    message: sanitizeErrorMessage(error.message || 'An unexpected error occurred', DEFAULT_ERROR_CONFIG),
    type: ErrorType.SYSTEM_ERROR,
    severity: ErrorSeverity.MEDIUM,
    code: 'INTERNAL_ERROR',
    statusCode: error.statusCode || 500,
    isOperational: error.isOperational !== false,
    context: {
      originalMessage: DEFAULT_ERROR_CONFIG.logStackTraces ? error.message : undefined,
      stack: DEFAULT_ERROR_CONFIG.logStackTraces ? error.stack : undefined
    }
  };
}

/**
 * Create safe error response
 */
function createErrorResponse(
  error: AppError,
  correlationId: string | undefined,
  config: ErrorConfig
): ErrorResponse {
  const response: ErrorResponse = {
    success: false,
    error: {
      code: error.code,
      message: config.enableDetailedErrors ? error.message : getGenericErrorMessage(error.type),
      correlationId,
      timestamp: new Date().toISOString()
    }
  };

  // Add error details in development
  if (config.enableDetailedErrors && error.context) {
    response.error.details = sanitizeErrorContext(error.context, config);
  }

  // Ensure response size is within limits
  const responseString = JSON.stringify(response);
  if (responseString.length > config.maxErrorResponseSize) {
    response.error.details = { message: 'Error details too large to include' };
  }

  return response;
}

/**
 * Sanitize error message
 */
function sanitizeErrorMessage(message: string, config: ErrorConfig): string {
  if (!config.sanitizeErrorMessages) {
    return message;
  }

  // Remove sensitive information
  let sanitized = message;

  // Remove potential secrets from error messages
  sanitized = sanitized.replace(/\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b/g, '**** **** **** ****'); // Credit cards
  sanitized = sanitized.replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '****@****.***'); // Emails
  sanitized = sanitized.replace(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, '***-***-****'); // Phone numbers

  // Truncate if too long
  if (sanitized.length > 500) {
    sanitized = sanitized.substring(0, 500) + '...';
  }

  return sanitized;
}

/**
 * Sanitize error context
 */
function sanitizeErrorContext(context: Record<string, any>, config: ErrorConfig): Record<string, any> {
  const sanitized = { ...context };

  // Remove sensitive fields
  config.sensitiveFields.forEach(field => {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  });

  // Recursively sanitize nested objects
  Object.keys(sanitized).forEach(key => {
    if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
      sanitized[key] = sanitizeErrorContext(sanitized[key], config);
    }
  });

  return sanitized;
}

/**
 * Get generic error message based on error type
 */
function getGenericErrorMessage(errorType: ErrorType): string {
  const messages = {
    [ErrorType.VALIDATION_ERROR]: 'Invalid request data',
    [ErrorType.AUTHENTICATION_ERROR]: 'Authentication required',
    [ErrorType.AUTHORIZATION_ERROR]: 'Access denied',
    [ErrorType.BUSINESS_LOGIC_ERROR]: 'Operation cannot be completed',
    [ErrorType.EXTERNAL_SERVICE_ERROR]: 'Service temporarily unavailable',
    [ErrorType.DATABASE_ERROR]: 'Database operation failed',
    [ErrorType.NETWORK_ERROR]: 'Network communication error',
    [ErrorType.CONFIGURATION_ERROR]: 'Configuration error',
    [ErrorType.SECURITY_ERROR]: 'Security violation detected',
    [ErrorType.RATE_LIMIT_ERROR]: 'Too many requests',
    [ErrorType.SYSTEM_ERROR]: 'Internal server error',
    [ErrorType.UNKNOWN_ERROR]: 'An unexpected error occurred'
  };

  return messages[errorType] || 'An error occurred';
}

// =====================================================================================
// ERROR LOGGING & MONITORING
// =====================================================================================

/**
 * Log error details
 */
async function logError(
  error: AppError,
  req: Request | null,
  correlationId: string | undefined,
  config: ErrorConfig
): Promise<void> {
  const logEntry: ErrorLogEntry = {
    timestamp: new Date().toISOString(),
    correlationId: correlationId || 'unknown',
    type: error.type,
    severity: error.severity,
    code: error.code,
    message: error.message,
    stack: config.logStackTraces ? error.stack : undefined,
    context: error.context || {},
    request: req ? {
      method: req.method,
      url: req.originalUrl,
      ip: req.ip || req.connection.remoteAddress || 'unknown',
      userAgent: req.headers['user-agent'],
      userId: (req as any).user?.userId
    } : {
      method: 'unknown',
      url: 'unknown',
      ip: 'unknown'
    }
  };

  // Log to console
  console.error(`[${error.severity.toUpperCase()}] ${error.type}:`, {
    code: error.code,
    message: error.message,
    correlationId: logEntry.correlationId,
    context: logEntry.context
  });

  // In a real app, you would send this to a logging service like Winston, DataDog, etc.
  // await sendToLoggingService(logEntry);
}

/**
 * Send error metrics
 */
async function sendErrorMetrics(error: AppError, config: ErrorConfig): Promise<void> {
  // In a real app, send metrics to monitoring service like DataDog, Prometheus, etc.
  // Example: increment counter for error type, severity, etc.
  console.log(`[METRICS] Error recorded: ${error.type} (${error.severity})`);
}

/**
 * Check for error alerts
 */
async function checkErrorAlerts(error: AppError, config: ErrorConfig): Promise<void> {
  if (error.severity === ErrorSeverity.CRITICAL ||
      (error.severity === ErrorSeverity.HIGH && error.type === ErrorType.SECURITY_ERROR)) {
    // In a real app, send alerts to PagerDuty, Slack, email, etc.
    console.error(`[ALERT] Critical error detected: ${error.code} - ${error.message}`);
  }
}

/**
 * Generate correlation ID
 */
function generateCorrelationId(): string {
  return require('crypto').randomUUID();
}

// =====================================================================================
// ERROR MIDDLEWARE FACTORY
// =====================================================================================

/**
 * Error Middleware Factory
 * Creates pre-configured error handling middleware
 */
export class ErrorMiddlewareFactory {
  static createGlobalErrorHandler(config: Partial<ErrorConfig> = {}) {
    return errorHandler(config);
  }

  static createAsyncErrorWrapper() {
    return asyncErrorHandler;
  }

  static createNotFoundHandler() {
    return notFoundHandler;
  }

  static createUnhandledRejectionHandler(config: Partial<ErrorConfig> = {}) {
    return unhandledRejectionHandler(config);
  }

  static createUncaughtExceptionHandler(config: Partial<ErrorConfig> = {}) {
    return uncaughtExceptionHandler(config);
  }

  static createCompleteErrorStack(config: Partial<ErrorConfig> = {}) {
    return [
      notFoundHandler,
      errorHandler(config)
    ];
  }
}

// =====================================================================================
// UTILITY FUNCTIONS
// =====================================================================================

/**
 * Create custom application error
 */
export function createAppError(
  type: ErrorType,
  severity: ErrorSeverity,
  code: string,
  message: string,
  statusCode: number = 500,
  context?: Record<string, any>
): AppError {
  const error = new Error(message) as AppError;
  error.type = type;
  error.severity = severity;
  error.code = code;
  error.statusCode = statusCode;
  error.isOperational = true;
  error.context = context;

  return error;
}
