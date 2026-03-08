import { Request, Response, NextFunction } from 'express';
import { logger } from '../../infrastructure/services/logger.service';

/**
 * Custom error class for API errors
 */
export class APIError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly code: string | undefined;

  constructor(
    message: string,
    statusCode: number = 500,
    isOperational: boolean = true,
    code?: string
  ) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.code = code;

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Global error handler middleware
 * Handles all errors thrown in the application
 */
export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  let statusCode = 500;
  let message = 'Internal server error';
  let code: string | undefined;
  let details: unknown = undefined;

  // Handle known error types
  if (error instanceof APIError) {
    statusCode = error.statusCode;
    message = error.message;
    code = error.code;
  } else if (error.name === 'ValidationError') {
    // Joi validation error
    statusCode = 400;
    message = 'Validation failed';
    code = 'VALIDATION_ERROR';
    details = (error as { details?: unknown }).details;
  } else if (error.name === 'PrismaClientKnownRequestError') {
    // Prisma known errors
    const prismaError = error as { code?: string };
    switch (prismaError.code) {
      case 'P2002':
        statusCode = 409;
        message = 'Resource already exists';
        code = 'DUPLICATE_ENTRY';
        break;
      case 'P2025':
        statusCode = 404;
        message = 'Resource not found';
        code = 'NOT_FOUND';
        break;
      default:
        statusCode = 500;
        message = 'Database error';
        code = 'DATABASE_ERROR';
    }
  } else if (error.name === 'PrismaClientValidationError') {
    statusCode = 400;
    message = 'Invalid data provided';
    code = 'VALIDATION_ERROR';
  } else if (error.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid authentication token';
    code = 'INVALID_TOKEN';
  } else if (error.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Authentication token expired';
    code = 'TOKEN_EXPIRED';
  }

  // Log the error
  const logData = {
    method: req.method,
    url: req.url,
    statusCode,
    message,
    code,
    userId: req.userId,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    error: {
      name: error.name,
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }
  };

  if (statusCode >= 500) {
    logger.error('API Error', logData);
  } else {
    logger.warn('API Error', logData);
  }

  // Send error response
  const errorResponse: {
    error: {
      message: string;
      code: string | undefined;
      timestamp: string;
      path: string;
      method: string;
      details?: unknown;
      stack?: string;
    };
  } = {
    error: {
      message,
      code,
      timestamp: new Date().toISOString(),
      path: req.path,
      method: req.method
    }
  };

  // Add details in development mode
  if (process.env.NODE_ENV === 'development') {
    errorResponse.error.details = details;
    errorResponse.error.stack = error.stack;
  }

  // Don't leak internal errors in production
  if (statusCode === 500 && process.env.NODE_ENV === 'production') {
    errorResponse.error.message = 'An unexpected error occurred';
  }

  res.status(statusCode).json(errorResponse);
};

/**
 * Async error wrapper for route handlers
 * Wraps async route handlers to catch rejected promises
 */
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Create standardized API error responses
 */
export const createError = {
  badRequest: (message: string, code?: string) =>
    new APIError(message, 400, true, code || 'BAD_REQUEST'),

  unauthorized: (message: string = 'Authentication required', code?: string) =>
    new APIError(message, 401, true, code || 'UNAUTHORIZED'),

  forbidden: (message: string = 'Access denied', code?: string) =>
    new APIError(message, 403, true, code || 'FORBIDDEN'),

  notFound: (message: string = 'Resource not found', code?: string) =>
    new APIError(message, 404, true, code || 'NOT_FOUND'),

  conflict: (message: string, code?: string) =>
    new APIError(message, 409, true, code || 'CONFLICT'),

  unprocessableEntity: (message: string, code?: string) =>
    new APIError(message, 422, true, code || 'UNPROCESSABLE_ENTITY'),

  tooManyRequests: (message: string = 'Too many requests', code?: string) =>
    new APIError(message, 429, true, code || 'TOO_MANY_REQUESTS'),

  internalServerError: (message: string = 'Internal server error', code?: string) =>
    new APIError(message, 500, false, code || 'INTERNAL_SERVER_ERROR')
};

/**
 * Handle 404 errors
 */
export const notFoundHandler = (req: Request, _res: Response, next: NextFunction) => {
  const error = new APIError(
    `Route ${req.method} ${req.path} not found`,
    404,
    true,
    'ROUTE_NOT_FOUND'
  );
  next(error);
};
