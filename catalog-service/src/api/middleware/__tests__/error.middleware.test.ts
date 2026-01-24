/**
 * Error Middleware Tests
 * Comprehensive testing for error handling middleware
 * Tests real middleware implementation with deterministic behavior
 * Follows testing constitution: Fast, Isolated, Deterministic, Focused, Readable
 */

import { Request, Response, NextFunction } from 'express';
import { errorHandler } from '../error.middleware';

const mockRequest = (): Partial<Request> => ({});

const mockResponse = (): Partial<Response> => ({
  status: jest.fn().mockReturnThis(),
  json: jest.fn().mockReturnThis(),
  locals: {}
});

const mockNext = (): NextFunction => jest.fn();

describe('Error Middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should handle validation errors', () => {
    const error = {
      name: 'ValidationError',
      message: 'Validation failed',
      details: ['Field is required']
    };
    const req = mockRequest() as Request;
    const res = mockResponse() as Response;
    const next = mockNext();

    errorHandler(error, req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: ['Field is required']
      },
      meta: {
        timestamp: expect.any(Date)
      }
    });
  });

  it('should handle authentication errors', () => {
    const error = {
      name: 'AuthenticationError',
      message: 'Invalid token'
    };
    const req = mockRequest() as Request;
    const res = mockResponse() as Response;
    const next = mockNext();

    errorHandler(error, req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: {
        code: 'AUTHENTICATION_ERROR',
        message: 'Invalid token'
      },
      meta: {
        timestamp: expect.any(Date)
      }
    });
  });

  it('should handle authorization errors', () => {
    const error = {
      name: 'AuthorizationError',
      message: 'Insufficient permissions'
    };
    const req = mockRequest() as Request;
    const res = mockResponse() as Response;
    const next = mockNext();

    errorHandler(error, req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: {
        code: 'AUTHORIZATION_ERROR',
        message: 'Insufficient permissions'
      },
      meta: {
        timestamp: expect.any(Date)
      }
    });
  });

  it('should handle not found errors', () => {
    const error = {
      name: 'NotFoundError',
      message: 'Resource not found'
    };
    const req = mockRequest() as Request;
    const res = mockResponse() as Response;
    const next = mockNext();

    errorHandler(error, req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: 'Resource not found'
      },
      meta: {
        timestamp: expect.any(Date)
      }
    });
  });

  it('should handle rate limit errors', () => {
    const error = {
      name: 'RateLimitError',
      message: 'Too many requests'
    };
    const req = mockRequest() as Request;
    const res = mockResponse() as Response;
    const next = mockNext();

    errorHandler(error, req, res, next);

    expect(res.status).toHaveBeenCalledWith(429);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: {
        code: 'RATE_LIMIT_ERROR',
        message: 'Too many requests'
      },
      meta: {
        timestamp: expect.any(Date)
      }
    });
  });

  it('should handle generic errors', () => {
    const error = new Error('Something went wrong');
    const req = mockRequest() as Request;
    const res = mockResponse() as Response;
    const next = mockNext();

    errorHandler(error, req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An internal error occurred'
      },
      meta: {
        timestamp: expect.any(Date)
      }
    });
    expect(console.error).toHaveBeenCalled();
  });

  it('should handle errors with status codes', () => {
    const error = {
      name: 'CustomError',
      message: 'Custom error message',
      statusCode: 422
    };
    const req = mockRequest() as Request;
    const res = mockResponse() as Response;
    const next = mockNext();

    errorHandler(error, req, res, next);

    expect(res.status).toHaveBeenCalledWith(422);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: {
        code: 'CUSTOM_ERROR',
        message: 'Custom error message'
      },
      meta: {
        timestamp: expect.any(Date)
      }
    });
  });
});