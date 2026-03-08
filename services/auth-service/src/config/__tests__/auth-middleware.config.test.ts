jest.mock('../../infrastructure/services/logger.service', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
  }
}));

import { logger } from '../../infrastructure/services/logger.service';
import { AuthMiddlewareConfig } from '../auth-middleware.config';

describe('AuthMiddlewareConfig', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns defensive copies from getter methods', () => {
    const config = new AuthMiddlewareConfig({
      jwt: {
        secret: 'secure-secret',
        algorithm: 'HS256',
        expirationTime: 1000,
        refreshExpirationTime: 2000
      }
    });

    const jwtConfig = config.getJwtConfig();
    jwtConfig.secret = 'mutated';

    expect(config.getJwtConfig().secret).toBe('secure-secret');
  });

  it('redacts sensitive fields in log-safe config output', () => {
    const config = new AuthMiddlewareConfig({
      jwt: {
        secret: 'super-secret',
        algorithm: 'HS256',
        expirationTime: 1000,
        refreshExpirationTime: 2000
      },
      apiKey: {
        enabled: true,
        secret: 'api-secret',
        expirationTime: 3000,
        maxKeysPerService: 5,
        allowedServices: ['auth-service']
      },
      deviceTracking: {
        enabled: true,
        maxDevicesPerUser: 5,
        deviceFingerprintSalt: 'salt-1',
        suspiciousActivityThreshold: 3,
        geoLocationEnabled: true,
        cleanupInterval: 1000
      }
    });

    const safeConfig = config.getConfigForLogging();

    expect(safeConfig.jwt?.secret).toBe('***REDACTED***');
    expect(safeConfig.apiKey?.secret).toBe('***REDACTED***');
    expect(safeConfig.deviceTracking?.deviceFingerprintSalt).toBe('***REDACTED***');
  });

  it('logs validation warnings for insecure defaults and invalid thresholds', () => {
    new AuthMiddlewareConfig({
      jwt: {
        secret: 'default-secret-change-in-production',
        algorithm: 'HS256',
        expirationTime: 0,
        refreshExpirationTime: 1000
      },
      apiKey: {
        enabled: true,
        secret: 'api-key-secret-change-in-production',
        expirationTime: 3000,
        maxKeysPerService: 5,
        allowedServices: []
      },
      bruteForce: {
        enabled: true,
        maxAttempts: 0,
        lockoutTime: 0,
        windowTime: 1000,
        resetOnSuccess: true,
        storageType: 'memory'
      }
    });

    expect((logger.warn as jest.Mock).mock.calls[0][0]).toBe('Configuration validation warnings');
    expect((logger.warn as jest.Mock).mock.calls[0][1].errors).toEqual(
      expect.arrayContaining([
        'JWT secret should be changed from default value',
        'JWT expiration time must be positive',
        'API key secret should be changed from default value',
        'Brute force max attempts must be positive',
        'Brute force lockout time must be positive'
      ])
    );
  });
});
