/**
 * Error Middleware Test Suite
 * Tests for error handling middleware functionality
 */

import { Request, Response, NextFunction } from 'express';
import { errorHandler, notFoundHandler } from '../error.middleware';

describe('Error Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockRequest = {
      method: 'GET',
      url: '/api/test',
      headers: {},
      body: {},
      ip: '127.0.0.1',
      connection: { remoteAddress: '127.0.0.1' } as any
    };
    
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis()
    };
    
    mockNext = jest.fn();
  });

  describe('errorHandler', () => {
    it('should handle standard Error objects', () => {
      const middleware = errorHandler();
      const error = new Error('Test error message');
      error.name = 'TestError';

      middleware(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'INTERNAL_ERROR',
            message: 'Test error message',
            name: 'TestError'
          }),
          meta: expect.objectContaining({
            timestamp: expect.any(Date)
          })
        })
      );
    });

    it('should handle custom error objects with status code', () => {
      const middleware = errorHandler();
      const error = new Error('Not found');
      error.name = 'NotFoundError';
      (error as any).statusCode = 404;

      middleware(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'NOT_FOUND',
            message: 'Not found',
            name: 'NotFoundError'
          }),
          meta: expect.objectContaining({
            timestamp: expect.any(Date)
          })
        })
      );
    });

    it('should handle validation errors', () => {
      const middleware = errorHandler();
      const error = new Error('Validation failed');
      error.name = 'ValidationError';
      (error as any).statusCode = 400;
      (error as any).details = ['Field is required', 'Invalid format'];

      middleware(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'VALIDATION_ERROR',
            message: 'Validation failed',
            name: 'ValidationError',
            details: ['Field is required', 'Invalid format']
          }),
          meta: expect.objectContaining({
            timestamp: expect.any(Date)
          })
        })
      );
    });

    it('should handle database errors', () => {
      const middleware = errorHandler();
      const error = new Error('Database connection failed');
      error.name = 'DatabaseError';
      (error as any).statusCode = 503;

      middleware(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(503);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'DATABASE_ERROR',
            message: 'Database connection failed',
            name: 'DatabaseError'
          }),
          meta: expect.objectContaining({
            timestamp: expect.any(Date)
          })
        })
      );
    });

    it('should handle authentication errors', () => {
      const middleware = errorHandler();
      const error = new Error('Invalid credentials');
      error.name = 'AuthenticationError';
      (error as any).statusCode = 401;

      middleware(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'UNAUTHORIZED',
            message: 'Invalid credentials',
            name: 'AuthenticationError'
          }),
          meta: expect.objectContaining({
            timestamp: expect.any(Date)
          })
        })
      );
    });

    it('should handle authorization errors', () => {
      const middleware = errorHandler();
      const error = new Error('Access denied');
      error.name = 'AuthorizationError';
      (error as any).statusCode = 403;

      middleware(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'FORBIDDEN',
            message: 'Access denied',
            name: 'AuthorizationError'
          }),
          meta: expect.objectContaining({
            timestamp: expect.any(Date)
          })
        })
      );
    });

    it('should handle not found errors', () => {
      const middleware = errorHandler();
      const error = new Error('Resource not found');
      error.name = 'NotFoundError';
      (error as any).statusCode = 404;

      middleware(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'NOT_FOUND',
            message: 'Resource not found',
            name: 'NotFoundError'
          }),
          meta: expect.objectContaining({
            timestamp: expect.any(Date)
          })
        })
      );
    });

    it('should handle rate limit errors', () => {
      const middleware = errorHandler();
      const error = new Error('Too many requests');
      error.name = 'RateLimitError';
      (error as any).statusCode = 429;

      middleware(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(429);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'TOO_MANY_REQUESTS',
            message: 'Too many requests',
            name: 'RateLimitError'
          }),
          meta: expect.objectContaining({
            timestamp: expect.any(Date)
          })
        })
      );
    });

    it('should handle unknown errors with default status', () => {
      const middleware = errorHandler();
      const error = new Error('Unknown error');
      error.name = 'UnknownError';

      middleware(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'INTERNAL_ERROR',
            message: 'Unknown error',
            name: 'UnknownError'
          }),
          meta: expect.objectContaining({
            timestamp: expect.any(Date)
          })
        })
      );
    });

    it('should handle errors without name property', () => {
      const middleware = errorHandler();
      const error = new Error('Error without name');
      (error as any).name = undefined;

      middleware(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'INTERNAL_ERROR',
            message: 'Error without name'
          }),
          meta: expect.objectContaining({
            timestamp: expect.any(Date)
          })
        })
      );
    });

    it('should handle string errors', () => {
      const middleware = errorHandler();
      const error = 'String error message';

      middleware(error as any, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'INTERNAL_ERROR',
            message: 'String error message'
          }),
          meta: expect.objectContaining({
            timestamp: expect.any(Date)
          })
        })
      );
    });

    it('should handle null/undefined errors', () => {
      const middleware = errorHandler();
      middleware(null as any, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'INTERNAL_ERROR',
            message: 'An unexpected error occurred'
          }),
          meta: expect.objectContaining({
            timestamp: expect.any(Date)
          })
        })
      );
    });

    it('should include request information in error response', () => {
      const middleware = errorHandler();
      const error = new Error('Test error');

      middleware(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'INTERNAL_ERROR',
            message: 'Test error'
          }),
          meta: expect.objectContaining({
            timestamp: expect.any(Date),
            request: {
              method: 'GET',
              url: '/api/test'
            }
          })
        })
      );
    });

    it('should not call next after handling error', () => {
      const middleware = errorHandler();
      const error = new Error('Test error');

      middleware(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('notFoundHandler', () => {
    it('should handle 404 errors', () => {
      notFoundHandler(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'NOT_FOUND',
            message: 'Resource not found',
            details: 'The requested resource could not be found'
          }),
          meta: expect.objectContaining({
            timestamp: expect.any(Date),
            request: {
              method: 'GET',
              url: '/api/test'
            }
          })
        })
      );
    });

    it('should include request information in 404 response', () => {
      notFoundHandler(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'NOT_FOUND',
            message: 'Resource not found',
            details: 'The requested resource could not be found'
          }),
          meta: expect.objectContaining({
            timestamp: expect.any(Date),
            request: {
              method: 'GET',
              url: '/api/test'
            }
          })
        })
      );
    });

    it('should not call next after handling 404', () => {
      notFoundHandler(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('error response formatting', () => {
    it('should always include success: false', () => {
      const middleware = errorHandler();
      const error = new Error('Test error');

      middleware(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false
        })
      );
    });

    it('should always include error object', () => {
      const middleware = errorHandler();
      const error = new Error('Test error');

      middleware(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: expect.any(String),
            message: expect.any(String)
          })
        })
      );
    });

    it('should always include meta object with timestamp', () => {
      const middleware = errorHandler();
      const error = new Error('Test error');

      middleware(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          meta: expect.objectContaining({
            timestamp: expect.any(Date)
          })
        })
      );
    });

    it('should include request information when available', () => {
      const middleware = errorHandler();
      const error = new Error('Test error');

      middleware(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          meta: expect.objectContaining({
            request: expect.objectContaining({
              method: 'GET',
              url: '/api/test'
            })
          })
        })
      );
    });
  });

  describe('error logging', () => {
    it('should log errors to console', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const middleware = errorHandler();
      const error = new Error('Test error');

      middleware(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error:'),
        expect.objectContaining({
          message: 'Test error',
          name: 'Error',
          stack: expect.any(String)
        }),
        expect.objectContaining({
          method: 'GET',
          url: '/api/test'
        })
      );

      consoleSpy.mockRestore();
    });

    it('should log 404 errors to console', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      notFoundHandler(mockRequest as Request, mockResponse as Response, mockNext);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('404:'),
        expect.objectContaining({
          method: 'GET',
          url: '/api/test'
        })
      );

      consoleSpy.mockRestore();
    });
  });
});