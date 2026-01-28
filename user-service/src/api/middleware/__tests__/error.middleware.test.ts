import { APIError, errorHandler, asyncHandler, createError, notFoundHandler } from '../error.middleware';
import { logger } from '../../../infrastructure/services/logger.service';

jest.mock('../../../infrastructure/services/logger.service');

describe('error.middleware', () => {
  let mockReq: any;
  let mockRes: any;
  let mockNext: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockReq = {
      method: 'GET',
      url: '/test',
      path: '/test',
      ip: '127.0.0.1',
      get: jest.fn().mockReturnValue('Test/1.0')
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    mockNext = jest.fn();
  });

  describe('APIError class', () => {
    it('should create APIError with all properties', () => {
      const error = new APIError('Test error', 400, true, 'TEST_CODE');
      expect(error.message).toBe('Test error');
      expect(error.statusCode).toBe(400);
      expect(error.isOperational).toBe(true);
      expect(error.code).toBe('TEST_CODE');
    });

    it('should create APIError with default values', () => {
      const error = new APIError('Test error');
      expect(error.statusCode).toBe(500);
      expect(error.isOperational).toBe(true);
      expect(error.code).toBeUndefined();
    });

    it('should capture stack trace', () => {
      const error = new APIError('Test error');
      expect(error.stack).toBeDefined();
    });
  });

  describe('errorHandler - APIError handling', () => {
    it('should handle APIError with custom status code', () => {
      const err = new APIError('Bad request', 400, true, 'BAD_REQUEST');
      errorHandler(err, mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            message: 'Bad request',
            code: 'BAD_REQUEST'
          })
        })
      );
    });

    it('should log errors with status >= 500 as error', () => {
      const err = new APIError('Server error', 500, false);
      errorHandler(err, mockReq, mockRes, mockNext);

      expect(logger.error).toHaveBeenCalled();
    });

    it('should log errors with status < 500 as warn', () => {
      const err = new APIError('Bad request', 400, true);
      errorHandler(err, mockReq, mockRes, mockNext);

      expect(logger.warn).toHaveBeenCalled();
    });
  });

  describe('errorHandler - Validation errors', () => {
    it('should handle ValidationError', () => {
      const err: any = new Error('Validation failed');
      err.name = 'ValidationError';
      err.details = [{ message: 'Field required' }];

      errorHandler(err, mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            message: 'Validation failed',
            code: 'VALIDATION_ERROR'
          })
        })
      );
    });
  });

  describe('errorHandler - Prisma errors', () => {
    it('should map Prisma P2002 (duplicate) to 409', () => {
      const err: any = new Error('Unique constraint failed');
      err.name = 'PrismaClientKnownRequestError';
      err.code = 'P2002';

      errorHandler(err, mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(409);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            message: 'Resource already exists',
            code: 'DUPLICATE_ENTRY'
          })
        })
      );
    });

    it('should map Prisma P2025 (not found) to 404', () => {
      const err: any = new Error('Record not found');
      err.name = 'PrismaClientKnownRequestError';
      err.code = 'P2025';

      errorHandler(err, mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            message: 'Resource not found',
            code: 'NOT_FOUND'
          })
        })
      );
    });

    it('should handle unknown Prisma error codes', () => {
      const err: any = new Error('Unknown error');
      err.name = 'PrismaClientKnownRequestError';
      err.code = 'P9999';

      errorHandler(err, mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            message: 'Database error',
            code: 'DATABASE_ERROR'
          })
        })
      );
    });

    it('should handle PrismaClientValidationError', () => {
      const err: any = new Error('Invalid data');
      err.name = 'PrismaClientValidationError';

      errorHandler(err, mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            message: 'Invalid data provided',
            code: 'VALIDATION_ERROR'
          })
        })
      );
    });
  });

  describe('errorHandler - JWT errors', () => {
    it('should handle JsonWebTokenError', () => {
      const err: any = new Error('Invalid token');
      err.name = 'JsonWebTokenError';

      errorHandler(err, mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            message: 'Invalid authentication token',
            code: 'INVALID_TOKEN'
          })
        })
      );
    });

    it('should handle TokenExpiredError', () => {
      const err: any = new Error('Token expired');
      err.name = 'TokenExpiredError';

      errorHandler(err, mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            message: 'Authentication token expired',
            code: 'TOKEN_EXPIRED'
          })
        })
      );
    });
  });

  describe('errorHandler - Response formatting', () => {
    it('should include stack trace in development mode', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const err = new APIError('Test error', 400);
      errorHandler(err, mockReq, mockRes, mockNext);

      const response = (mockRes.json as jest.Mock).mock.calls[0][0];
      expect(response.error.stack).toBeDefined();

      process.env.NODE_ENV = originalEnv;
    });

    it('should not include stack trace in production mode', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const err = new APIError('Test error', 400);
      errorHandler(err, mockReq, mockRes, mockNext);

      const response = (mockRes.json as jest.Mock).mock.calls[0][0];
      expect(response.error.stack).toBeUndefined();

      process.env.NODE_ENV = originalEnv;
    });

    it('should mask 500 errors in production', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const err = new APIError('Sensitive error', 500);
      errorHandler(err, mockReq, mockRes, mockNext);

      const response = (mockRes.json as jest.Mock).mock.calls[0][0];
      expect(response.error.message).toBe('An unexpected error occurred');

      process.env.NODE_ENV = originalEnv;
    });

    it('should include request metadata in error response', () => {
      const err = new APIError('Test error', 400);
      errorHandler(err, mockReq, mockRes, mockNext);

      const response = (mockRes.json as jest.Mock).mock.calls[0][0];
      expect(response.error.path).toBe('/test');
      expect(response.error.method).toBe('GET');
      expect(response.error.timestamp).toBeDefined();
    });
  });

  describe('asyncHandler', () => {
    it('should catch rejected promises and forward to next', async () => {
      const fn = () => Promise.reject(new Error('boom'));
      const wrapped = asyncHandler(fn);

      wrapped(mockReq, mockRes, mockNext);
      await new Promise((r) => setImmediate(r));

      expect(mockNext).toHaveBeenCalled();
      expect(mockNext.mock.calls[0][0]).toBeInstanceOf(Error);
    });

    it('should handle successful async operations', async () => {
      const fn = jest.fn().mockResolvedValue(undefined);
      const wrapped = asyncHandler(fn);

      wrapped(mockReq, mockRes, mockNext);
      await new Promise((r) => setImmediate(r));

      expect(fn).toHaveBeenCalledWith(mockReq, mockRes, mockNext);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('createError helpers', () => {
    it('should create badRequest error', () => {
      const err = createError.badRequest('Invalid input', 'INVALID_INPUT');
      expect(err.statusCode).toBe(400);
      expect(err.message).toBe('Invalid input');
      expect(err.code).toBe('INVALID_INPUT');
    });

    it('should create unauthorized error', () => {
      const err = createError.unauthorized('Not authenticated', 'NOT_AUTH');
      expect(err.statusCode).toBe(401);
      expect(err.message).toBe('Not authenticated');
      expect(err.code).toBe('NOT_AUTH');
    });

    it('should create unauthorized error with default message', () => {
      const err = createError.unauthorized();
      expect(err.message).toBe('Authentication required');
    });

    it('should create forbidden error', () => {
      const err = createError.forbidden('Access denied', 'NO_ACCESS');
      expect(err.statusCode).toBe(403);
      expect(err.message).toBe('Access denied');
      expect(err.code).toBe('NO_ACCESS');
    });

    it('should create forbidden error with default message', () => {
      const err = createError.forbidden();
      expect(err.message).toBe('Access denied');
    });

    it('should create notFound error', () => {
      const err = createError.notFound('User not found', 'USER_NOT_FOUND');
      expect(err.statusCode).toBe(404);
      expect(err.message).toBe('User not found');
      expect(err.code).toBe('USER_NOT_FOUND');
    });

    it('should create notFound error with default message', () => {
      const err = createError.notFound();
      expect(err.message).toBe('Resource not found');
    });

    it('should create conflict error', () => {
      const err = createError.conflict('Resource exists', 'EXISTS');
      expect(err.statusCode).toBe(409);
      expect(err.message).toBe('Resource exists');
      expect(err.code).toBe('EXISTS');
    });

    it('should create unprocessableEntity error', () => {
      const err = createError.unprocessableEntity('Invalid entity', 'INVALID');
      expect(err.statusCode).toBe(422);
      expect(err.message).toBe('Invalid entity');
      expect(err.code).toBe('INVALID');
    });

    it('should create tooManyRequests error', () => {
      const err = createError.tooManyRequests('Rate limited', 'RATE_LIMITED');
      expect(err.statusCode).toBe(429);
      expect(err.message).toBe('Rate limited');
      expect(err.code).toBe('RATE_LIMITED');
    });

    it('should create tooManyRequests error with default message', () => {
      const err = createError.tooManyRequests();
      expect(err.message).toBe('Too many requests');
    });

    it('should create internalServerError', () => {
      const err = createError.internalServerError('Server error', 'SERVER_ERROR');
      expect(err.statusCode).toBe(500);
      expect(err.message).toBe('Server error');
      expect(err.code).toBe('SERVER_ERROR');
      expect(err.isOperational).toBe(false);
    });

    it('should create internalServerError with default message', () => {
      const err = createError.internalServerError();
      expect(err.message).toBe('Internal server error');
    });
  });

  describe('notFoundHandler', () => {
    it('should create 404 error for unknown routes', () => {
      notFoundHandler(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      const error = mockNext.mock.calls[0][0];
      expect(error).toBeInstanceOf(APIError);
      expect(error.statusCode).toBe(404);
      expect(error.code).toBe('ROUTE_NOT_FOUND');
    });

    it('should include route information in error message', () => {
      mockReq.method = 'POST';
      mockReq.path = '/api/unknown';

      notFoundHandler(mockReq, mockRes, mockNext);

      const error = mockNext.mock.calls[0][0];
      expect(error.message).toContain('POST');
      expect(error.message).toContain('/api/unknown');
    });
  });
});
