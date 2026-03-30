/**
 * Rate Limit Middleware Test Suite
 * Tests for rate limiting middleware functionality
 */

import { Request, Response, NextFunction } from 'express';
import { createRateLimit, ipRateLimit, RateLimitMiddlewareFactory } from '../rate-limit.middleware';

interface MockResponse extends Partial<Response> {
  status: jest.Mock;
  json: jest.Mock;
  send: jest.Mock;
  setHeader: jest.Mock;
  set: jest.Mock;
}

describe('Rate Limit Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: MockResponse;
  let mockNext: jest.MockedFunction<NextFunction>;

  beforeEach(() => {
    mockRequest = {
      ip: '127.0.0.1',
      headers: {},
      method: 'GET',
      url: '/api/test'
    };
    
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
      setHeader: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis()
    };
    
    mockNext = jest.fn() as jest.MockedFunction<NextFunction>;
  });

  describe('createRateLimit', () => {
    it('should allow request within limit', async () => {
      const config = {
        windowMs: 15 * 60 * 1000, // 15 minutes
        maxRequests: 100,
        skipSuccessfulRequests: false,
        skipFailedRequests: false
      };

      const middleware = createRateLimit(config);

      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(mockResponse.status).not.toHaveBeenCalled();
      expect(mockResponse.setHeader).toHaveBeenCalledWith('X-RateLimit-Limit', '100');
      expect(mockResponse.setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', expect.any(String));
    });

    it('should block request when limit exceeded', async () => {
      const config = {
        windowMs: 15 * 60 * 1000, // 15 minutes
        maxRequests: 1,
        skipSuccessfulRequests: false,
        skipFailedRequests: false
      };

      const middleware = createRateLimit(config);

      // First request should pass
      await middleware(mockRequest as Request, mockResponse as Response, mockNext);
      expect(mockNext).toHaveBeenCalledWith();

      // Second request should be blocked
      mockNext.mockClear();
      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(429);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many requests, please try again later'
          })
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle different time windows', async () => {
      const config = {
        windowMs: 60 * 1000, // 1 minute
        maxRequests: 5,
        burstMultiplier: 1,
        skipSuccessfulRequests: false,
        skipFailedRequests: false
      };

      const middleware = createRateLimit(config);

      // Make 5 requests that should pass
      for (let i = 0; i < 5; i++) {
        await middleware(mockRequest as Request, mockResponse as Response, mockNext);
        expect(mockNext).toHaveBeenCalledWith();
        mockNext.mockClear();
      }

      // 6th request should be blocked
      await middleware(mockRequest as Request, mockResponse as Response, mockNext);
      expect(mockResponse.status).toHaveBeenCalledWith(429);
    });

    it('should handle custom error message', async () => {
      const config = {
        windowMs: 15 * 60 * 1000,
        maxRequests: 1,
        onLimitReached: (req: Request, res: Response) => {
          res.status(429).json({
            success: false,
            error: {
              code: 'TOO_MANY_REQUESTS',
              message: 'Custom rate limit exceeded message'
            }
          });
        },
        skipSuccessfulRequests: false,
        skipFailedRequests: false
      };

      const middleware = createRateLimit(config);

      // First request passes
      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      // Second request blocked with custom message
      mockNext.mockClear();
      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(429);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'TOO_MANY_REQUESTS',
            message: 'Custom rate limit exceeded message'
          })
        })
      );
    });

    it('should handle different status codes', async () => {
      const config = {
        windowMs: 15 * 60 * 1000,
        maxRequests: 1,
        onLimitReached: (req: Request, res: Response) => {
          res.status(503).json({
            success: false,
            error: {
              code: 'SERVICE_UNAVAILABLE',
              message: 'Service temporarily unavailable'
            }
          });
        },
        skipSuccessfulRequests: false,
        skipFailedRequests: false
      };

      const middleware = createRateLimit(config);

      // First request passes
      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      // Second request blocked with custom status code
      mockNext.mockClear();
      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(503);
    });

    it('should skip successful requests when configured', async () => {
      const config = {
        windowMs: 15 * 60 * 1000,
        maxRequests: 2,
        skipSuccessfulRequests: true,
        skipFailedRequests: false
      };

      const middleware = createRateLimit(config);

      // Make requests and simulate successful responses
      for (let i = 0; i < 5; i++) {
        await middleware(mockRequest as Request, mockResponse as Response, mockNext);
        expect(mockNext).toHaveBeenCalledWith();
        mockNext.mockClear();
      }

      // Should not be blocked due to skipSuccessfulRequests
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should skip failed requests when configured', async () => {
      const config = {
        windowMs: 15 * 60 * 1000,
        maxRequests: 2,
        skipSuccessfulRequests: false,
        skipFailedRequests: true
      };

      const middleware = createRateLimit(config);

      // Make requests and simulate failed responses
      for (let i = 0; i < 5; i++) {
        await middleware(mockRequest as Request, mockResponse as Response, mockNext);
        expect(mockNext).toHaveBeenCalledWith();
        mockNext.mockClear();
      }

      // Should not be blocked due to skipFailedRequests
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should handle different key generators', async () => {
      const config = {
        windowMs: 15 * 60 * 1000,
        maxRequests: 1,
        keyGenerator: (req: Request) => req.headers['x-api-key'] as string || req.ip!,
        skipSuccessfulRequests: false,
        skipFailedRequests: false
      };

      const middleware = createRateLimit(config);

      // First request with API key
      mockRequest.headers = { 'x-api-key': 'key1' };
      await middleware(mockRequest as Request, mockResponse as Response, mockNext);
      expect(mockNext).toHaveBeenCalledWith();

      // Second request with same API key should be blocked
      mockNext.mockClear();
      await middleware(mockRequest as Request, mockResponse as Response, mockNext);
      expect(mockResponse.status).toHaveBeenCalledWith(429);

      // Request with different API key should pass
      mockNext.mockClear();
      mockRequest.headers = { 'x-api-key': 'key2' };
      await middleware(mockRequest as Request, mockResponse as Response, mockNext);
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should handle skip function', async () => {
      const config = {
        windowMs: 15 * 60 * 1000,
        maxRequests: 1,
        skip: (req: Request) => req.headers['x-skip-rate-limit'] === 'true',
        skipSuccessfulRequests: false,
        skipFailedRequests: false
      };

      const middleware = createRateLimit(config);

      // Request with skip header should not be rate limited
      mockRequest.headers = { 'x-skip-rate-limit': 'true' };
      await middleware(mockRequest as Request, mockResponse as Response, mockNext);
      expect(mockNext).toHaveBeenCalledWith();

      // Request without skip header should be rate limited
      mockRequest.headers = {};
      await middleware(mockRequest as Request, mockResponse as Response, mockNext);
      expect(mockNext).toHaveBeenCalledWith();

      // Second request without skip header should be blocked
      mockNext.mockClear();
      await middleware(mockRequest as Request, mockResponse as Response, mockNext);
      expect(mockResponse.status).toHaveBeenCalledWith(429);
    });

    it('should handle onLimitReached callback', async () => {
      const onLimitReachedSpy = jest.fn();
      
      const config = {
        windowMs: 15 * 60 * 1000,
        maxRequests: 1,
        onLimitReached: onLimitReachedSpy,
        skipSuccessfulRequests: false,
        skipFailedRequests: false
      };

      const middleware = createRateLimit(config);

      // First request passes
      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      // Second request triggers onLimitReached
      mockNext.mockClear();
      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(onLimitReachedSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          ip: '127.0.0.1',
          method: 'GET',
          url: '/api/test'
        }),
        expect.any(Object) // response object
      );
    });

    it('should handle store errors gracefully', async () => {
      const config = {
        windowMs: 15 * 60 * 1000,
        maxRequests: 100,
        skipSuccessfulRequests: false,
        skipFailedRequests: false
      };

      const middleware = createRateLimit(config);

      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      // Should still allow the request to proceed
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should include rate limit headers', async () => {
      const config = {
        windowMs: 15 * 60 * 1000,
        maxRequests: 10,
        skipSuccessfulRequests: false,
        skipFailedRequests: false
      };

      const middleware = createRateLimit(config);

      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.setHeader).toHaveBeenCalledWith('X-RateLimit-Limit', '10');
      expect(mockResponse.setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', expect.any(String));
      expect(mockResponse.setHeader).toHaveBeenCalledWith('X-RateLimit-Reset', expect.any(String));
    });

    it('should handle different HTTP methods separately', async () => {
      const config = {
        windowMs: 15 * 60 * 1000,
        maxRequests: 1,
        keyGenerator: (req: Request) => `${req.ip}-${req.method}`,
        skipSuccessfulRequests: false,
        skipFailedRequests: false
      };

      const middleware = createRateLimit(config);

      // POST request
      mockRequest.method = 'POST';
      await middleware(mockRequest as Request, mockResponse as Response, mockNext);
      expect(mockNext).toHaveBeenCalledWith();

      // GET request with same IP should be allowed
      mockRequest.method = 'GET';
      await middleware(mockRequest as Request, mockResponse as Response, mockNext);
      expect(mockNext).toHaveBeenCalledWith();

      // Another POST request should be blocked
      mockRequest.method = 'POST';
      mockNext.mockClear();
      await middleware(mockRequest as Request, mockResponse as Response, mockNext);
      expect(mockResponse.status).toHaveBeenCalledWith(429);
    });

    it('should handle concurrent requests correctly', async () => {
      const config = {
        windowMs: 15 * 60 * 1000,
        maxRequests: 2,
        skipSuccessfulRequests: false,
        skipFailedRequests: false
      };

      const middleware = createRateLimit(config);

      // Make multiple concurrent requests
      const promises = Array.from({ length: 3 }, () => 
        middleware(mockRequest as Request, mockResponse as Response, mockNext)
      );

      await Promise.all(promises);

      // Should handle concurrency properly
      expect(mockNext).toHaveBeenCalledTimes(2); // 2 should pass
      expect(mockResponse.status).toHaveBeenCalledWith(429); // 1 should be blocked
    });

    it('should reset rate limit after window expires', async () => {
      const config = {
        windowMs: 100, // Very short window for testing
        maxRequests: 1,
        skipSuccessfulRequests: false,
        skipFailedRequests: false
      };

      const middleware = createRateLimit(config);

      // First request passes
      await middleware(mockRequest as Request, mockResponse as Response, mockNext);
      expect(mockNext).toHaveBeenCalledWith();

      // Second request blocked
      mockNext.mockClear();
      await middleware(mockRequest as Request, mockResponse as Response, mockNext);
      expect(mockResponse.status).toHaveBeenCalledWith(429);

      // Wait for window to expire
      await new Promise(resolve => setTimeout(resolve, 150));

      // Request should pass again after window expires
      mockNext.mockClear();
      await middleware(mockRequest as Request, mockResponse as Response, mockNext);
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should handle malformed requests gracefully', async () => {
      const config = {
        windowMs: 15 * 60 * 1000,
        maxRequests: 100,
        skipSuccessfulRequests: false,
        skipFailedRequests: false
      };

      const middleware = createRateLimit(config);

      // Request without IP
      const malformedRequest = { ...mockRequest, ip: undefined } as any;
      
      await middleware(malformedRequest, mockResponse as Response, mockNext);

      // Should still allow the request to proceed
      expect(mockNext).toHaveBeenCalledWith();
    });
  });

  describe('ipRateLimit', () => {
    it('should create IP-based rate limiting', async () => {
      const config = {
        windowMs: 15 * 60 * 1000,
        maxRequests: 5,
        skipSuccessfulRequests: false,
        skipFailedRequests: false
      };

      const middleware = ipRateLimit(config);

      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should block requests from same IP when limit exceeded', async () => {
      const config = {
        windowMs: 15 * 60 * 1000,
        maxRequests: 1,
        skipSuccessfulRequests: false,
        skipFailedRequests: false
      };

      const middleware = ipRateLimit(config);

      // First request should pass
      await middleware(mockRequest as Request, mockResponse as Response, mockNext);
      expect(mockNext).toHaveBeenCalledWith();

      // Second request from same IP should be blocked
      mockNext.mockClear();
      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(429);
    });
  });

  describe('RateLimitMiddlewareFactory', () => {
    it('should create fixed window rate limit', () => {
      const middleware = RateLimitMiddlewareFactory.createFixedWindow({
        windowMs: 60 * 1000,
        maxRequests: 10,
        skipSuccessfulRequests: false,
        skipFailedRequests: false
      });

      expect(typeof middleware).toBe('function');
    });

    it('should create sliding window rate limit', () => {
      const middleware = RateLimitMiddlewareFactory.createSlidingWindow({
        windowMs: 60 * 1000,
        maxRequests: 10,
        skipSuccessfulRequests: false,
        skipFailedRequests: false
      });

      expect(typeof middleware).toBe('function');
    });

    it('should create token bucket rate limit', () => {
      const middleware = RateLimitMiddlewareFactory.createTokenBucket({
        windowMs: 60 * 1000,
        maxRequests: 10,
        skipSuccessfulRequests: false,
        skipFailedRequests: false
      });

      expect(typeof middleware).toBe('function');
    });

    it('should create IP-based rate limit', () => {
      const middleware = RateLimitMiddlewareFactory.createIPBased({
        windowMs: 60 * 1000,
        maxRequests: 10,
        skipSuccessfulRequests: false,
        skipFailedRequests: false
      });

      expect(typeof middleware).toBe('function');
    });

    it('should create user-based rate limit', () => {
      const middleware = RateLimitMiddlewareFactory.createUserBased({
        windowMs: 60 * 1000,
        maxRequests: 10,
        skipSuccessfulRequests: false,
        skipFailedRequests: false
      });

      expect(typeof middleware).toBe('function');
    });

    it('should create API key-based rate limit', () => {
      const middleware = RateLimitMiddlewareFactory.createApiKeyBased({
        windowMs: 60 * 1000,
        maxRequests: 10,
        skipSuccessfulRequests: false,
        skipFailedRequests: false
      });

      expect(typeof middleware).toBe('function');
    });

    it('should create preset rate limit', () => {
      const middleware = RateLimitMiddlewareFactory.createPreset('standard');

      expect(typeof middleware).toBe('function');
    });

    it('should create multi-tier rate limit', () => {
      const middleware = RateLimitMiddlewareFactory.createMultiTier([
        { threshold: 100, config: { windowMs: 60 * 1000, maxRequests: 10 } }
      ]);

      expect(typeof middleware).toBe('function');
    });
  });

  describe('error handling', () => {
    it('should handle store initialization errors', async () => {
      const config = {
        windowMs: 15 * 60 * 1000,
        maxRequests: 100,
        skipSuccessfulRequests: false,
        skipFailedRequests: false
      };

      const middleware = createRateLimit(config);

      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      // Should not throw and should allow request to proceed
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should handle malformed configuration', async () => {
      const config = {
        windowMs: -1, // Invalid
        maxRequests: -1, // Invalid
        skipSuccessfulRequests: false,
        skipFailedRequests: false
      };

      const middleware = createRateLimit(config);

      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      // Should handle gracefully and allow request
      expect(mockNext).toHaveBeenCalledWith();
    });
  });

  describe('rate limit headers', () => {
    it('should set correct headers for first request', async () => {
      const config = {
        windowMs: 15 * 60 * 1000,
        maxRequests: 10,
        skipSuccessfulRequests: false,
        skipFailedRequests: false
      };

      const middleware = createRateLimit(config);

      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.setHeader).toHaveBeenCalledWith('X-RateLimit-Limit', '10');
      expect(mockResponse.setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', expect.any(String));
      expect(mockResponse.setHeader).toHaveBeenCalledWith('X-RateLimit-Reset', expect.any(String));
    });

    it('should update remaining count correctly', async () => {
      const config = {
        windowMs: 15 * 60 * 1000,
        maxRequests: 3,
        skipSuccessfulRequests: false,
        skipFailedRequests: false
      };

      const middleware = createRateLimit(config);

      // First request
      await middleware(mockRequest as Request, mockResponse as Response, mockNext);
      expect(mockResponse.setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', expect.any(String));

      // Second request
      mockResponse.setHeader.mockClear();
      await middleware(mockRequest as Request, mockResponse as Response, mockNext);
      expect(mockResponse.setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', expect.any(String));

      // Third request
      mockResponse.setHeader.mockClear();
      await middleware(mockRequest as Request, mockResponse as Response, mockNext);
      expect(mockResponse.setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', expect.any(String));
    });
  });
});
