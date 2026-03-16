/**
 * Authentication Middleware Test Suite
 * Tests for authentication middleware functionality
 */

import { Request, Response, NextFunction } from 'express';
import { authenticate, optionalAuthenticate, authenticateApiKey, bruteForceProtection, deviceTracking } from '../authentication.middleware';

describe('Authentication Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockRequest = {
      headers: {},
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

  describe('authenticate', () => {
    it('should authenticate valid token successfully', async () => {
      const middleware = authenticate();
      
      mockRequest.headers = { authorization: 'Bearer valid-token-123' };

      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should handle missing authorization header', async () => {
      const middleware = authenticate();
      mockRequest.headers = {};

      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'MISSING_TOKEN',
            message: 'Authentication token required'
          })
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle invalid authorization header format', async () => {
      const middleware = authenticate();
      mockRequest.headers = { authorization: 'InvalidFormat' };

      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'MISSING_TOKEN',
            message: 'Authentication token required'
          })
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle missing Bearer prefix', async () => {
      const middleware = authenticate();
      mockRequest.headers = { authorization: 'token-only' };

      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'MISSING_TOKEN',
            message: 'Authentication token required'
          })
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle empty token', async () => {
      const middleware = authenticate();
      mockRequest.headers = { authorization: 'Bearer ' };

      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'MISSING_TOKEN',
            message: 'Authentication token required'
          })
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle malformed token', async () => {
      const middleware = authenticate();
      mockRequest.headers = { authorization: 'Bearer malformed.token' };

      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'INVALID_TOKEN',
            message: 'Invalid or expired authentication token'
          })
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle expired token', async () => {
      const middleware = authenticate();
      mockRequest.headers = { authorization: 'Bearer expired-token' };

      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'INVALID_TOKEN',
            message: 'Invalid or expired authentication token'
          })
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle invalid token signature', async () => {
      const middleware = authenticate();
      mockRequest.headers = { authorization: 'Bearer invalid-signature' };

      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'INVALID_TOKEN',
            message: 'Invalid or expired authentication token'
          })
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle token without required claims', async () => {
      const middleware = authenticate();
      mockRequest.headers = { authorization: 'Bearer no-claims' };

      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'INVALID_TOKEN',
            message: 'Invalid or expired authentication token'
          })
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle server error during token verification', async () => {
      const middleware = authenticate();
      mockRequest.headers = { authorization: 'Bearer server-error-token' };

      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'AUTHENTICATION_ERROR',
            message: 'Authentication failed due to internal error'
          })
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('optionalAuthenticate', () => {
    it('should authenticate valid token successfully', async () => {
      const middleware = optionalAuthenticate();
      mockRequest.headers = { authorization: 'Bearer valid-token-123' };

      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should skip authentication when no token provided', async () => {
      const middleware = optionalAuthenticate();
      mockRequest.headers = {};

      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should handle invalid token gracefully', async () => {
      const middleware = optionalAuthenticate();
      mockRequest.headers = { authorization: 'Bearer invalid-token' };

      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should handle malformed token gracefully', async () => {
      const middleware = optionalAuthenticate();
      mockRequest.headers = { authorization: 'Bearer malformed.token' };

      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });
  });

  describe('authenticateApiKey', () => {
    it('should authenticate valid API key successfully', async () => {
      const middleware = authenticateApiKey();
      mockRequest.headers = { 'x-api-key': 'valid-api-key-123' };

      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should handle missing API key', async () => {
      const middleware = authenticateApiKey();
      mockRequest.headers = {};

      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'MISSING_API_KEY',
            message: 'API key required for service authentication'
          })
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle invalid API key', async () => {
      const middleware = authenticateApiKey();
      mockRequest.headers = { 'x-api-key': 'invalid-api-key' };

      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'INVALID_API_KEY',
            message: 'Invalid API key'
          })
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle server error during API key verification', async () => {
      const middleware = authenticateApiKey();
      mockRequest.headers = { 'x-api-key': 'server-error-key' };

      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'API_KEY_ERROR',
            message: 'API key authentication failed'
          })
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('bruteForceProtection', () => {
    it('should allow request when under limit', async () => {
      const middleware = bruteForceProtection();
      mockRequest.ip = '127.0.0.1';

      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should block request when over limit', async () => {
      const middleware = bruteForceProtection();
      mockRequest.ip = 'blocked-ip';

      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(429);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'TOO_MANY_ATTEMPTS',
            message: expect.stringContaining('Too many failed attempts')
          })
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should be disabled when brute force protection is off', async () => {
      const middleware = bruteForceProtection({ enableBruteForceProtection: false });
      mockRequest.ip = 'blocked-ip';

      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });
  });

  describe('deviceTracking', () => {
    it('should add device information to request', async () => {
      const middleware = deviceTracking();
      mockRequest.headers = { 'user-agent': 'test-agent' };

      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect((mockRequest as any).device).toBeDefined();
      expect((mockRequest as any).device.deviceId).toBeDefined();
      expect((mockRequest as any).device.userAgent).toBe('test-agent');
      expect((mockRequest as any).device.ipAddress).toBe('127.0.0.1');
      expect((mockRequest as any).device.timestamp).toBeDefined();
    });

    it('should be disabled when device tracking is off', async () => {
      const middleware = deviceTracking({ enableDeviceTracking: false });
      mockRequest.headers = { 'user-agent': 'test-agent' };

      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect((mockRequest as any).device).toBeUndefined();
    });
  });

  describe('error handling', () => {
    it('should handle unexpected errors gracefully', async () => {
      // Mock console.error to avoid noise in test output
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const middleware = authenticate();
      mockRequest.headers = { authorization: 'Bearer unexpected-error-token' };

      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'AUTHENTICATION_ERROR',
            message: 'Authentication failed due to internal error'
          })
        })
      );

      consoleSpy.mockRestore();
    });
  });

  describe('response formatting', () => {
    it('should return consistent error format for unauthorized errors', async () => {
      const middleware = authenticate();
      mockRequest.headers = {};

      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: expect.any(String),
            message: expect.any(String)
          })
        })
      );
    });

    it('should return consistent error format for API key errors', async () => {
      const middleware = authenticateApiKey();
      mockRequest.headers = {};

      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: expect.any(String),
            message: expect.any(String)
          })
        })
      );
    });
  });
});
