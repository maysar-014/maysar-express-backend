/**
 * Authentication Middleware Test Suite
 * Tests for authentication middleware functionality
 */

import { createHash } from 'crypto';
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import {
  authenticate,
  optionalAuthenticate,
  authenticateApiKey,
  bruteForceProtection,
  deviceTracking,
  UserContext
} from '../authentication.middleware';

type TestTokenPayload = jwt.JwtPayload & {
  userId: string;
  email: string;
  roles: string[];
  permissions: string[];
};

type MockRequest = {
  headers: Record<string, string | undefined>;
  ip: string;
  connection: {
    remoteAddress?: string | null;
  };
  user?: UserContext | null;
  service?: {
    authenticated: boolean;
    apiKey: string;
    timestamp: number;
  };
  device?: {
    deviceId: string;
    userAgent: string;
    ipAddress: string;
    timestamp: number;
  };
};

type MockResponse = {
  status: jest.Mock;
  json: jest.Mock;
  send: jest.Mock;
  end: jest.Mock;
};

const TEST_JWT_SECRET = 'unit-test-jwt-secret';
const VALID_API_KEY = 'valid-api-key-123';
const ORIGINAL_CATALOG_API_KEYS = process.env.CATALOG_API_KEYS;
const ORIGINAL_API_KEYS = process.env.API_KEYS;

function createRequest(overrides: Partial<MockRequest> = {}): MockRequest {
  return {
    headers: {},
    ip: '127.0.0.1',
    connection: { remoteAddress: '127.0.0.1' },
    ...overrides
  };
}

function createResponse(): MockResponse {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
    end: jest.fn().mockReturnThis()
  };
}

function createToken(overrides: Partial<TestTokenPayload> = {}, options: jwt.SignOptions = {}): string {
  const payload: TestTokenPayload = {
    userId: 'user-123',
    email: 'user@example.com',
    roles: ['admin'],
    permissions: ['catalog:read'],
    ...overrides
  };

  return jwt.sign(payload, TEST_JWT_SECRET, {
    algorithm: 'HS256',
    expiresIn: '1h',
    ...options
  });
}

function createExpiredToken(): string {
  const now = Math.floor(Date.now() / 1000);
  const payload: TestTokenPayload = {
    userId: 'user-123',
    email: 'user@example.com',
    roles: ['admin'],
    permissions: ['catalog:read'],
    iat: now - 120,
    exp: now - 60
  };

  return jwt.sign(payload, TEST_JWT_SECRET, {
    algorithm: 'HS256',
    noTimestamp: true
  });
}

