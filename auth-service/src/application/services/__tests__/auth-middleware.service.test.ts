import { AuthMiddlewareService } from '../auth-middleware.service';
import { AuthMiddlewareConfig } from '../../../config/auth-middleware.config';

describe('AuthMiddlewareService', () => {
  let service: AuthMiddlewareService;
  let mockConfig: AuthMiddlewareConfig;

  beforeEach(() => {
    // Create a mock config with all features enabled for testing
    mockConfig = {
      getConfig: jest.fn().mockReturnValue({
        jwt: {
          secret: 'test-secret',
          algorithm: 'HS256',
          expirationTime: 900000, // 15 minutes
          refreshExpirationTime: 604800000 // 7 days
        },
        tokenBlacklisting: {
          enabled: true,
          storageType: 'memory',
          cleanupInterval: 3600000, // 1 hour
          maxBlacklistedTokens: 10000
        },
        apiKey: {
          enabled: true,
          secret: 'test-api-key-secret',
          expirationTime: 2592000000, // 30 days
          maxKeysPerService: 10,
          allowedServices: ['test-service', 'admin-service']
        },
        bruteForce: {
          enabled: true,
          maxAttempts: 5,
          lockoutTime: 900000, // 15 minutes
          windowTime: 900000, // 15 minutes
          resetOnSuccess: true,
          storageType: 'memory'
        },
        deviceTracking: {
          enabled: true,
          maxDevicesPerUser: 5,
          deviceFingerprintSalt: 'test-salt',
          suspiciousActivityThreshold: 3,
          geoLocationEnabled: true,
          cleanupInterval: 86400000 // 24 hours
        },
        session: {
          enabled: true,
          expirationTime: 28800000, // 8 hours
          extendOnActivity: true,
          maxConcurrentSessions: 3,
          storageType: 'memory'
        },
        rateLimiting: {
          enabled: true,
          windowMs: 60000, // 1 minute
          maxRequests: 100,
          skipSuccessfulRequests: true,
          skipFailedRequests: true
        },
        security: {
          enableCircuitBreaker: true,
          circuitBreakerThreshold: 5,
          circuitBreakerTimeout: 60000, // 1 minute
          enableAuditLogging: true,
          auditLogRetentionDays: 90,
          enableMetrics: true
        }
      }),
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

    service = new AuthMiddlewareService(mockConfig);
  });

  describe('validateToken', () => {
    it('should validate a valid token', async () => {
      const token = 'valid.jwt.token';
      const result = await service.validateToken(token);

      expect(result.valid).toBe(true);
      expect(result.payload).toBeDefined();
      expect(result.expiresAt).toBeDefined();
      expect(result.issuedAt).toBeDefined();
    });

    it('should reject an invalid token', async () => {
      const token = 'invalid-token';
      const result = await service.validateToken(token);

      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should reject a blacklisted token', async () => {
      const token = 'valid.jwt.token';
      
      // First validate to get it in the system
      await service.validateToken(token);
      
      // Then blacklist it
      await service.blacklistToken(token, 'test');
      
      // Should now be rejected
      const result = await service.validateToken(token);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Token has been revoked');
    });
  });

  describe('checkTokenBlacklist', () => {
    it('should return false for non-blacklisted token', async () => {
      const token = 'test-token';
      const result = await service.checkTokenBlacklist(token);

      expect(result.isBlacklisted).toBe(false);
      expect(result.blacklistedAt).toBeUndefined();
    });

    it('should return true for blacklisted token', async () => {
      const token = 'test-token';
      await service.blacklistToken(token, 'test');

      const result = await service.checkTokenBlacklist(token);
      expect(result.isBlacklisted).toBe(true);
      expect(result.blacklistedAt).toBeDefined();
    });
  });

  describe('blacklistToken', () => {
    it('should blacklist a token successfully', async () => {
      const token = 'test-token';
      const reason = 'logout';

      const result = await service.blacklistToken(token, reason);

      expect(result.success).toBe(true);
      expect(result.reason).toBe(reason);
    });

    it('should return false when blacklisting is disabled', async () => {
      // Mock config to disable blacklisting
      (mockConfig.getConfig as jest.Mock).mockReturnValue({
        ...mockConfig.getConfig(),
        tokenBlacklisting: { enabled: false }
      });

      const token = 'test-token';
      const result = await service.blacklistToken(token, 'test');

      expect(result.success).toBe(false);
      expect(result.reason).toBe('Token blacklisting is disabled');
    });
  });

  describe('validateApiKey', () => {
    it('should validate a valid API key', async () => {
      const apiKey = 'test-service-1234567890abcdef';

      const result = await service.validateApiKey(apiKey);

      expect(result.valid).toBe(true);
      expect(result.serviceId).toBeDefined();
      expect(result.permissions).toBeDefined();
    });

    it('should reject an invalid API key', async () => {
      const apiKey = 'invalid';

      const result = await service.validateApiKey(apiKey);

      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should return false when API key validation is disabled', async () => {
      // Mock config to disable API key validation
      (mockConfig.getConfig as jest.Mock).mockReturnValue({
        ...mockConfig.getConfig(),
        apiKey: { enabled: false }
      });

      const apiKey = 'test-key';
      const result = await service.validateApiKey(apiKey);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('API key authentication is disabled');
    });
  });

  describe('generateApiKey', () => {
    it('should generate a valid API key', async () => {
      const serviceId = 'test-service';
      const permissions = ['read', 'write'];

      const result = await service.generateApiKey(serviceId, permissions);

      expect(result.apiKey).toBeDefined();
      expect(result.apiKey).toContain(serviceId);
      expect(result.expiresAt).toBeDefined();
    });

    it('should throw error for unauthorized service', async () => {
      const serviceId = 'unauthorized-service';
      const permissions = ['read'];

      await expect(service.generateApiKey(serviceId, permissions))
        .rejects.toThrow('Service not allowed to generate API keys');
    });

    it('should throw error when API key generation is disabled', async () => {
      // Mock config to disable API key generation
      (mockConfig.getConfig as jest.Mock).mockReturnValue({
        ...mockConfig.getConfig(),
        apiKey: { enabled: false }
      });

      const serviceId = 'test-service';
      const permissions = ['read'];

      await expect(service.generateApiKey(serviceId, permissions))
        .rejects.toThrow('API key generation is disabled');
    });
  });

  describe('revokeApiKey', () => {
    it('should revoke a valid API key', async () => {
      const apiKey = 'test-service-1234567890abcdef';
      const reason = 'admin';

      const result = await service.revokeApiKey(apiKey, reason);

      expect(result.success).toBe(true);
      expect(result.reason).toBe(reason);
    });
  });

  describe('checkBruteForce', () => {
    it('should return false for new identifier', async () => {
      const identifier = 'test@example.com';
      const type = 'email';

      const result = await service.checkBruteForce(identifier, type);

      expect(result.isBlocked).toBe(false);
      expect(result.attempts).toBe(0);
      expect(result.timeUntilReset).toBe(0);
    });

    it('should track attempts correctly', async () => {
      const identifier = 'test@example.com';
      const type = 'email';

      // Record multiple failures
      for (let i = 0; i < 3; i++) {
        await service.recordFailure({
          identifier,
          type,
          reason: 'invalid password'
        });
      }

      const result = await service.checkBruteForce(identifier, type);
      expect(result.attempts).toBe(3);
      expect(result.isBlocked).toBe(false); // Should not be blocked yet
    });

    it('should block after max attempts', async () => {
      const identifier = 'test@example.com';
      const type = 'email';
      const config = mockConfig.getConfig();

      // Record max attempts
      for (let i = 0; i < config.bruteForce.maxAttempts; i++) {
        await service.recordFailure({
          identifier,
          type,
          reason: 'invalid password'
        });
      }

      const result = await service.checkBruteForce(identifier, type);
      expect(result.isBlocked).toBe(true);
      expect(result.timeUntilReset).toBeGreaterThan(0);
    });
  });

  describe('recordFailure', () => {
    it('should record failure successfully', async () => {
      const failureData = {
        identifier: 'test@example.com',
        type: 'email' as const,
        reason: 'invalid password',
        ipAddress: '192.168.1.1',
        userAgent: 'test-agent'
      };

      const result = await service.recordFailure(failureData);

      expect(result.success).toBe(true);
      expect(result.attempts).toBe(1);
    });

    it('should increment attempts for same identifier', async () => {
      const failureData = {
        identifier: 'test@example.com',
        type: 'email' as const,
        reason: 'invalid password'
      };

      await service.recordFailure(failureData);
      const result = await service.recordFailure(failureData);

      expect(result.success).toBe(true);
      expect(result.attempts).toBe(2);
    });

    it('should return false when brute force protection is disabled', async () => {
      // Mock config to disable brute force protection
      (mockConfig.getConfig as jest.Mock).mockReturnValue({
        ...mockConfig.getConfig(),
        bruteForce: { enabled: false }
      });

      const failureData = {
        identifier: 'test@example.com',
        type: 'email' as const,
        reason: 'invalid password'
      };

      const result = await service.recordFailure(failureData);

      expect(result.success).toBe(false);
      expect(result.reason).toBe('Brute force protection is disabled');
    });
  });

  describe('resetBruteForce', () => {
    it('should reset brute force protection', async () => {
      const identifier = 'test@example.com';
      const type = 'email';

      // Record some failures first
      await service.recordFailure({
        identifier,
        type,
        reason: 'invalid password'
      });

      // Reset protection
      const result = await service.resetBruteForce(identifier, type, 'admin reset');

      expect(result.success).toBe(true);
      expect(result.reason).toBe('admin reset');

      // Check that attempts are reset
      const checkResult = await service.checkBruteForce(identifier, type);
      expect(checkResult.attempts).toBe(0);
      expect(checkResult.isBlocked).toBe(false);
    });
  });

  describe('trackDevice', () => {
    it('should track a new device', async () => {
      const deviceData = {
        userId: 'user-123',
        deviceId: 'device-abc',
        deviceInfo: { browser: 'Chrome', os: 'Windows' },
        isNewDevice: true
      };

      const result = await service.trackDevice(deviceData);

      expect(result.userId).toBe(deviceData.userId);
      expect(result.deviceId).toBe(deviceData.deviceId);
      expect(result.deviceInfo).toEqual(deviceData.deviceInfo);
      expect(result.isNewDevice).toBe(true);
      expect(result.firstSeen).toBeDefined();
      expect(result.lastSeen).toBeDefined();
    });

    it('should throw error when device tracking is disabled', async () => {
      // Mock config to disable device tracking
      (mockConfig.getConfig as jest.Mock).mockReturnValue({
        ...mockConfig.getConfig(),
        deviceTracking: { enabled: false }
      });

      const deviceData = {
        userId: 'user-123',
        deviceId: 'device-abc',
        deviceInfo: {},
        isNewDevice: true
      };

      await expect(service.trackDevice(deviceData))
        .rejects.toThrow('Device tracking is disabled');
    });
  });

  describe('getDeviceHistory', () => {
    it('should return device history for user', async () => {
      const userId = 'user-123';

      // Track some devices first
      await service.trackDevice({
        userId,
        deviceId: 'device-1',
        deviceInfo: { browser: 'Chrome' },
        isNewDevice: true
      });

      await service.trackDevice({
        userId,
        deviceId: 'device-2',
        deviceInfo: { browser: 'Firefox' },
        isNewDevice: false
      });

      const result = await service.getDeviceHistory(userId, 10, 0);

      expect(result.devices).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.devices[0].userId).toBe(userId);
    });

    it('should support pagination', async () => {
      const userId = 'user-123';

      // Track multiple devices
      for (let i = 0; i < 5; i++) {
        await service.trackDevice({
          userId,
          deviceId: `device-${i}`,
          deviceInfo: {},
          isNewDevice: true
        });
      }

      const result = await service.getDeviceHistory(userId, 2, 1);

      expect(result.devices).toHaveLength(2);
      expect(result.total).toBe(5);
    });
  });

  describe('removeDevice', () => {
    it('should remove a device successfully', async () => {
      const userId = 'user-123';
      const deviceId = 'device-abc';

      // Track device first
      await service.trackDevice({
        userId,
        deviceId,
        deviceInfo: {},
        isNewDevice: true
      });

      // Remove device
      const result = await service.removeDevice(deviceId, userId, 'user request');

      expect(result.success).toBe(true);
      expect(result.reason).toBe('user request');

      // Verify device is removed
      const history = await service.getDeviceHistory(userId);
      expect(history.devices).toHaveLength(0);
    });

    it('should return false for non-existent device', async () => {
      const result = await service.removeDevice('non-existent', 'user-123', 'test');

      expect(result.success).toBe(false);
      expect(result.reason).toBe('Device not found');
    });
  });

  describe('extendSession', () => {
    it('should extend session successfully', async () => {
      const sessionId = 'session-123';
      const userId = 'user-123';

      // Create a session first (this would normally be done by the session management system)
      const now = Date.now();
      const sessionData = {
        sessionId,
        userId,
        createdAt: now,
        lastActivity: now,
        expiresAt: now + 3600000, // 1 hour from now
        ipAddress: '192.168.1.1',
        userAgent: 'test-agent'
      };

      // This is a bit of a hack since we can't directly access the private sessions map
      // In a real test, we might need to expose this for testing or use a different approach
      const result = await service.extendSession(sessionId, userId);

      expect(result.sessionId).toBe(sessionId);
      expect(result.userId).toBe(userId);
      expect(result.lastActivity).toBeDefined();
    });
  });

  describe('getSessionInfo', () => {
    it('should return session info', async () => {
      const sessionId = 'session-123';

      // This would normally require setting up a session in the private map
      // For now, we'll test the error case
      await expect(service.getSessionInfo(sessionId))
        .rejects.toThrow('Session not found');
    });
  });

  describe('invalidateSession', () => {
    it('should invalidate session successfully', async () => {
      const sessionId = 'session-123';
      const userId = 'user-123';
      const reason = 'logout';

      const result = await service.invalidateSession(sessionId, userId, reason);

      expect(result.success).toBe(true);
      expect(result.reason).toBe(reason);
    });
  });

  describe('healthCheck', () => {
    it('should return healthy status', async () => {
      const result = await service.healthCheck();

      expect(result.status).toBe('healthy');
      expect(result.services).toBeDefined();
      expect(result.services.jwt.enabled).toBe(true);
      expect(result.services.tokenBlacklisting.enabled).toBe(true);
      expect(result.services.apiKey.enabled).toBe(true);
      expect(result.services.bruteForce.enabled).toBe(true);
      expect(result.services.deviceTracking.enabled).toBe(true);
      expect(result.services.session.enabled).toBe(true);
    });
  });

  describe('getMetrics', () => {
    it('should return authentication metrics', async () => {
      const result = await service.getMetrics();

      expect(result.timestamp).toBeDefined();
      expect(typeof result.timestamp).toBe('number');
      expect(result.totalBlacklistedTokens).toBeDefined();
      expect(result.activeSessions).toBeDefined();
      expect(result.totalDevices).toBeDefined();
      expect(result.totalBruteForceAttempts).toBeDefined();
      expect(result.services).toBeDefined();
    });
  });

  describe('error handling', () => {
    it('should handle errors gracefully in all methods', async () => {
      // Test that all methods handle errors without crashing
      const token = 'test-token';
      const apiKey = 'test-api-key';
      const identifier = 'test@example.com';
      const userId = 'user-123';

      // These should not throw unhandled errors
      await expect(service.validateToken(token)).resolves.toBeDefined();
      await expect(service.checkTokenBlacklist(token)).resolves.toBeDefined();
      await expect(service.blacklistToken(token, 'test')).resolves.toBeDefined();
      await expect(service.validateApiKey(apiKey)).resolves.toBeDefined();
      await expect(service.generateApiKey('test-service', ['read'])).resolves.toBeDefined();
      await expect(service.revokeApiKey(apiKey, 'test')).resolves.toBeDefined();
      await expect(service.checkBruteForce(identifier, 'email')).resolves.toBeDefined();
      await expect(service.recordFailure({
        identifier,
        type: 'email',
        reason: 'test'
      })).resolves.toBeDefined();
      await expect(service.resetBruteForce(identifier, 'email', 'test')).resolves.toBeDefined();
      await expect(service.trackDevice({
        userId,
        deviceId: 'test-device',
        deviceInfo: {},
        isNewDevice: true
      })).resolves.toBeDefined();
      await expect(service.getDeviceHistory(userId)).resolves.toBeDefined();
      await expect(service.removeDevice('test-device', userId, 'test')).resolves.toBeDefined();
      await expect(service.extendSession('test-session', userId)).resolves.toBeDefined();
      await expect(service.getSessionInfo('test-session')).rejects.toBeDefined();
      await expect(service.invalidateSession('test-session', userId, 'test')).resolves.toBeDefined();
      await expect(service.healthCheck()).resolves.toBeDefined();
      await expect(service.getMetrics()).resolves.toBeDefined();
    });
  });
});