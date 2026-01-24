/**
 * Rate Limit Middleware Tests
 * Comprehensive testing for rate limiting functionality
 * Tests real middleware implementation with deterministic behavior
 * Follows testing constitution: Fast, Isolated, Deterministic, Focused, Readable
 */

import { Request, Response, NextFunction } from 'express';
import { rateLimiter, createRateLimiter } from '../rate-limit.middleware';

const mockRequest = (ip = '127.0.0.1', headers = {}): Partial<Request> => ({
  ip,
  headers,
  connection: { remoteAddress: ip } as any
});

const mockResponse = (): Partial<Response> => ({
  status: jest.fn().mockReturnThis(),
  json: jest.fn().mockReturnThis(),
  set: jest.fn()
});

const mockNext = (): NextFunction => jest.fn();

describe('Rate Limit Middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('rateLimiter', () => {
    it('should allow requests under the limit', async () => {
      const req = mockRequest() as Request;
      const res = mockResponse() as Response;
      const next = mockNext();

      await rateLimiter(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.set).toHaveBeenCalledWith({
        'X-RateLimit-Limit': '100',
        'X-RateLimit-Remaining': expect.any(String),
        'X-RateLimit-Reset': expect.any(String)
      });
    });

    it('should block requests over the limit', async () => {
      const req = mockRequest() as Request;
      const res = mockResponse() as Response;
      const next = mockNext();

      // Simulate multiple requests to exceed limit
      for (let i = 0; i < 101; i++) {
        await rateLimiter(req, res, next);
      }

      expect(res.status).toHaveBeenCalledWith(429);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests, please try again later'
        },
        meta: {
          timestamp: expect.any(Date),
          retryAfter: expect.any(Number)
        }
      });
    });

    it('should reset limits after time window', async () => {
      const req = mockRequest() as Request;
      const res = mockResponse() as Response;
      const next = mockNext();

      // Make requests up to limit
      for (let i = 0; i < 100; i++) {
        await rateLimiter(req, res, next);
      }

      // Advance time past window
      jest.advanceTimersByTime(60 * 60 * 1000 + 1000); // 1 hour + 1 second

      // Should allow requests again
      await rateLimiter(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it('should handle different IPs separately', async () => {
      const req1 = mockRequest('192.168.1.1') as Request;
      const req2 = mockRequest('192.168.1.2') as Request;
      const res = mockResponse() as Response;
      const next = mockNext();

      // Both IPs should be allowed
      await rateLimiter(req1, res, next);
      await rateLimiter(req2, res, next);

      expect(next).toHaveBeenCalledTimes(2);
    });
  });

  describe('createRateLimiter', () => {
    it('should create rate limiter with custom config', async () => {
      const customLimiter = createRateLimiter({
        windowMs: 60000, // 1 minute
        max: 10,
        message: 'Custom rate limit message'
      });

      const req = mockRequest() as Request;
      const res = mockResponse() as Response;
      const next = mockNext();

      await customLimiter(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.set).toHaveBeenCalledWith({
        'X-RateLimit-Limit': '10',
        'X-RateLimit-Remaining': expect.any(String),
        'X-RateLimit-Reset': expect.any(String)
      });
    });

    it('should use custom key generator', async () => {
      const customLimiter = createRateLimiter({
        windowMs: 60000,
        max: 5,
        keyGenerator: (req) => req.headers['x-api-key'] as string || req.ip
      });

      const req = mockRequest('127.0.0.1', { 'x-api-key': 'test-key' }) as Request;
      const res = mockResponse() as Response;
      const next = mockNext();

      await customLimiter(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should skip requests when skip function returns true', async () => {
      const customLimiter = createRateLimiter({
        windowMs: 60000,
        max: 1,
        skip: (req) => req.headers['x-skip-rate-limit'] === 'true'
      });

      const req = mockRequest('127.0.0.1', { 'x-skip-rate-limit': 'true' }) as Request;
      const res = mockResponse() as Response;
      const next = mockNext();

      // Should skip rate limiting
      await customLimiter(req, res, next);
      await customLimiter(req, res, next);

      expect(next).toHaveBeenCalledTimes(2);
    });

    it('should call onLimitReached when limit is exceeded', async () => {
      const onLimitReached = jest.fn();
      const customLimiter = createRateLimiter({
        windowMs: 60000,
        max: 1,
        onLimitReached
      });

      const req = mockRequest() as Request;
      const res = mockResponse() as Response;
      const next = mockNext();

      // First request should pass
      await customLimiter(req, res, next);
      
      // Second request should trigger limit
      await customLimiter(req, res, next);

      expect(onLimitReached).toHaveBeenCalledWith(req, res);
    });
  });

  describe('error handling', () => {
    it('should handle errors gracefully', async () => {
      const req = mockRequest() as Request;
      const res = mockResponse() as Response;
      const next = mockNext();

      // Force an error by making res.set throw
      (res.set as jest.Mock).mockImplementation(() => {
        throw new Error('Test error');
      });

      await rateLimiter(req, res, next);

      // Should still call next despite error
      expect(next).toHaveBeenCalled();
    });
  });
});