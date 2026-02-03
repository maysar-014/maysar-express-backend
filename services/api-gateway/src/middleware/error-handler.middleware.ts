/**
 * Error Handler Middleware
 * 
 * Handles errors and provides consistent error responses for the Maysar API Gateway
 */

import { Request, Response, NextFunction } from 'express';
import { GatewayError, ValidationError, ServiceError } from '../types';

export interface ErrorHandlerOptions {
  includeStack?: boolean;
  logErrors?: boolean;
}

export class ErrorHandlerMiddleware {
  private options: ErrorHandlerOptions;

  constructor(options?: Partial<ErrorHandlerOptions>) {
    this.options = {
      includeStack: process.env.NODE_ENV === 'development',
      logErrors: true,
      ...options,
    };
  }

  middleware() {
    return (error: Error, req: Request, res: Response, next: NextFunction) => {
      // Log error
      if (this.options.logErrors) {
        this.logError(error, req);
      }

      // Handle different error types
      if (this.isGatewayError(error)) {
        this.handleGatewayError(error as GatewayError, req, res);
      } else if (error.name === 'ValidationError') {
        this.handleValidationError(error, req, res);
      } else if (error.name === 'ServiceError') {
        this.handleServiceError(error, req, res);
      } else if (error.name === 'TimeoutError') {
        this.handleTimeoutError(error, req, res);
      } else if (error.name === 'UnauthorizedError') {
        this.handleAuthError(error, req, res);
      } else {
        this.handleGenericError(error, req, res);
      }
    };
  }

  private logError(error: Error, req: Request): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
      request: {
        method: req.method,
        url: req.originalUrl,
        headers: req.headers,
        body: req.body,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
      },
    };

    console.error('Gateway Error:', JSON.stringify(logEntry, null, 2));
  }

  private handleGatewayError(error: GatewayError, req: Request, res: Response): void {
    res.status(error.statusCode).json({
      success: false,
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
      },
      timestamp: new Date().toISOString(),
      requestId: req.headers['x-request-id'] || 'unknown',
      ...(this.options.includeStack && { stack: error.stack }),
    });
  }

  private handleValidationError(error: Error, req: Request, res: Response): void {
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: error.message,
      },
      timestamp: new Date().toISOString(),
      requestId: req.headers['x-request-id'] || 'unknown',
      ...(this.options.includeStack && { stack: error.stack }),
    });
  }

  private handleServiceError(error: Error, req: Request, res: Response): void {
    res.status(503).json({
      success: false,
      error: {
        code: 'SERVICE_ERROR',
        message: 'Service temporarily unavailable',
        details: error.message,
      },
      timestamp: new Date().toISOString(),
      requestId: req.headers['x-request-id'] || 'unknown',
      ...(this.options.includeStack && { stack: error.stack }),
    });
  }

  private handleTimeoutError(error: Error, req: Request, res: Response): void {
    res.status(408).json({
      success: false,
      error: {
        code: 'REQUEST_TIMEOUT',
        message: 'Request timed out',
        details: error.message,
      },
      timestamp: new Date().toISOString(),
      requestId: req.headers['x-request-id'] || 'unknown',
      ...(this.options.includeStack && { stack: error.stack }),
    });
  }

  private handleAuthError(error: Error, req: Request, res: Response): void {
    res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
        details: error.message,
      },
      timestamp: new Date().toISOString(),
      requestId: req.headers['x-request-id'] || 'unknown',
      ...(this.options.includeStack && { stack: error.stack }),
    });
  }

  private handleGenericError(error: Error, req: Request, res: Response): void {
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
        details: process.env.NODE_ENV === 'production' 
          ? 'An unexpected error occurred' 
          : error.message,
      },
      timestamp: new Date().toISOString(),
      requestId: req.headers['x-request-id'] || 'unknown',
      ...(this.options.includeStack && { stack: error.stack }),
    });
  }

  private isGatewayError(error: Error): boolean {
    return 'code' in error && 'statusCode' in error && 'requestId' in error && 'timestamp' in error;
  }
}

// Default error handler middleware instance
export const errorHandlerMiddleware = new ErrorHandlerMiddleware();

// Export middleware function
export const errorHandler = errorHandlerMiddleware.middleware();