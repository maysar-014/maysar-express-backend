import { Request, Response, NextFunction } from 'express';
import { logger } from '../../infrastructure/services/logger.service';

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

export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  let statusCode = 500;
  let message = 'Internal server error';
  let code: string | undefined;

  if (error instanceof APIError) {
    statusCode = error.statusCode;
    message = error.message;
    code = error.code;
  }

  const logData = {
    method: req.method,
    url: req.url,
    statusCode,
    message,
    code,
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

  res.status(statusCode).json({
    error: {
      message,
      code,
      timestamp: new Date().toISOString(),
      path: req.path,
      method: req.method
    }
  });
};

export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

export const createError = {
  badRequest: (message: string, code?: string) =>
    new APIError(message, 400, true, code || 'BAD_REQUEST'),

  unauthorized: (message: string = 'Authentication required', code?: string) =>
    new APIError(message, 401, true, code || 'UNAUTHORIZED'),

  forbidden: (message: string = 'Access denied', code?: string) =>
    new APIError(message, 403, true, code || 'FORBIDDEN'),

  notFound: (message: string = 'Resource not found', code?: string) =>
    new APIError(message, 404, true, code || 'NOT_FOUND'),

  internalServerError: (message: string = 'Internal server error', code?: string) =>
    new APIError(message, 500, false, code || 'INTERNAL_SERVER_ERROR')
};
