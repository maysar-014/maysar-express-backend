/**
 * Authentication Middleware Tests
 * Comprehensive testing for JWT authentication, API key auth, and security features
 * Tests real middleware implementation with deterministic behavior
 * Follows testing constitution: Fast, Isolated, Deterministic, Focused, Readable
 */

import { Request, Response, NextFunction } from 'express';
import {
  authenticate,
  optionalAuthenticate,
  authenticateApiKey,
  bruteForceProtection,
  deviceTracking,
  AuthenticationMiddlewareFactory,
  DEFAULT_AUTH_CONFIG
} from '../authentication.middleware';

const mockRequest = (headers = {}, ip = '127.0.0.1'): Partial<Request> => ({
  headers,
  ip,
  connection: { remoteAddress: ip } as any
});

const mockResponse = (): Partial<Response> => ({
  status: jest.fn().mockReturnThis(),
  json: jest.fn().mockReturnThis()
});

const mockNext = (): NextFunction => jest.fn();

describe('Authentication Middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('authenticate', () => {
    it('should authenticate valid JWT token', async () => {
      const req = mockRequest({
        authorization: 'Bearer valid-jwt-token-123'
      }) as Request;
      const res = mockResponse() as Response;
      const next = mockNext();

      const middleware = authenticate();
      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect((req as any).user).toBeDefined();
      expect((req as any).user.userId).toBe('user-123');
    });

    it('should reject request without token', async () => {
      const req = mockRequest() as Request;
      const res = mockResponse() as Response;
      const next = mockNext();

      const middleware = authenticate();
      await middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'MISSING_TOKEN',
          message: 'Authentication token required'
        }
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject invalid token', async () => {
      const req = mockRequest({
        authorization: 'Bearer invalid'
      }) as Request;
      const res = mockResponse() as Response;
      const next = mockNext();

      const middleware = authenticate();
      await middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid or expired authentication token'
        }
      });
    });

    it('should handle malformed authorization header', async () => {
      const req = mockRequest({
        authorization: 'InvalidFormat'
      }) as Request;
      const res = mockResponse() as Response;
      const next = mockNext();

      const middleware = authenticate();
      await middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'MISSING_TOKEN',
          message: 'Authentication token required'
        }
      });
    });

    it('should handle internal errors gracefully', async () => {
      const req = mockRequest({
        authorization: 'Bearer valid-jwt-token-123'
      }) as Request;
      const res = mockResponse() as Response;
      const next = mockNext();

      // Force an error by making res.status throw
      (res.status as jest.Mock).mockImplementation(() => {
        throw new Error('Internal error');
      });

      const middleware = authenticate();
      await middleware(req, res, next);

      expect(console.error).toHaveBeenCalled();
    });

    it('should enable session logging when configured', async () => {
      const req = mockRequest({
        authorization: 'Bearer valid-jwt-token-123'
      }) as Request;
      const res = mockResponse() as Response;
      const next = mockNext();

      const middleware = authenticate({ enableSessionLogging: true });
      await middleware(req, res, next);

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('[AUTH] User authenticated: user-123')
      );
    });
  });

  describe('optionalAuthenticate', () => {
    it('should authenticate valid token', async () => {
      const req = mockRequest({
        authorization: 'Bearer valid-jwt-token-123'
      }) as Request;
      const res = mockResponse() as Response;
      const next = mockNext();

      const middleware = optionalAuthenticate();
      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect((req as any).user).toBeDefined();
    });

    it('should continue without token as anonymous', async () => {
      const req = mockRequest() as Request;
      const res = mockResponse() as Response;
      const next = mockNext();

      const middleware = optionalAuthenticate();
      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect((req as any).user).toBeNull();
    });

    it('should handle invalid token gracefully', async () => {
      const req = mockRequest({
        authorization: 'Bearer invalid'
      }) as Request;
      const res = mockResponse() as Response;
      const next = mockNext();

      const middleware = optionalAuthenticate();
      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect((req as any).user).toBeNull();
    });

    it('should handle errors gracefully', async () => {
      const req = mockRequest({
        authorization: 'Bearer valid-jwt-token-123'
      }) as Request;
      const res = mockResponse() as Response;
      const next = mockNext();

      // Force an error in processing
      Object.defineProperty(req, 'headers', {
        get: () => { throw new Error('Test error'); }
      });

      const middleware = optionalAuthenticate();
      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect((req as any).user).toBeNull();
    });
  });

  describe('authenticateApiKey', () => {
    it('should authenticate valid API key', async () => {
      const req = mockRequest({
        'x-api-key': 'valid-api-key-123'
      }) as Request;
      const res = mockResponse() as Response;
      const next = mockNext();

      const middleware = authenticateApiKey();
      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect((req as any).service).toBeDefined();
      expect((req as any).service.authenticated).toBe(true);
    });

    it('should reject request without API key', async () => {
      const req = mockRequest() as Request;
      const res = mockResponse() as Response;
      const next = mockNext();

      const middleware = authenticateApiKey();
      await middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'MISSING_API_KEY',
          message: 'API key required for service authentication'
        }
      });
    });

    it('should reject invalid API key', async () => {
      const req = mockRequest({
        'x-api-key': 'invalid-key'
      }) as Request;
      const res = mockResponse() as Response;
      const next = mockNext();

      const middleware = authenticateApiKey();
      await middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INVALID_API_KEY',
          message: 'Invalid API key'
        }
      });
    });

    it('should handle errors gracefully', async () => {
      const req = mockRequest({
        'x-api-key': 'valid-api-key-123'
      }) as Request;
      const res = mockResponse() as Response;
      const next = mockNext();

      // Force an error
      (res.status as jest.Mock).mockImplementation(() => {
        throw new Error('Internal error');
      });

      const middleware = authenticateApiKey();
      await middleware(req, res, next);

      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('bruteForceProtection', () => {
    it('should pass through when protection is disabled', async () => {
      const req = mockRequest() as Request;
      const res = mockResponse() as Response;
      const next = mockNext();

      const middleware = bruteForceProtection({ enableBruteForceProtection: false });
      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should allow requests under attempt limit', async () => {
      const req = mockRequest() as Request;
      const res = mockResponse() as Response;
      const next = mockNext();

      const middleware = bruteForceProtection({ enableBruteForceProtection: true });
      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });

  describe('deviceTracking', () => {
    it('should pass through when tracking is disabled', async () => {
      const req = mockRequest() as Request;
      const res = mockResponse() as Response;
      const next = mockNext();

      const middleware = deviceTracking({ enableDeviceTracking: false });
      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect((req as any).device).toBeUndefined();
    });

    it('should track device when enabled', async () => {
      const req = mockRequest({
        'user-agent': 'Mozilla/5.0 Test Browser'
      }) as Request;
      const res = mockResponse() as Response;
      const next = mockNext();

      const middleware = deviceTracking({ enableDeviceTracking: true });
      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect((req as any).device).toBeDefined();
      expect((req as any).device.deviceId).toBeDefined();
      expect((req as any).device.userAgent).toBe('Mozilla/5.0 Test Browser');
    });
  });

  describe('AuthenticationMiddlewareFactory', () => {
    it('should create JWT auth middleware', () => {
      const middleware = AuthenticationMiddlewareFactory.createJWTAuth();
      expect(typeof middleware).toBe('function');
    });

    it('should create optional auth middleware', () => {
      const middleware = AuthenticationMiddlewareFactory.createOptionalAuth();
      expect(typeof middleware).toBe('function');
    });

    it('should create API key auth middleware', () => {
      const middleware = AuthenticationMiddlewareFactory.createApiKeyAuth();
      expect(typeof middleware).toBe('function');
    });

    it('should create secure stack middleware', () => {
      const middlewares = AuthenticationMiddlewareFactory.createSecureStack();
      expect(Array.isArray(middlewares)).toBe(true);
      expect(middlewares).toHaveLength(3);
    });
  });

  describe('DEFAULT_AUTH_CONFIG', () => {
    it('should have valid default configuration', () => {
      expect(DEFAULT_AUTH_CONFIG.jwtAlgorithm).toBe('HS256');
      expect(DEFAULT_AUTH_CONFIG.tokenExpirationTime).toBe(15 * 60 * 1000);
      expect(DEFAULT_AUTH_CONFIG.enableTokenBlacklisting).toBe(true);
      expect(DEFAULT_AUTH_CONFIG.maxConcurrentSessions).toBe(5);
    });
  });
});