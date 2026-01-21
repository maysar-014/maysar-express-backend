import { Request, Response, NextFunction } from 'express';
import { logger } from '../../infrastructure/services/logger.service';

/**
 * Async error handler wrapper
 */
export function asyncHandler(fn: Function) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Global error handler middleware
 */
export function errorHandler(
  error: any,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Log error
  logger.error('Request error', {
    error: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    body: req.body,
    params: req.params,
    query: req.query
  });

  // Default error response
  let statusCode = 500;
  let message = 'Internal server error';

  // Handle specific error types
  if (error.name === 'ValidationError') {
    statusCode = 400;
    message = error.message;
  } else if (error.name === 'UnauthorizedError') {
    statusCode = 401;
    message = 'Unauthorized';
  } else if (error.name === 'ForbiddenError') {
    statusCode = 403;
    message = 'Forbidden';
  } else if (error.name === 'NotFoundError') {
    statusCode = 404;
    message = 'Not found';
  } else if (error.name === 'ConflictError') {
    statusCode = 409;
    message = 'Conflict';
  } else if (error.statusCode) {
    statusCode = error.statusCode;
    message = error.message;
  }

  // In development, include stack trace
  const isDevelopment = process.env.NODE_ENV === 'development';
  const response: any = {
    success: false,
    message,
    timestamp: new Date().toISOString(),
    path: req.path,
    method: req.method
  };

  if (isDevelopment) {
    response.stack = error.stack;
    response.error = error.message;
  }

  res.status(statusCode).json(response);
}
