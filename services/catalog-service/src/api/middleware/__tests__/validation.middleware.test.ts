/**
 * Validation Middleware Tests
 * Comprehensive testing for request validation functionality
 * Tests real middleware implementation with deterministic behavior
 * Follows testing constitution: Fast, Isolated, Deterministic, Focused, Readable
 */

import { Request, Response, NextFunction } from 'express';
import { validateRequest, createValidator } from '../validation.middleware';

const mockRequest = (body = {}, params = {}, query = {}): Partial<Request> => ({
  body,
  params,
  query
});

const mockResponse = (): Partial<Response> => ({
  status: jest.fn().mockReturnThis(),
  json: jest.fn().mockReturnThis()
});

const mockNext = (): NextFunction => jest.fn();

describe('Validation Middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('validateRequest', () => {
    it('should validate request body successfully', async () => {
      const schema = {
        body: {
          name: { required: true, type: 'string' },
          email: { required: true, type: 'string', format: 'email' }
        }
      };

      const req = mockRequest({
        name: 'John Doe',
        email: 'john@example.com'
      }) as Request;
      const res = mockResponse() as Response;
      const next = mockNext();

      const validator = validateRequest(schema);
      await validator(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should reject invalid request body', async () => {
      const schema = {
        body: {
          name: { required: true, type: 'string' },
          email: { required: true, type: 'string', format: 'email' }
        }
      };

      const req = mockRequest({
        name: '',
        email: 'invalid-email'
      }) as Request;
      const res = mockResponse() as Response;
      const next = mockNext();

      const validator = validateRequest(schema);
      await validator(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Request validation failed',
          details: expect.any(Array)
        },
        meta: {
          timestamp: expect.any(Date)
        }
      });
    });

    it('should validate query parameters', async () => {
      const schema = {
        query: {
          page: { type: 'number', min: 1 },
          limit: { type: 'number', min: 1, max: 100 }
        }
      };

      const req = mockRequest({}, {}, {
        page: '1',
        limit: '20'
      }) as Request;
      const res = mockResponse() as Response;
      const next = mockNext();

      const validator = validateRequest(schema);
      await validator(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should validate path parameters', async () => {
      const schema = {
        params: {
          id: { required: true, type: 'string', format: 'uuid' }
        }
      };

      const req = mockRequest({}, {
        id: '123e4567-e89b-12d3-a456-426614174000'
      }) as Request;
      const res = mockResponse() as Response;
      const next = mockNext();

      const validator = validateRequest(schema);
      await validator(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should handle missing required fields', async () => {
      const schema = {
        body: {
          name: { required: true, type: 'string' },
          email: { required: true, type: 'string' }
        }
      };

      const req = mockRequest({}) as Request;
      const res = mockResponse() as Response;
      const next = mockNext();

      const validator = validateRequest(schema);
      await validator(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Request validation failed',
          details: expect.arrayContaining([
            expect.stringContaining('name is required'),
            expect.stringContaining('email is required')
          ])
        },
        meta: {
          timestamp: expect.any(Date)
        }
      });
    });

    it('should validate data types', async () => {
      const schema = {
        body: {
          age: { type: 'number' },
          active: { type: 'boolean' },
          tags: { type: 'array' }
        }
      };

      const req = mockRequest({
        age: 'not-a-number',
        active: 'not-a-boolean',
        tags: 'not-an-array'
      }) as Request;
      const res = mockResponse() as Response;
      const next = mockNext();

      const validator = validateRequest(schema);
      await validator(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should validate string length constraints', async () => {
      const schema = {
        body: {
          name: { type: 'string', minLength: 2, maxLength: 50 },
          description: { type: 'string', maxLength: 200 }
        }
      };

      const req = mockRequest({
        name: 'A', // Too short
        description: 'A'.repeat(201) // Too long
      }) as Request;
      const res = mockResponse() as Response;
      const next = mockNext();

      const validator = validateRequest(schema);
      await validator(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should validate number constraints', async () => {
      const schema = {
        body: {
          price: { type: 'number', min: 0, max: 10000 },
          quantity: { type: 'number', min: 1 }
        }
      };

      const req = mockRequest({
        price: -10, // Below minimum
        quantity: 0 // Below minimum
      }) as Request;
      const res = mockResponse() as Response;
      const next = mockNext();

      const validator = validateRequest(schema);
      await validator(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should validate email format', async () => {
      const schema = {
        body: {
          email: { type: 'string', format: 'email' }
        }
      };

      const req = mockRequest({
        email: 'invalid-email-format'
      }) as Request;
      const res = mockResponse() as Response;
      const next = mockNext();

      const validator = validateRequest(schema);
      await validator(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should validate UUID format', async () => {
      const schema = {
        params: {
          id: { type: 'string', format: 'uuid' }
        }
      };

      const req = mockRequest({}, {
        id: 'not-a-uuid'
      }) as Request;
      const res = mockResponse() as Response;
      const next = mockNext();

      const validator = validateRequest(schema);
      await validator(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('createValidator', () => {
    it('should create custom validator', async () => {
      const customValidator = createValidator({
        sanitize: true,
        allowUnknown: false,
        stripUnknown: true
      });

      const schema = {
        body: {
          name: { required: true, type: 'string' }
        }
      };

      const req = mockRequest({
        name: '  John Doe  ', // Should be sanitized
        extra: 'should be stripped' // Should be removed
      }) as Request;
      const res = mockResponse() as Response;
      const next = mockNext();

      const validator = customValidator(schema);
      await validator(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.body.name).toBe('John Doe'); // Trimmed
      expect(req.body.extra).toBeUndefined(); // Stripped
    });

    it('should handle custom validation functions', async () => {
      const schema = {
        body: {
          password: {
            type: 'string',
            custom: (value: string) => {
              if (value.length < 8) {
                return 'Password must be at least 8 characters';
              }
              if (!/[A-Z]/.test(value)) {
                return 'Password must contain uppercase letter';
              }
              return null;
            }
          }
        }
      };

      const req = mockRequest({
        password: 'weak'
      }) as Request;
      const res = mockResponse() as Response;
      const next = mockNext();

      const validator = validateRequest(schema);
      await validator(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('error handling', () => {
    it('should handle validation errors gracefully', async () => {
      const schema = {
        body: {
          name: { required: true, type: 'string' }
        }
      };

      const req = mockRequest({}) as Request;
      const res = mockResponse() as Response;
      const next = mockNext();

      // Force an error by making res.status throw
      (res.status as jest.Mock).mockImplementation(() => {
        throw new Error('Test error');
      });

      const validator = validateRequest(schema);
      await validator(req, res, next);

      // Should handle error gracefully
      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });
});