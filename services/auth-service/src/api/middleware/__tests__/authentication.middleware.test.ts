/**
 * Authentication Middleware Tests
 * Tests for the authentication middleware functionality
 */

import { Request, Response, NextFunction } from 'express';
import { AuthenticationMiddleware, AuthenticationMiddlewareFactory } from '../authentication.middleware';
import { AuthServiceClient } from '../../../infrastructure/clients/auth-service.client';
import { logger } from '../../../infrastructure/services/logger.service';

// Mock dependencies
jest.mock('../../../infrastructure/clients/auth-service.client');
jest.mock('../../../infrastructure/services/logger.service');

const MockAuthServiceClient = AuthServiceClient as jest.MockedClass<typeof AuthServiceClient>;
const mockAuthServiceClient = new MockAuthServiceClient() as jest.Mocked<AuthServiceClient>;
MockAuthServiceClient.mockImplementation(() => mockAuthServiceClient);

const mockLogger = logger as jest.Mocked<typeof logger>;

describe('AuthenticationMiddleware', () => {
  let middleware: AuthenticationMiddleware;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockRequest = {
      headers: {},
      ip: '127.0.0.1',
      socket: { remoteAddress: '127.0.0.1' } as any,
      get: jest.fn()
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    mockNext = jest.fn();

    // Reset mocks
    jest.clearAllMocks();
    middleware = new AuthenticationMiddleware();

    mockAuthServiceClient.checkTokenBlacklist.mockResolvedValue({ isBlacklisted: false });
    mockAuthServiceClient.validateApiKey.mockResolvedValue({
      valid: true,
      serviceId: 'service-123',
      permissions: ['read', 'write']
    });
  });

  describe('authenticate()', () => {
    it('should authenticate valid JWT token', async () => {
      const validToken = 'valid.jwt.token';
      const mockPayload = {
        userId: 'user-123',
        email: 'test@example.com',
        roles: ['user'],
        permissions: ['read'],
        sessionId: 'session-123',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600
      };

      mockRequest.headers = {
        authorization: `Bearer ${validToken}`
      };

      mockAuthServiceClient.validateToken.mockResolvedValue({
        valid: true,
        payload: mockPayload
      });

      const authenticateMiddleware = middleware.authenticate();

      await authenticateMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockAuthServiceClient.validateToken).toHaveBeenCalledWith(validToken);
      expect(mockNext).toHaveBeenCalled();
      expect((mockRequest as any).user).toEqual({
        userId: 'user-123',
        email: 'test@example.com',
        roles: ['user'],
        permissions: ['read'],
        sessionId: 'session-123',
        deviceId: expect.any(String),
        ipAddress: '127.0.0.1',
        userAgent: 'unknown',
        issuedAt: mockPayload.iat * 1000,
        expiresAt: mockPayload.exp * 1000,
        geoLocation: undefined
      });
    });

    it('should return 401 for missing token', async () => {
      const authenticateMiddleware = middleware.authenticate();

      await authenticateMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'MISSING_TOKEN',
          message: 'Authentication token required'
        }
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 for invalid token', async () => {
      const invalidToken = 'invalid-token';

      mockRequest.headers = {
        authorization: `Bearer ${invalidToken}`
      };

      mockAuthServiceClient.validateToken.mockResolvedValue({
        valid: false,
        error: 'Token is invalid'
      });

      const authenticateMiddleware = middleware.authenticate();

      await authenticateMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Token is invalid'
        }
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 for blacklisted token', async () => {
      const blacklistedToken = 'blacklisted-token';

      mockRequest.headers = {
        authorization: `Bearer ${blacklistedToken}`
      };

      mockAuthServiceClient.validateToken.mockResolvedValue({
        valid: true,
        payload: { userId: 'user-123' }
      });

      mockAuthServiceClient.checkTokenBlacklist.mockResolvedValue({
        isBlacklisted: true
      });

      const authenticateMiddleware = new AuthenticationMiddleware({
        enableTokenBlacklisting: true
      }).authenticate();

      await authenticateMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'TOKEN_BLACKLISTED',
          message: 'Token has been revoked'
        }
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('optionalAuthenticate()', () => {
    it('should set user to null for missing token', async () => {
      const optionalAuthenticateMiddleware = middleware.optionalAuthenticate();

      await optionalAuthenticateMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect((mockRequest as any).user).toBeNull();
      expect(mockNext).toHaveBeenCalled();
    });

    it('should authenticate valid token in optional mode', async () => {
      const validToken = 'valid.jwt.token';
      const mockPayload = {
        userId: 'user-123',
        email: 'test@example.com',
        roles: ['user'],
        permissions: ['read'],
        sessionId: 'session-123',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600
      };

      mockRequest.headers = {
        authorization: `Bearer ${validToken}`
      };

      mockAuthServiceClient.validateToken.mockResolvedValue({
        valid: true,
        payload: mockPayload
      });

      const optionalAuthenticateMiddleware = middleware.optionalAuthenticate();

      await optionalAuthenticateMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect((mockRequest as any).user).toEqual({
        userId: 'user-123',
        email: 'test@example.com',
        roles: ['user'],
        permissions: ['read'],
        sessionId: 'session-123',
        deviceId: expect.any(String),
        ipAddress: '127.0.0.1',
        userAgent: 'unknown',
        issuedAt: mockPayload.iat * 1000,
        expiresAt: mockPayload.exp * 1000,
        geoLocation: undefined
      });
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('authenticateApiKey()', () => {
    it('should authenticate valid API key', async () => {
      const validApiKey = 'valid-api-key';

      mockRequest.headers = {
        'x-service-key': validApiKey
      };

      mockAuthServiceClient.validateApiKey.mockResolvedValue({
        valid: true,
        serviceId: 'service-123',
        permissions: ['read', 'write']
      });

      const authenticateApiKeyMiddleware = middleware.authenticateApiKey();

      await authenticateApiKeyMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect((mockRequest as any).service).toEqual({
        serviceId: 'service-123',
        serviceKey: expect.any(String),
        permissions: ['read', 'write'],
        timestamp: expect.any(Number),
        ipAddress: '127.0.0.1',
        userAgent: 'unknown'
      });
      expect(mockNext).toHaveBeenCalled();
    });

    it('should return 401 for missing API key', async () => {
      const authenticateApiKeyMiddleware = middleware.authenticateApiKey();

      await authenticateApiKeyMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'MISSING_API_KEY',
          message: 'API key required for service authentication'
        }
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 for invalid API key', async () => {
      const invalidApiKey = 'invalid-api-key';

      mockRequest.headers = {
        'x-service-key': invalidApiKey
      };

      mockAuthServiceClient.validateApiKey.mockResolvedValue({
        valid: false,
        error: 'Invalid API key'
      });

      const authenticateApiKeyMiddleware = middleware.authenticateApiKey();

      await authenticateApiKeyMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INVALID_API_KEY',
          message: 'Invalid API key'
        }
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('authenticateService()', () => {
    it('should authenticate valid service key', async () => {
      const validServiceKey = 'valid-service-key';

      mockRequest.headers = {
        'x-service-key': validServiceKey
      };

      const authenticateServiceMiddleware = new AuthenticationMiddleware({
        allowedServiceKeys: [validServiceKey]
      }).authenticateService();

      await authenticateServiceMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect((mockRequest as any).service).toEqual({
        serviceId: 'valid-se',
        serviceKey: expect.any(String),
        permissions: ['read', 'write', 'admin'],
        timestamp: expect.any(Number),
        ipAddress: '127.0.0.1',
        userAgent: 'unknown'
      });
      expect(mockNext).toHaveBeenCalled();
    });

    it('should return 401 for missing service key', async () => {
      const authenticateServiceMiddleware = middleware.authenticateService();

      await authenticateServiceMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'MISSING_SERVICE_KEY',
          message: 'Service key required'
        }
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 for invalid service key', async () => {
      const invalidServiceKey = 'invalid-service-key';

      mockRequest.headers = {
        'x-service-key': invalidServiceKey
      };

      const authenticateServiceMiddleware = middleware.authenticateService();

      await authenticateServiceMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INVALID_SERVICE_KEY',
          message: 'Invalid service key'
        }
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('authenticateCombined()', () => {
    it('should authenticate with JWT token when both token and API key are provided', async () => {
      const validToken = 'valid.jwt.token';
      const mockPayload = {
        userId: 'user-123',
        email: 'test@example.com',
        roles: ['user'],
        permissions: ['read'],
        sessionId: 'session-123',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600
      };

      mockRequest.headers = {
        authorization: `Bearer ${validToken}`,
        'x-service-key': 'some-api-key'
      };

      mockAuthServiceClient.validateToken.mockResolvedValue({
        valid: true,
        payload: mockPayload
      });

      const authenticateCombinedMiddleware = middleware.authenticateCombined();

      await authenticateCombinedMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect((mockRequest as any).user).toBeDefined();
      expect((mockRequest as any).service).toBeUndefined();
      expect((mockRequest as any).authType).toBe('jwt');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should authenticate with API key when JWT token is invalid', async () => {
      const invalidToken = 'invalid-jwt-token';
      const validApiKey = 'valid-api-key';

      mockRequest.headers = {
        authorization: `Bearer ${invalidToken}`,
        'x-service-key': validApiKey
      };

      mockAuthServiceClient.validateToken.mockResolvedValue({
        valid: false,
        error: 'Token is invalid'
      });

      mockAuthServiceClient.validateApiKey.mockResolvedValue({
        valid: true,
        serviceId: 'service-123',
        permissions: ['read', 'write']
      });

      const authenticateCombinedMiddleware = middleware.authenticateCombined();

      await authenticateCombinedMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect((mockRequest as any).user).toBeUndefined();
      expect((mockRequest as any).service).toBeDefined();
      expect((mockRequest as any).authType).toBe('api-key');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should return 401 when neither JWT nor API key is valid', async () => {
      const invalidToken = 'invalid-jwt-token';
      const invalidApiKey = 'invalid-api-key';

      mockRequest.headers = {
        authorization: `Bearer ${invalidToken}`,
        'x-service-key': invalidApiKey
      };

      mockAuthServiceClient.validateToken.mockResolvedValue({
        valid: false,
        error: 'Token is invalid'
      });

      mockAuthServiceClient.validateApiKey.mockResolvedValue({
        valid: false,
        error: 'API key is invalid'
      });

      const authenticateCombinedMiddleware = middleware.authenticateCombined();

      await authenticateCombinedMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'NO_VALID_AUTH',
          message: 'No valid authentication provided'
        }
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('AuthenticationMiddlewareFactory', () => {
    it('should create JWT authentication middleware', () => {
      const jwtMiddleware = AuthenticationMiddlewareFactory.createJWTAuth();

      expect(jwtMiddleware).toBeInstanceOf(Function);
    });

    it('should create optional authentication middleware', () => {
      const optionalMiddleware = AuthenticationMiddlewareFactory.createOptionalAuth();

      expect(optionalMiddleware).toBeInstanceOf(Function);
    });

    it('should create API key authentication middleware', () => {
      const apiKeyMiddleware = AuthenticationMiddlewareFactory.createApiKeyAuth();

      expect(apiKeyMiddleware).toBeInstanceOf(Function);
    });

    it('should create service authentication middleware', () => {
      const serviceMiddleware = AuthenticationMiddlewareFactory.createServiceAuth();

      expect(serviceMiddleware).toBeInstanceOf(Function);
    });

    it('should create combined authentication middleware', () => {
      const combinedMiddleware = AuthenticationMiddlewareFactory.createCombinedAuth();

      expect(combinedMiddleware).toBeInstanceOf(Function);
    });
  });
});
