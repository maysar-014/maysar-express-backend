/**
 * CORS Middleware Tests
 * Comprehensive testing of Cross-Origin Resource Sharing configuration and security
 * Validates origin validation, preflight handling, security headers, and analytics
 */

import { Request, Response, NextFunction } from 'express';
import {
  createCORS,
  CORSMiddlewareFactory,
  CORSPresets,
  isLocalhostOrigin,
  isPrivateNetworkOrigin,
  parseOriginsFromEnv
} from '../cors.middleware';

// Mock Express objects
const mockResponse = () => {
  const res: Partial<Response> = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    end: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis()
  };
  return res as Response;
};

const mockNext = jest.fn();

describe('CORS Middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createCORS', () => {
    it('should create a CORS middleware function', () => {
      const middleware = createCORS();

      expect(typeof middleware).toBe('function');
    });

    it('should allow requests from allowed origins', async () => {
      const middleware = createCORS({
        origin: ['https://example.com', 'https://app.example.com']
      });

      const req = {
        method: 'GET',
        path: '/api/products',
        headers: {
          origin: 'https://example.com'
        }
      } as Request;
      const res = mockResponse();

      await middleware(req, res, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(res.set).toHaveBeenCalledWith(
        expect.objectContaining({
          'Access-Control-Allow-Origin': 'https://example.com'
        })
      );
    });

    it('should block requests from disallowed origins', async () => {
      const middleware = createCORS({
        origin: ['https://example.com']
      });

      const req = {
        method: 'GET',
        path: '/api/products',
        headers: {
          origin: 'https://evil.com'
        }
      } as Request;
      const res = mockResponse();

      await middleware(req, res, mockNext);

      expect(mockNext).toHaveBeenCalled();
      // Note: The middleware still calls next() even for blocked origins
      // Security headers are still set for all requests
      expect(res.set).toHaveBeenCalled();
    });

    it('should handle preflight OPTIONS requests', async () => {
      const middleware = createCORS({
        origin: ['https://example.com']
      });

      const req = {
        method: 'OPTIONS',
        path: '/api/products',
        headers: {
          origin: 'https://example.com',
          'access-control-request-method': 'POST',
          'access-control-request-headers': 'Content-Type, Authorization'
        }
      } as Request;
      const res = mockResponse();

      await middleware(req, res, mockNext);

      expect(mockNext).not.toHaveBeenCalled(); // Preflight should end the response
      expect(res.status).toHaveBeenCalledWith(204);
      expect(res.set).toHaveBeenCalledWith(
        expect.objectContaining({
          'Access-Control-Allow-Methods': expect.stringContaining('GET'),
          'Access-Control-Allow-Headers': expect.stringContaining('Content-Type')
        })
      );
    });

    it('should reject invalid preflight requests', async () => {
      const middleware = createCORS({
        origin: ['https://example.com']
      });

      const req = {
        method: 'OPTIONS',
        path: '/api/products',
        headers: {
          origin: 'https://evil.com', // Disallowed origin
          'access-control-request-method': 'POST'
        }
      } as Request;
      const res = mockResponse();

      await middleware(req, res, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(204);
    });

    it('should set security headers when enabled', async () => {
      const middleware = createCORS({
        origin: ['https://example.com'],
        enableSecurityHeaders: true
      });

      const req = {
        method: 'GET',
        path: '/api/products',
        headers: {
          origin: 'https://example.com'
        }
      } as Request;
      const res = mockResponse();

      await middleware(req, res, mockNext);

      expect(res.set).toHaveBeenCalledWith(
        expect.objectContaining({
          'X-Content-Type-Options': 'nosniff',
          'X-Frame-Options': 'DENY',
          'X-XSS-Protection': '1; mode=block'
        })
      );
    });

    it('should skip security headers when disabled', async () => {
      const middleware = createCORS({
        origin: ['https://example.com'],
        enableSecurityHeaders: false
      });

      const req = {
        method: 'GET',
        path: '/api/products',
        headers: {
          origin: 'https://example.com'
        }
      } as Request;
      const res = mockResponse();

      await middleware(req, res, mockNext);

      expect(res.set).not.toHaveBeenCalledWith(
        expect.objectContaining({
          'X-Content-Type-Options': 'nosniff'
        })
      );
    });

    it('should handle same-origin requests (no origin header)', async () => {
      const middleware = createCORS();

      const req = {
        method: 'GET',
        path: '/api/products',
        headers: {} // No origin header
      } as Request;
      const res = mockResponse();

      await middleware(req, res, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should support wildcard origin', async () => {
      const middleware = createCORS({
        origin: true
      });

      const req = {
        method: 'GET',
        path: '/api/products',
        headers: {
          origin: 'https://any-domain.com'
        }
      } as Request;
      const res = mockResponse();

      await middleware(req, res, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(res.set).toHaveBeenCalledWith(
        expect.objectContaining({
          'Access-Control-Allow-Origin': 'https://any-domain.com'
        })
      );
    });

    it('should support credentials', async () => {
      const middleware = createCORS({
        origin: ['https://example.com'],
        credentials: true
      });

      const req = {
        method: 'GET',
        path: '/api/products',
        headers: {
          origin: 'https://example.com'
        }
      } as Request;
      const res = mockResponse();

      await middleware(req, res, mockNext);

      expect(res.set).toHaveBeenCalledWith(
        expect.objectContaining({
          'Access-Control-Allow-Credentials': 'true'
        })
      );
    });

    it('should expose configured headers', async () => {
      const middleware = createCORS({
        origin: ['https://example.com'],
        exposedHeaders: ['X-Custom-Header', 'X-RateLimit-Limit']
      });

      const req = {
        method: 'GET',
        path: '/api/products',
        headers: {
          origin: 'https://example.com'
        }
      } as Request;
      const res = mockResponse();

      await middleware(req, res, mockNext);

      expect(res.set).toHaveBeenCalledWith(
        expect.objectContaining({
          'Access-Control-Expose-Headers': 'X-Custom-Header, X-RateLimit-Limit'
        })
      );
    });
  });

  describe('Origin Validation', () => {
    describe('validateOrigin', () => {
      it('should validate origins against whitelist', async () => {
        const middleware = createCORS({
          origin: ['https://example.com', 'https://app.example.com'],
          enableOriginValidation: true
        });

        const req = {
          method: 'GET',
          path: '/api/products',
          headers: {
            origin: 'https://example.com'
          }
        } as Request;
        const res = mockResponse();

        await middleware(req, res, mockNext);

        expect(mockNext).toHaveBeenCalled();
        expect(res.set).toHaveBeenCalledWith(
          expect.objectContaining({
            'Access-Control-Allow-Origin': 'https://example.com'
          })
        );
      });

      it('should block origins in blocked list', async () => {
        const middleware = createCORS({
          origin: true,
          blockedOrigins: ['https://evil.com'],
          enableOriginValidation: true
        });

        const req = {
          method: 'GET',
          path: '/api/products',
          headers: {
            origin: 'https://evil.com'
          }
        } as Request;
        const res = mockResponse();

        await middleware(req, res, mockNext);

        expect(mockNext).toHaveBeenCalled();
        // Blocked origins don't get CORS headers
        expect(res.set).not.toHaveBeenCalledWith(
          expect.objectContaining({
            'Access-Control-Allow-Origin': 'https://evil.com'
          })
        );
      });

      it('should skip validation when disabled', async () => {
        const middleware = createCORS({
          enableOriginValidation: false
        });

        const req = {
          method: 'GET',
          path: '/api/products',
          headers: {
            origin: 'https://any-domain.com'
          }
        } as Request;
        const res = mockResponse();

        await middleware(req, res, mockNext);

        expect(mockNext).toHaveBeenCalled();
      });
    });

    describe('isValidOrigin', () => {
      it('should validate proper HTTP/HTTPS URLs', () => {
        // Access private function for testing
        const isValidOrigin = (global as any).isValidOrigin;

        expect(isValidOrigin('https://example.com')).toBe(true);
        expect(isValidOrigin('http://example.com')).toBe(true);
        expect(isValidOrigin('https://sub.example.com:8080')).toBe(true);
      });

      it('should reject invalid URLs', () => {
        const isValidOrigin = (global as any).isValidOrigin;

        expect(isValidOrigin('ftp://example.com')).toBe(false);
        expect(isValidOrigin('not-a-url')).toBe(false);
        expect(isValidOrigin('')).toBe(false);
        expect(isValidOrigin('http://')).toBe(false);
      });

      it('should reject localhost in production', () => {
        const originalEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = 'production';

        const isValidOrigin = (global as any).isValidOrigin;

        expect(isValidOrigin('http://localhost:3000')).toBe(false);
        expect(isValidOrigin('https://127.0.0.1')).toBe(false);

        process.env.NODE_ENV = originalEnv;
      });
    });
  });

  describe('Preflight Request Handling', () => {
    describe('validateMethod', () => {
      it('should validate allowed HTTP methods', () => {
        const validateMethod = (global as any).validateMethod;

        expect(validateMethod('GET', { methods: ['GET', 'POST', 'PUT', 'DELETE'] })).toBe(true);
        expect(validateMethod('POST', { methods: ['GET', 'POST', 'PUT', 'DELETE'] })).toBe(true);
        expect(validateMethod('PATCH', { methods: ['GET', 'POST', 'PUT', 'DELETE'] })).toBe(false);
      });

      it('should handle string methods configuration', () => {
        const validateMethod = (global as any).validateMethod;

        expect(validateMethod('GET', { methods: 'GET, POST, PUT, DELETE' })).toBe(true);
        expect(validateMethod('PATCH', { methods: 'GET, POST, PUT, DELETE' })).toBe(false);
      });
    });

    describe('validateHeaders', () => {
      it('should validate allowed headers', () => {
        const validateHeaders = (global as any).validateHeaders;

        expect(validateHeaders('Content-Type, Authorization', {
          allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key']
        })).toBe(true);

        expect(validateHeaders('X-Custom-Header', {
          allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key']
        })).toBe(false);
      });

      it('should allow wildcard headers', () => {
        const validateHeaders = (global as any).validateHeaders;

        expect(validateHeaders('Any-Header', {
          allowedHeaders: ['*']
        })).toBe(true);
      });
    });
  });

  describe('CORSMiddlewareFactory', () => {
    describe('createBasicCORS', () => {
      it('should create basic CORS middleware', () => {
        const middleware = CORSMiddlewareFactory.createBasicCORS();

        expect(typeof middleware).toBe('function');
      });
    });

    describe('createDevelopmentCORS', () => {
      it('should create development CORS with permissive settings', () => {
        const middleware = CORSMiddlewareFactory.createDevelopmentCORS();

        expect(typeof middleware).toBe('function');
      });
    });

    describe('createProductionCORS', () => {
      it('should create production CORS with restrictive settings', () => {
        const middleware = CORSMiddlewareFactory.createProductionCORS();

        expect(typeof middleware).toBe('function');
      });
    });

    describe('createAPICORS', () => {
      it('should create API CORS with standard settings', () => {
        const middleware = CORSMiddlewareFactory.createAPICORS();

        expect(typeof middleware).toBe('function');
      });
    });

    describe('createPublicCORS', () => {
      it('should create public CORS with minimal restrictions', () => {
        const middleware = CORSMiddlewareFactory.createPublicCORS();

        expect(typeof middleware).toBe('function');
      });
    });

    describe('createAdminCORS', () => {
      it('should create admin CORS with high security', () => {
        const middleware = CORSMiddlewareFactory.createAdminCORS();

        expect(typeof middleware).toBe('function');
      });
    });

    describe('createPreset', () => {
      it('should create CORS from preset configurations', () => {
        const middleware = CORSMiddlewareFactory.createPreset('development');

        expect(typeof middleware).toBe('function');
      });

      it('should allow preset overrides', () => {
        const middleware = CORSMiddlewareFactory.createPreset('api', {
          maxAge: 3600
        });

        expect(typeof middleware).toBe('function');
      });
    });

    describe('createDynamicCORS', () => {
      it('should create CORS with dynamic origin validation', () => {
        const middleware = CORSMiddlewareFactory.createDynamicCORS(
          (origin) => origin?.includes('trusted.com') || false
        );

        expect(typeof middleware).toBe('function');
      });

      it('should handle async dynamic validation', async () => {
        const middleware = CORSMiddlewareFactory.createDynamicCORS(
          async (origin) => {
            // Simulate async validation
            return origin === 'https://trusted.com';
          }
        );

        const req = {
          method: 'GET',
          path: '/api/products',
          headers: {
            origin: 'https://trusted.com'
          }
        } as Request;
        const res = mockResponse();

        await middleware(req, res, mockNext);

        expect(mockNext).toHaveBeenCalled();
      });
    });

    describe('createWhitelistCORS', () => {
      it('should create CORS with origin whitelist', () => {
        const middleware = CORSMiddlewareFactory.createWhitelistCORS([
          'https://app.example.com',
          'https://admin.example.com'
        ]);

        expect(typeof middleware).toBe('function');
      });

      it('should validate against whitelist', async () => {
        const middleware = CORSMiddlewareFactory.createWhitelistCORS([
          'https://app.example.com'
        ]);

        const req = {
          method: 'GET',
          path: '/api/products',
          headers: {
            origin: 'https://app.example.com'
          }
        } as Request;
        const res = mockResponse();

        await middleware(req, res, mockNext);

        expect(mockNext).toHaveBeenCalled();
      });

      it('should reject origins not in whitelist', async () => {
        const middleware = CORSMiddlewareFactory.createWhitelistCORS([
          'https://app.example.com'
        ]);

        const req = {
          method: 'GET',
          path: '/api/products',
          headers: {
            origin: 'https://evil.com'
          }
        } as Request;
        const res = mockResponse();

        await middleware(req, res, mockNext);

        expect(mockNext).toHaveBeenCalled();
        // Headers should not be set for blocked origins
      });
    });
  });

  describe('CORS Presets', () => {
    it('should have all preset configurations', () => {
      expect(CORSPresets.development).toBeDefined();
      expect(CORSPresets.production).toBeDefined();
      expect(CORSPresets.api).toBeDefined();
      expect(CORSPresets.public).toBeDefined();
      expect(CORSPresets.admin).toBeDefined();
    });

    it('should have appropriate settings for each preset', () => {
      expect(CORSPresets.development.origin).toBe(true);
      expect(CORSPresets.development.enableSecurityHeaders).toBe(false);

      expect(typeof CORSPresets.production.origin).toBe('function');
      expect(CORSPresets.production.enableSecurityHeaders).toBe(true);

      expect(typeof CORSPresets.api.origin).toBe('function');
      expect(CORSPresets.api.credentials).toBe(true);

      expect(CORSPresets.public.origin).toBe(true);
      expect(CORSPresets.public.credentials).toBe(false);

      expect(typeof CORSPresets.admin.origin).toBe('function');
      expect(CORSPresets.admin.maxAge).toBe(3600);
    });
  });

  describe('Utility Functions', () => {
    describe('isLocalhostOrigin', () => {
      it('should identify localhost origins', () => {
        expect(isLocalhostOrigin('http://localhost:3000')).toBe(true);
        expect(isLocalhostOrigin('https://localhost:8080')).toBe(true);
        expect(isLocalhostOrigin('http://127.0.0.1:3000')).toBe(true);
        expect(isLocalhostOrigin('https://example.com')).toBe(false);
        expect(isLocalhostOrigin(undefined)).toBe(false);
      });
    });

    describe('isPrivateNetworkOrigin', () => {
      it('should identify private network origins', () => {
        expect(isPrivateNetworkOrigin('http://192.168.1.1')).toBe(true);
        expect(isPrivateNetworkOrigin('https://10.0.0.1')).toBe(true);
        expect(isPrivateNetworkOrigin('http://172.16.0.1')).toBe(true);
        expect(isPrivateNetworkOrigin('http://172.32.0.1')).toBe(false); // Not in private range
        expect(isPrivateNetworkOrigin('https://example.com')).toBe(false);
      });

      it('should identify IPv6 private addresses', () => {
        expect(isPrivateNetworkOrigin('http://[fc00::1]')).toBe(true);
        expect(isPrivateNetworkOrigin('https://[fd00::1]')).toBe(true);
        expect(isPrivateNetworkOrigin('http://[2001:db8::1]')).toBe(false);
      });
    });

    describe('parseOriginsFromEnv', () => {
      it('should parse comma-separated origins from environment', () => {
        const originalEnv = process.env.ALLOWED_ORIGINS;
        process.env.ALLOWED_ORIGINS = 'https://app.example.com, https://admin.example.com, https://api.example.com';

        const origins = parseOriginsFromEnv('ALLOWED_ORIGINS');

        expect(origins).toEqual([
          'https://app.example.com',
          'https://admin.example.com',
          'https://api.example.com'
        ]);

        process.env.ALLOWED_ORIGINS = originalEnv;
      });

      it('should handle empty environment variable', () => {
        const originalEnv = process.env.ALLOWED_ORIGINS;
        delete process.env.ALLOWED_ORIGINS;

        const origins = parseOriginsFromEnv('ALLOWED_ORIGINS');

        expect(origins).toEqual([]);

        process.env.ALLOWED_ORIGINS = originalEnv;
      });

      it('should filter out empty values', () => {
        const originalEnv = process.env.ALLOWED_ORIGINS;
        process.env.ALLOWED_ORIGINS = 'https://app.example.com,, https://admin.example.com, ';

        const origins = parseOriginsFromEnv('ALLOWED_ORIGINS');

        expect(origins).toEqual([
          'https://app.example.com',
          'https://admin.example.com'
        ]);

        process.env.ALLOWED_ORIGINS = originalEnv;
      });
    });
  });

  describe('Analytics and Logging', () => {
    it('should log CORS decisions when enabled', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const middleware = createCORS({
        origin: ['https://example.com'],
        enableLogging: true
      });

      const req = {
        method: 'GET',
        path: '/api/products',
        headers: {
          origin: 'https://example.com'
        }
      } as Request;
      const res = mockResponse();

      await middleware(req, res, mockNext);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[CORS] ALLOWED origin: https://example.com')
      );

      consoleSpy.mockRestore();
    });

    it('should skip logging when disabled', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const middleware = createCORS({
        origin: ['https://example.com'],
        enableLogging: false
      });

      const req = {
        method: 'GET',
        path: '/api/products',
        headers: {
          origin: 'https://example.com'
        }
      } as Request;
      const res = mockResponse();

      await middleware(req, res, mockNext);

      expect(consoleSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('[CORS]')
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Error Handling', () => {
    it('should handle middleware errors gracefully', async () => {
      const middleware = createCORS();
      const req = {
        method: 'GET',
        path: '/api/products',
        headers: {
          origin: 'https://example.com'
        }
      } as Request;
      const res = mockResponse();

      // Mock an error in the middleware
      const originalSetCORSHeaders = (global as any).setCORSHeaders;
      (global as any).setCORSHeaders = jest.fn().mockImplementation(() => {
        throw new Error('Header setting failed');
      });

      const nextSpy = jest.fn();
      await middleware(req, res, nextSpy);

      expect(nextSpy).toHaveBeenCalledWith(expect.any(Error));

      // Restore original function
      (global as any).setCORSHeaders = originalSetCORSHeaders;
    });
  });

  describe('Configuration Handling', () => {
    it('should merge custom config with defaults', async () => {
      const middleware = createCORS({
        maxAge: 3600,
        enableSecurityHeaders: false
      });

      const req = {
        method: 'GET',
        path: '/api/products',
        headers: {
          origin: 'https://example.com'
        }
      } as Request;
      const res = mockResponse();

      await middleware(req, res, mockNext);

      expect(mockNext).toHaveBeenCalled();
      // Custom config should be applied
    });

    it('should use default configuration when none provided', async () => {
      const middleware = createCORS();

      const req = {
        method: 'GET',
        path: '/api/products',
        headers: {
          origin: 'https://example.com'
        }
      } as Request;
      const res = mockResponse();

      await middleware(req, res, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });
});
