import { Request, Response } from 'express';
import { AuthMiddlewareController } from '../auth-middleware.controller';
import { AuthMiddlewareService } from '../../../application/services/auth-middleware.service';
import { AuthMiddlewareConfig } from '../../../config/auth-middleware.config';

// Mock the dependencies
jest.mock('../../../application/services/auth-middleware.service');
jest.mock('../../../config/auth-middleware.config');
jest.mock('../../../infrastructure/services/logger.service');

describe('AuthMiddlewareController Integration Tests', () => {
  let controller: AuthMiddlewareController;
  let mockService: jest.Mocked<AuthMiddlewareService>;
  let mockConfig: jest.Mocked<AuthMiddlewareConfig>;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: jest.Mock;

  beforeEach(() => {
    // Create mocks
    mockService = {
      validateToken: jest.fn(),
      checkTokenBlacklist: jest.fn(),
      blacklistToken: jest.fn(),
      validateApiKey: jest.fn(),
      generateApiKey: jest.fn(),
      revokeApiKey: jest.fn(),
      checkBruteForce: jest.fn(),
      recordFailure: jest.fn(),
      resetBruteForce: jest.fn(),
      trackDevice: jest.fn(),
      getDeviceHistory: jest.fn(),
      removeDevice: jest.fn(),
      extendSession: jest.fn(),
      getSessionInfo: jest.fn(),
      invalidateSession: jest.fn(),
      healthCheck: jest.fn(),
      getMetrics: jest.fn()
    } as any;

    mockConfig = {
      getConfig: jest.fn(),
      getJwtConfig: jest.fn(),
      getTokenBlacklistingConfig: jest.fn(),
      getApiKeyConfig: jest.fn(),
      getBruteForceConfig: jest.fn(),
      getDeviceTrackingConfig: jest.fn(),
      getSessionConfig: jest.fn(),
      getRateLimitingConfig: jest.fn(),
      getSecurityConfig: jest.fn(),
      getConfigForLogging: jest.fn()
    } as any;

    // Mock the service constructor to return our mock
    (AuthMiddlewareService as jest.Mock).mockImplementation(() => mockService);
    (AuthMiddlewareConfig as jest.Mock).mockImplementation(() => mockConfig);

    controller = new AuthMiddlewareController();
    mockRequest = {};
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    mockNext = jest.fn();
  });

  describe('validateToken', () => {
    it('should validate token successfully', async () => {
      const token = 'valid.jwt.token';
      const validationResult = {
        valid: true,
        payload: { userId: 'user-123' },
        expiresAt: Date.now() + 900000,
        issuedAt: Date.now()
      };

      mockService.validateToken.mockResolvedValue(validationResult);
      mockRequest.body = { token };

      await controller.validateToken(mockRequest as Request, mockResponse as Response);

      expect(mockService.validateToken).toHaveBeenCalledWith(token);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: validationResult
      });
    });

    it('should handle validation errors', async () => {
      const token = 'invalid-token';
      const errorResult = {
        valid: false,
        error: 'Invalid token format or expired'
      };

      mockService.validateToken.mockResolvedValue(errorResult);
      mockRequest.body = { token };

      await controller.validateToken(mockRequest as Request, mockResponse as Response);

      expect(mockService.validateToken).toHaveBeenCalledWith(token);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: errorResult
      });
    });
  });

  describe('checkTokenBlacklist', () => {
    it('should check blacklist status', async () => {
      const token = 'test-token';
      const blacklistResult = {
        isBlacklisted: false,
        blacklistedAt: undefined
      };

      mockService.checkTokenBlacklist.mockResolvedValue(blacklistResult);
      mockRequest.body = { token };

      await controller.checkTokenBlacklist(mockRequest as Request, mockResponse as Response);

      expect(mockService.checkTokenBlacklist).toHaveBeenCalledWith(token);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: blacklistResult
      });
    });
  });

  describe('blacklistToken', () => {
    it('should blacklist token successfully', async () => {
      const token = 'test-token';
      const reason = 'logout';
      const blacklistResult = {
        success: true,
        reason: 'logout'
      };

      mockService.blacklistToken.mockResolvedValue(blacklistResult);
      mockRequest.body = { token, reason };

      await controller.blacklistToken(mockRequest as Request, mockResponse as Response);

      expect(mockService.blacklistToken).toHaveBeenCalledWith(token, reason);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: blacklistResult
      });
    });
  });

  describe('validateApiKey', () => {
    it('should validate API key successfully', async () => {
      const apiKey = 'test-service-1234567890abcdef';
      const validationResult = {
        valid: true,
        serviceId: 'test-service',
        permissions: ['read', 'write']
      };

      mockService.validateApiKey.mockResolvedValue(validationResult);
      mockRequest.body = { apiKey };

      await controller.validateApiKey(mockRequest as Request, mockResponse as Response);

      expect(mockService.validateApiKey).toHaveBeenCalledWith(apiKey);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: validationResult
      });
    });
  });

  describe('generateApiKey', () => {
    it('should generate API key successfully', async () => {
      const serviceId = 'test-service';
      const permissions = ['read', 'write'];
      const expiresAt = new Date(Date.now() + 2592000000);
      const generationResult = {
        apiKey: 'test-service-generated-key',
        expiresAt: expiresAt
      };

      mockService.generateApiKey.mockResolvedValue(generationResult);
      mockRequest.body = { serviceId, permissions, expiresAt: expiresAt.toISOString() };

      await controller.generateApiKey(mockRequest as Request, mockResponse as Response);

      expect(mockService.generateApiKey).toHaveBeenCalledWith(serviceId, permissions, expiresAt);
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: generationResult
      });
    });
  });

  describe('revokeApiKey', () => {
    it('should revoke API key successfully', async () => {
      const apiKey = 'test-service-1234567890abcdef';
      const reason = 'admin';
      const revokeResult = {
        success: true,
        reason: 'admin'
      };

      mockService.revokeApiKey.mockResolvedValue(revokeResult);
      mockRequest.body = { apiKey, reason };

      await controller.revokeApiKey(mockRequest as Request, mockResponse as Response);

      expect(mockService.revokeApiKey).toHaveBeenCalledWith(apiKey, reason);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: revokeResult
      });
    });
  });

  describe('checkBruteForce', () => {
    it('should check brute force protection status', async () => {
      const identifier = 'test@example.com';
      const type = 'email';
      const checkResult = {
        isBlocked: false,
        attempts: 0,
        timeUntilReset: 0
      };

      mockService.checkBruteForce.mockResolvedValue(checkResult);
      mockRequest.body = { identifier, type };

      await controller.checkBruteForce(mockRequest as Request, mockResponse as Response);

      expect(mockService.checkBruteForce).toHaveBeenCalledWith(identifier, type);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: checkResult
      });
    });
  });

  describe('recordFailure', () => {
    it('should record authentication failure', async () => {
      const failureData = {
        identifier: 'test@example.com',
        type: 'email',
        reason: 'invalid password',
        ipAddress: '192.168.1.1',
        userAgent: 'test-agent'
      };
      const recordResult = {
        success: true,
        attempts: 1
      };

      mockService.recordFailure.mockResolvedValue(recordResult);
      mockRequest.body = failureData;

      await controller.recordFailure(mockRequest as Request, mockResponse as Response);

      expect(mockService.recordFailure).toHaveBeenCalledWith(failureData);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: recordResult
      });
    });
  });

  describe('resetBruteForce', () => {
    it('should reset brute force protection', async () => {
      const identifier = 'test@example.com';
      const type = 'email';
      const adminReason = 'admin reset';
      const resetResult = {
        success: true,
        reason: 'admin reset'
      };

      mockService.resetBruteForce.mockResolvedValue(resetResult);
      mockRequest.body = { identifier, type, adminReason };

      await controller.resetBruteForce(mockRequest as Request, mockResponse as Response);

      expect(mockService.resetBruteForce).toHaveBeenCalledWith(identifier, type, adminReason);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: resetResult
      });
    });
  });

  describe('trackDevice', () => {
    it('should track device successfully', async () => {
      const deviceData = {
        userId: 'user-123',
        deviceId: 'device-abc',
        deviceInfo: { browser: 'Chrome', os: 'Windows' },
        isNewDevice: true
      };
      const trackResult = {
        userId: 'user-123',
        deviceId: 'device-abc',
        deviceInfo: deviceData.deviceInfo,
        firstSeen: Date.now(),
        lastSeen: Date.now(),
        isNewDevice: true,
        locationHistory: [],
        riskScore: 0
      };

      mockService.trackDevice.mockResolvedValue(trackResult);
      mockRequest.body = deviceData;

      await controller.trackDevice(mockRequest as Request, mockResponse as Response);

      expect(mockService.trackDevice).toHaveBeenCalledWith(deviceData);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: trackResult
      });
    });
  });

  describe('getDeviceHistory', () => {
    it('should get device history successfully', async () => {
      const userId = 'user-123';
      const limit = 10;
      const offset = 0;
      const historyResult = {
        devices: [
          {
            userId: 'user-123',
            deviceId: 'device-1',
            deviceInfo: { browser: 'Chrome' },
            firstSeen: Date.now(),
            lastSeen: Date.now(),
            isNewDevice: true,
            locationHistory: [],
            riskScore: 0
          }
        ],
        total: 1
      };

      mockService.getDeviceHistory.mockResolvedValue(historyResult);
      mockRequest.params = { userId };
      mockRequest.query = { limit: limit.toString(), offset: offset.toString() };

      await controller.getDeviceHistory(mockRequest as Request, mockResponse as Response);

      expect(mockService.getDeviceHistory).toHaveBeenCalledWith(userId, limit, offset);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: historyResult
      });
    });
  });

  describe('removeDevice', () => {
    it('should remove device successfully', async () => {
      const deviceId = 'device-abc';
      const userId = 'user-123';
      const reason = 'user request';
      const removeResult = {
        success: true,
        reason: 'user request'
      };

      mockService.removeDevice.mockResolvedValue(removeResult);
      mockRequest.params = { deviceId };
      mockRequest.body = { userId, reason };

      await controller.removeDevice(mockRequest as Request, mockResponse as Response);

      expect(mockService.removeDevice).toHaveBeenCalledWith(deviceId, userId, reason);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: removeResult
      });
    });
  });

  describe('extendSession', () => {
    it('should extend session successfully', async () => {
      const sessionId = 'session-123';
      const userId = 'user-123';
      const extendResult = {
        sessionId: 'session-123',
        userId: 'user-123',
        createdAt: Date.now(),
        lastActivity: Date.now(),
        expiresAt: Date.now() + 28800000,
        ipAddress: '192.168.1.1',
        userAgent: 'test-agent'
      };

      mockService.extendSession.mockResolvedValue(extendResult);
      mockRequest.body = { sessionId, userId };

      await controller.extendSession(mockRequest as Request, mockResponse as Response);

      expect(mockService.extendSession).toHaveBeenCalledWith(sessionId, userId);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: extendResult
      });
    });
  });

  describe('getSessionInfo', () => {
    it('should get session info successfully', async () => {
      const sessionId = 'session-123';
      const sessionInfo = {
        sessionId: 'session-123',
        userId: 'user-123',
        createdAt: Date.now(),
        lastActivity: Date.now(),
        expiresAt: Date.now() + 28800000,
        ipAddress: '192.168.1.1',
        userAgent: 'test-agent'
      };

      mockService.getSessionInfo.mockResolvedValue(sessionInfo);
      mockRequest.params = { sessionId };

      await controller.getSessionInfo(mockRequest as Request, mockResponse as Response);

      expect(mockService.getSessionInfo).toHaveBeenCalledWith(sessionId);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: sessionInfo
      });
    });
  });

  describe('invalidateSession', () => {
    it('should invalidate session successfully', async () => {
      const sessionId = 'session-123';
      const userId = 'user-123';
      const reason = 'logout';
      const invalidateResult = {
        success: true,
        reason: 'logout'
      };

      mockService.invalidateSession.mockResolvedValue(invalidateResult);
      mockRequest.body = { sessionId, userId, reason };

      await controller.invalidateSession(mockRequest as Request, mockResponse as Response);

      expect(mockService.invalidateSession).toHaveBeenCalledWith(sessionId, userId, reason);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: invalidateResult
      });
    });
  });

  describe('healthCheck', () => {
    it('should perform health check successfully', async () => {
      const healthResult = {
        status: 'healthy',
        services: {
          jwt: { enabled: true, status: 'healthy' },
          tokenBlacklisting: { enabled: true, status: 'healthy' },
          apiKey: { enabled: true, status: 'healthy' },
          bruteForce: { enabled: true, status: 'healthy' },
          deviceTracking: { enabled: true, status: 'healthy' },
          session: { enabled: true, status: 'healthy' }
        }
      };

      mockService.healthCheck.mockResolvedValue(healthResult);

      await controller.healthCheck(mockRequest as Request, mockResponse as Response);

      expect(mockService.healthCheck).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: healthResult
      });
    });
  });

  describe('getMetrics', () => {
    it('should get authentication metrics successfully', async () => {
      const metricsResult = {
        timestamp: Date.now(),
        totalBlacklistedTokens: 5,
        activeSessions: 10,
        totalDevices: 15,
        totalBruteForceAttempts: 3,
        services: {
          jwt: { enabled: true },
          tokenBlacklisting: { enabled: true, count: 5 },
          apiKey: { enabled: true },
          bruteForce: { enabled: true, totalAttempts: 3 },
          deviceTracking: { enabled: true, totalDevices: 15 },
          session: { enabled: true, activeSessions: 10 }
        }
      };

      mockService.getMetrics.mockResolvedValue(metricsResult);

      await controller.getMetrics(mockRequest as Request, mockResponse as Response);

      expect(mockService.getMetrics).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: metricsResult
      });
    });
  });

  describe('error handling', () => {
    it('should handle service errors gracefully', async () => {
      const error = new Error('Service error');
      mockService.validateToken.mockRejectedValue(error);
      mockRequest.body = { token: 'test-token' };

      await controller.validateToken(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'TOKEN_VALIDATION_ERROR',
          message: 'Failed to validate token'
        }
      });
    });
  });
});
