/**
 * Maysar Engineering — Structured Error Boundaries
 * 
 * Governing Document: Maysar Engineering Constitution v1.0
 *   - Article 17: Security by Design — Safe error reporting
 *   - Article 9: Memory Management — Prevent resource leaks on errors
 *   - Article 20: Evidence-Based Auditing — Evidence-based auditing
 * 
 * Provides standardized error handling that:
 *   - Sanitizes client-facing error messages (no stack traces leaked)
 *   - Logs detailed errors server-side for auditing
 *   - Provides consistent error response format
 *   - Prevents information leakage through error messages
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../core/logger';

/**
 * Standardized application error class.
 */
export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;
  public errorCode?: string;

  constructor(message: string, statusCode: number = 500, isOperational: boolean = true, errorCode?: string) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.errorCode = errorCode;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Create a standardized operational error.
 */
export function createError(message: string, statusCode: number = 500, errorCode?: string): AppError {
  return new AppError(message, statusCode, true, errorCode);
}

/**
 * Standardized error response format.
 */
interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    statusCode: number;
    timestamp: string;
    requestId?: string;
  };
}

/**
 * Global error handling middleware.
 * 
 * Catches all errors, logs detailed information server-side,
 * and returns sanitized responses to clients.
 */
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const error = err as AppError;
  
  // Determine status code
  const statusCode = error.statusCode || 500;
  const isOperational = error.isOperational !== false;
  
  // Generate request ID for tracking
  const requestId = (req as any).requestId || require('crypto').randomBytes(8).toString('hex');
  
  // Log detailed error server-side (never expose to client)
  logger.error('Unhandled error', {
    error: error.message,
    stack: error.stack,
    statusCode,
    isOperational,
    url: req.url,
    method: req.method,
    ip: req.ip,
    requestId,
    userAgent: req.get('User-Agent'),
  });
  
  // Build sanitized client response
  const response: ErrorResponse = {
    success: false,
    error: {
      code: error.errorCode || 'INTERNAL_SERVER_ERROR',
      message: isOperational ? error.message : 'Internal server error',
      statusCode,
      timestamp: new Date().toISOString(),
      requestId,
    },
  };
  
  res.status(statusCode).json(response);
}

/**
 * Middleware to add request ID to all requests.
 */
export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const crypto = require('crypto');
  (req as any).requestId = crypto.randomBytes(8).toString('hex');
  res.set('X-Request-ID', (req as any).requestId);
  next();
}