describe('Authentication Middleware', () => {
  let mockRequest: MockRequest;
  let mockResponse: MockResponse;
  let mockNext: jest.Mock;
  let consoleErrorSpy: jest.SpyInstance;
  let consoleLogSpy: jest.SpyInstance;

  beforeEach(() => {
    mockRequest = createRequest();
    mockResponse = createResponse();
    mockNext = jest.fn();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    process.env.CATALOG_API_KEYS = VALID_API_KEY;
    delete process.env.API_KEYS;
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    consoleLogSpy.mockRestore();

    if (ORIGINAL_CATALOG_API_KEYS === undefined) {
      delete process.env.CATALOG_API_KEYS;
    } else {
      process.env.CATALOG_API_KEYS = ORIGINAL_CATALOG_API_KEYS;
    }

    if (ORIGINAL_API_KEYS === undefined) {
      delete process.env.API_KEYS;
    } else {
      process.env.API_KEYS = ORIGINAL_API_KEYS;
    }

    jest.restoreAllMocks();
  });

  async function runMiddleware(
    middleware: (req: Request, res: Response, next: NextFunction) => void | Promise<void>
  ): Promise<void> {
    await Promise.resolve(
      middleware(
      mockRequest as unknown as Request,
      mockResponse as unknown as Response,
      mockNext as unknown as NextFunction
      )
    );
  }

  describe('authenticate', () => {
    it('should authenticate a valid token successfully', async () => {
      const middleware = authenticate({
        jwtSecret: TEST_JWT_SECRET,
        jwtAlgorithm: 'HS256',
        enableSessionLogging: false
      });
      mockRequest.headers.authorization = `Bearer ${createToken()}`;

      await runMiddleware(middleware);

      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockResponse.status).not.toHaveBeenCalled();
      expect(mockRequest.user).toMatchObject({
        userId: 'user-123',
        email: 'user@example.com',
        roles: ['admin'],
        permissions: ['catalog:read'],
        ipAddress: '127.0.0.1',
        userAgent: 'unknown'
      });
      expect(mockRequest.user?.sessionId).toHaveLength(32);
      expect(mockRequest.user?.deviceId).toHaveLength(32);
      expect(mockRequest.user?.issuedAt).toBeGreaterThan(0);
      expect(mockRequest.user?.expiresAt).toBeGreaterThan(mockRequest.user?.issuedAt ?? 0);
    });

    it('should handle missing authorization header', async () => {
      const middleware = authenticate({
        jwtSecret: TEST_JWT_SECRET,
        jwtAlgorithm: 'HS256',
        enableSessionLogging: false
      });

      await runMiddleware(middleware);

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

    it('should handle malformed authorization header', async () => {
      const middleware = authenticate({
        jwtSecret: TEST_JWT_SECRET,
        jwtAlgorithm: 'HS256',
        enableSessionLogging: false
      });
      mockRequest.headers.authorization = 'InvalidFormat';

      await runMiddleware(middleware);

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

    it('should handle invalid token signature', async () => {
      const middleware = authenticate({
        jwtSecret: TEST_JWT_SECRET,
        jwtAlgorithm: 'HS256',
        enableSessionLogging: false
      });
      const invalidToken = jwt.sign(
        {
          userId: 'user-123',
          email: 'user@example.com',
          roles: ['admin'],
          permissions: ['catalog:read']
        },
        'different-secret',
        { algorithm: 'HS256', expiresIn: '1h' }
      );
      mockRequest.headers.authorization = `Bearer ${invalidToken}`;

      await runMiddleware(middleware);

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
      const middleware = authenticate({
        jwtSecret: TEST_JWT_SECRET,
        jwtAlgorithm: 'HS256',
        enableSessionLogging: false
      });
      mockRequest.headers.authorization = `Bearer ${createExpiredToken()}`;

      await runMiddleware(middleware);

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

    it('should treat token verification errors as invalid tokens', async () => {
      const middleware = authenticate({
        jwtSecret: TEST_JWT_SECRET,
        jwtAlgorithm: 'HS256',
        enableSessionLogging: false
      });
      const verifySpy = jest.spyOn(jwt, 'verify').mockImplementation(() => {
        throw new Error('Verification service unavailable');
      });
      mockRequest.headers.authorization = `Bearer ${createToken()}`;

      await runMiddleware(middleware);

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
      verifySpy.mockRestore();
    });
  });

  describe('optionalAuthenticate', () => {
    it('should authenticate a valid token successfully', async () => {
      const middleware = optionalAuthenticate({
        jwtSecret: TEST_JWT_SECRET,
        jwtAlgorithm: 'HS256',
        enableSessionLogging: false
      });
      mockRequest.headers.authorization = `Bearer ${createToken()}`;

      await runMiddleware(middleware);

      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockRequest.user).toMatchObject({
        userId: 'user-123',
        email: 'user@example.com',
        roles: ['admin'],
        permissions: ['catalog:read']
      });
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should skip authentication when no token is provided', async () => {
      const middleware = optionalAuthenticate({
        jwtSecret: TEST_JWT_SECRET,
        jwtAlgorithm: 'HS256',
        enableSessionLogging: false
      });

      await runMiddleware(middleware);

      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockRequest.user).toBeNull();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should fall back to anonymous access on invalid token', async () => {
      const middleware = optionalAuthenticate({
        jwtSecret: TEST_JWT_SECRET,
        jwtAlgorithm: 'HS256',
        enableSessionLogging: false
      });
      mockRequest.headers.authorization = 'Bearer malformed.token';

      await runMiddleware(middleware);

      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockRequest.user).toBeNull();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });
  });

  describe('authenticateApiKey', () => {
    it('should authenticate a valid API key successfully', async () => {
      const middleware = authenticateApiKey();
      mockRequest.headers['x-api-key'] = VALID_API_KEY;

      await runMiddleware(middleware);

      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockResponse.status).not.toHaveBeenCalled();
      expect(mockRequest.service).toEqual(
        expect.objectContaining({
          authenticated: true,
          apiKey: createHash('sha256').update(VALID_API_KEY).digest('hex')
        })
      );
      expect(mockRequest.service?.timestamp).toBeGreaterThan(0);
    });

    it('should handle missing API key', async () => {
      const middleware = authenticateApiKey();

      await runMiddleware(middleware);

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
      mockRequest.headers['x-api-key'] = 'invalid-api-key';

      await runMiddleware(middleware);

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

    it('should handle configuration errors when no API keys are set', async () => {
      process.env.CATALOG_API_KEYS = '';
      delete process.env.API_KEYS;

      const middleware = authenticateApiKey();
      mockRequest.headers['x-api-key'] = VALID_API_KEY;

      await runMiddleware(middleware);

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
    it('should allow requests when brute force protection is disabled', async () => {
      const middleware = bruteForceProtection();

      await runMiddleware(middleware);

      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockResponse.status).not.toHaveBeenCalled();
    });
  });

  describe('deviceTracking', () => {
    it('should add device information to the request', async () => {
      const middleware = deviceTracking();
      mockRequest.headers['user-agent'] = 'test-agent';

      await runMiddleware(middleware);

      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockRequest.device).toEqual(
        expect.objectContaining({
          userAgent: 'test-agent',
          ipAddress: '127.0.0.1'
        })
      );
      expect(mockRequest.device?.deviceId).toHaveLength(32);
      expect(mockRequest.device?.timestamp).toBeGreaterThan(0);
    });

    it('should be disabled when device tracking is off', async () => {
      const middleware = deviceTracking({ enableDeviceTracking: false });
      mockRequest.headers['user-agent'] = 'test-agent';

      await runMiddleware(middleware);

      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockRequest.device).toBeUndefined();
    });
  });
});
