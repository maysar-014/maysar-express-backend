/**
 * Error Handling Middleware Test Suite
 * Verifies the current middleware contract and response shape.
 */

import { Request, Response, NextFunction } from 'express';
import { ErrorSeverity, ErrorType, errorHandler, notFoundHandler } from '../error.middleware';

describe('Error Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  let consoleErrorSpy: jest.SpyInstance;
  let consoleLogSpy: jest.SpyInstance;

  beforeEach(() => {
    mockRequest = {
      method: 'GET',
      originalUrl: '/api/test',
      url: '/api/test',
      headers: {
        'user-agent': 'jest'
      },
      ip: '127.0.0.1',
      connection: { remoteAddress: '127.0.0.1' } as any
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis()
    };

    mockNext = jest.fn();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    consoleLogSpy.mockRestore();
  });

  describe('errorHandler', () => {
    it('should handle standard Error objects with safe defaults', async () => {
      const middleware = errorHandler();
      const error = new Error('Test error message');
      error.name = 'TestError';

      await middleware(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'INTERNAL_ERROR',
            message: 'Internal server error',
            correlationId: expect.any(String),
            timestamp: expect.any(String)
          })
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should map validation errors to a 400 response', async () => {
      const middleware = errorHandler();
      const error = new Error('Validation failed');
      error.name = 'ValidationError';
      (error as any).statusCode = 400;

      await middleware(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: 'VALIDATION_FAILED',
            message: 'Invalid request data'
          })
        })
      );
    });

    it('should map database errors to a 500 response', async () => {
      const middleware = errorHandler();
      const error = new Error('Database connection failed');
      (error as any).code = 'P2025';

      await middleware(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: 'DATABASE_ERROR',
            message: 'Database operation failed'
          })
        })
      );
    });

    it('should map authentication errors to a 401 response', async () => {
      const middleware = errorHandler();
      const error = new Error('Invalid auth token');

      await middleware(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: 'AUTHENTICATION_FAILED',
            message: 'Authentication required'
          })
        })
      );
    });

    it('should map authorization errors to a 403 response', async () => {
      const middleware = errorHandler();
      const error = new Error('forbidden action');

      await middleware(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: 'INSUFFICIENT_PERMISSIONS',
            message: 'Access denied'
          })
        })
      );
    });

    it('should handle route-not-found errors passed through next()', async () => {
      notFoundHandler(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'NotFoundError',
          code: 'ROUTE_NOT_FOUND',
          statusCode: 404,
          type: ErrorType.SYSTEM_ERROR,
          severity: ErrorSeverity.LOW,
          isOperational: true
        })
      );

      const notFoundError = (mockNext as jest.Mock).mock.calls[0][0];
      await errorHandler()(notFoundError, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: 'ROUTE_NOT_FOUND',
            message: 'Internal server error'
          })
        })
      );
    });
  });

  describe('logging', () => {
    it('should log error details and metrics', async () => {
      const middleware = errorHandler();
      const error = new Error('Test error');

      await middleware(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[MEDIUM] SYSTEM_ERROR:',
        expect.objectContaining({
          code: 'INTERNAL_ERROR',
          message: 'Test error'
        })
      );
      expect(consoleLogSpy).toHaveBeenCalledWith('[METRICS] Error recorded: SYSTEM_ERROR (medium)');
    });
  });
});
