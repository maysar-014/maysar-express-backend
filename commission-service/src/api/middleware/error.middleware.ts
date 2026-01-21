/**
 * Error Handling Middleware
 * Centralized error handling for the API
 */

import { Request, Response, NextFunction } from 'express';

export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

export const errorHandler = (
  error: AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  let statusCode = error.statusCode || 500;
  let message = error.message || 'Internal Server Error';
  let isOperational = error.isOperational || false;

  // Log error for monitoring
  console.error(`[${new Date().toISOString()}] Error ${statusCode}: ${message}`);
  console.error('Stack:', error.stack);

  // Handle specific error types
  if (error.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation Error';
    isOperational = true;
  } else if (error.name === 'UnauthorizedError') {
    statusCode = 401;
    message = 'Unauthorized';
    isOperational = true;
  } else if (error.name === 'ForbiddenError') {
    statusCode = 403;
    message = 'Forbidden';
    isOperational = true;
  } else if (error.name === 'NotFoundError') {
    statusCode = 404;
    message = 'Not Found';
    isOperational = true;
  }

  // Don't leak error details in production
  const isDevelopment = process.env.NODE_ENV === 'development';
  const errorResponse = {
    success: false,
    error: {
      message,
      ...(isDevelopment && {
        stack: error.stack,
        name: error.name
      }),
      timestamp: new Date().toISOString(),
      path: req.path,
      method: req.method
    }
  };

  res.status(statusCode).json(errorResponse);
};

export const notFoundHandler = (req: Request, res: Response, next: NextFunction): void => {
  const error: AppError = new Error(`Route ${req.originalUrl} not found`);
  error.statusCode = 404;
  error.isOperational = true;
  next(error);
};

export const asyncErrorHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
