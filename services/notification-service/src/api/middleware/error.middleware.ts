import { Request, Response, NextFunction } from 'express';
import { logger } from '../../infrastructure/services/logger.service';
import {
  InvalidPhoneNumberError,
  MessageTooLongError,
  MessageNotFoundError,
  RateLimitExceededError,
  ProviderNotAvailableError,
  ProviderError,
  InvalidStateTransitionError,
  MaxRetriesExceededError
} from '../../sms/domain/errors/sms.errors';

export class APIError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly code: string | undefined;

  constructor(
    message: string,
    statusCode = 500,
    isOperational = true,
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
  let details: any;

  if (error instanceof APIError) {
    statusCode = error.statusCode;
    message = error.message;
    code = error.code;
  } else if (error instanceof MessageNotFoundError) {
    statusCode = 404;
    message = error.message;
    code = 'SMS_NOT_FOUND';
  } else if (error instanceof InvalidPhoneNumberError || error instanceof MessageTooLongError || error instanceof InvalidStateTransitionError) {
    statusCode = 400;
    message = error.message;
    code = 'SMS_VALIDATION_ERROR';
  } else if (error instanceof RateLimitExceededError) {
    statusCode = 429;
    message = error.message;
    code = 'SMS_RATE_LIMIT';
  } else if (error instanceof ProviderNotAvailableError) {
    statusCode = 503;
    message = error.message;
    code = 'SMS_PROVIDER_UNAVAILABLE';
  } else if (error instanceof ProviderError) {
    statusCode = 502;
    message = error.message;
    code = 'SMS_PROVIDER_ERROR';
  } else if (error instanceof MaxRetriesExceededError) {
    statusCode = 409;
    message = error.message;
    code = 'SMS_MAX_RETRIES';
  } else if (error.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation failed';
    code = 'VALIDATION_ERROR';
    details = (error as any).details;
  } else if (error.name === 'PrismaClientKnownRequestError') {
    const prismaError = error as any;
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
  }

  const logData = {
    method: req.method,
    url: req.url,
    statusCode,
    message,
    code,
    userId: (req as any).userId,
    ip: req.ip,
    error: { name: error.name, message: error.message, stack: process.env.NODE_ENV === 'development' ? error.stack : undefined }
  };
  if (statusCode >= 500) logger.error('API Error', logData);
  else logger.warn('API Error', logData);

  const errorResponse: any = {
    error: { message, code, timestamp: new Date().toISOString(), path: req.path, method: req.method }
  };
  if (process.env.NODE_ENV === 'development') {
    errorResponse.error.details = details;
    errorResponse.error.stack = error.stack;
  }
  if (statusCode === 500 && process.env.NODE_ENV === 'production') {
    errorResponse.error.message = 'An unexpected error occurred';
  }
  res.status(statusCode).json(errorResponse);
};

export const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

export const createError = {
  badRequest: (message: string, code?: string) => new APIError(message, 400, true, code || 'BAD_REQUEST'),
  unauthorized: (message = 'Authentication required', code?: string) => new APIError(message, 401, true, code || 'UNAUTHORIZED'),
  forbidden: (message = 'Access denied', code?: string) => new APIError(message, 403, true, code || 'FORBIDDEN'),
  notFound: (message = 'Resource not found', code?: string) => new APIError(message, 404, true, code || 'NOT_FOUND'),
  conflict: (message: string, code?: string) => new APIError(message, 409, true, code || 'CONFLICT'),
  tooManyRequests: (message = 'Too many requests', code?: string) => new APIError(message, 429, true, code || 'TOO_MANY_REQUESTS'),
  internalServerError: (message = 'Internal server error', code?: string) => new APIError(message, 500, false, code || 'INTERNAL_SERVER_ERROR')
};
