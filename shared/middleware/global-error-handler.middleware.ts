/**
 * Global Error Handler Middleware
 *
 * Single point of truth for all API error responses.
 * Enforces the standard error shape from the API documentation constitution:
 *
 * {
 *   "success": false,
 *   "error": {
 *     "code": "MACHINE_READABLE_CODE",
 *     "message": "Human-readable explanation",
 *     "details": { ...optional },
 *     "timestamp": "2026-08-23T12:00:00.000Z",
 *     "path": "/api/catalog/seller-locations"
 *   }
 * }
 *
 * Rules:
 * - Never leaks stack traces in production
 * - Always returns JSON (never HTML)
 * - Every response has a machine-readable error code
 * - 500 errors log the full error; 4xx errors log as warnings
 */

import { Request, Response, NextFunction } from 'express';
import { normaliseError } from '../errors/api-errors';
import { appLogger } from '../logger/logger';

export function globalErrorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (res.headersSent) {
    return;
  }

  const { httpStatus, code, message, details } = normaliseError(err);

  // Log at appropriate level
  if (httpStatus >= 500) {
    appLogger.error('Unhandled error', {
      code,
      message,
      path: req.path,
      method: req.method,
      stack: err instanceof Error ? err.stack : undefined,
    });
  } else if (httpStatus >= 400) {
    appLogger.warn('Client error', {
      code,
      message,
      path: req.path,
      method: req.method,
    });
  }

  const body: Record<string, unknown> = {
    success: false,
    error: {
      code,
      message: httpStatus >= 500 && process.env.NODE_ENV === 'production'
        ? 'An unexpected error occurred'
        : message,
      timestamp: new Date().toISOString(),
      path: req.path,
      ...(details ? { details } : {}),
    },
  };

  // Include stack in non-production for debugging
  if (process.env.NODE_ENV !== 'production' && err instanceof Error && httpStatus >= 500) {
    (body.error as Record<string, unknown>).stack = err.stack;
  }

  res.status(httpStatus).json(body);
}

/**
 * 404 handler — must be registered after all routes.
 */
export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    error: {
      code: 'RESOURCE_NOT_FOUND',
      message: `Route ${req.method} ${req.path} not found`,
      timestamp: new Date().toISOString(),
      path: req.path,
    },
  });
}
