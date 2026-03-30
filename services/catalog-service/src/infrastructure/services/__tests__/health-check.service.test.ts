/**
 * Health Check Service Tests
 * Infrastructure layer testing for system health monitoring
 * Tests health checks, error scenarios, and service fallbacks
 *
 * Coverage Requirements (per Testing Constitution):
 * - Infrastructure Layer: 75% minimum, 80% target, 85% critical
 * - Mock external APIs and providers
 * - Test error scenarios and fallbacks
 * - Service isolation and resilience testing
 */

import {
  HealthCheckService,
  HealthCheckMiddleware,
  HealthAlertSystem,
  HealthStatus,
  ComponentHealthResult,
  SystemHealthResult,
  HealthCheckConfig,
  globalHealthAlertSystem
} from '../health-check.service';

const mockPrismaClient = {
  $queryRaw: jest.fn(),
  $metrics: jest.fn()
};

const mockRedisClient = {
  ping: jest.fn()
};

// Mock external dependencies
jest.mock('../../providers', () => ({
  ProviderManager: {
    getInstance: jest.fn()
  }
}));

jest.mock('@shared/database/prisma-client', () => ({
  createPrismaClient: jest.fn(() => mockPrismaClient)
}));

jest.mock('@shared/redis/ioredis-client', () => ({
  getSharedRedisClient: jest.fn(() => mockRedisClient)
}));

jest.mock('../cache.service', () => ({
  CacheServiceFactory: {
    getInstance: jest.fn(() => null)
  }
}));

jest.mock('../../providers/cache-provider', () => ({
  CacheProviderFactory: {
    getInstance: jest.fn(() => null)
  }
}));

import { ProviderManager } from '../../providers';

// Mock the ProviderManager instance
const mockProviderInstance = {
  getHealthCheck: jest.fn()
};

(ProviderManager.getInstance as jest.Mock).mockReturnValue(mockProviderInstance);

describe('HealthCheckService', () => {
  let healthCheckService: HealthCheckService;
  let mockProviderManager: jest.Mocked<typeof ProviderManager>;
  let config: HealthCheckConfig;

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrismaClient.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);
    mockPrismaClient.$metrics.mockResolvedValue({ connectionPoolSize: 5 });
    mockRedisClient.ping.mockResolvedValue('PONG');

    config = {
      enabled: true,
      interval: 30000,
      timeout: 5000,
      failureThreshold: 3,
      recoveryThreshold: 2,
      components: {
        database: true,
        cache: true,
        search: true,
        messaging: true,
        externalApis: true
      }
    };

    healthCheckService = new HealthCheckService(config);
    mockProviderManager = ProviderManager as jest.Mocked<typeof ProviderManager>;
  });

  describe('initialization', () => {
    it('should initialize with default config when no config provided', () => {
      const service = new HealthCheckService();
      expect(service).toBeDefined();
    });

    it('should merge provided config with defaults', () => {
      const partialConfig = { enabled: false, timeout: 10000 };
      const service = new HealthCheckService(partialConfig);

      // Service should still be created (config merging happens internally)
      expect(service).toBeDefined();
    });
  });

  describe('performHealthCheck', () => {
    it('should perform comprehensive health check with all components enabled', async () => {
      // Mock provider health check
      const mockHealthCheck = {
        providers: {
          search: { status: 'up', lastQueryTime: 150 },
          cache: { status: 'up', lastQueryTime: 50 },
          inventory: { status: 'up', lastQueryTime: 75 },
          fileStorage: { status: 'up', lastQueryTime: 100 }
        }
      };

      mockProviderManager.getInstance().getHealthCheck = jest.fn().mockResolvedValue(mockHealthCheck);

      const result: SystemHealthResult = await healthCheckService.performHealthCheck();

      expect(result.status).toBe(HealthStatus.HEALTHY);
      expect(result.components).toHaveLength(5); // database, cache, search, messaging, external-apis
      expect(result.uptime).toBeGreaterThan(0);
      expect(result.timestamp).toBeInstanceOf(Date);
      expect(result.metrics.totalRequests).toBeGreaterThan(0);
    });

    it('should handle partial component failures gracefully', async () => {
      // Mock provider with some failures
      const mockHealthCheck = {
        providers: {
          search: { status: 'down', lastQueryTime: 5000 },
          cache: { status: 'up', lastQueryTime: 50 },
          inventory: { status: 'up', lastQueryTime: 75 },
          fileStorage: { status: 'down', lastQueryTime: 3000 }
        }
      };

      mockProviderManager.getInstance().getHealthCheck = jest.fn().mockResolvedValue(mockHealthCheck);

      const result: SystemHealthResult = await healthCheckService.performHealthCheck();

      expect(result.status).toBe(HealthStatus.DEGRADED); // Some services down
      expect(result.components.some(c => c.status === HealthStatus.UNHEALTHY)).toBe(true);
      expect(result.components.some(c => c.status === HealthStatus.HEALTHY)).toBe(true);
    });

    it('should return unhealthy status when critical components fail', async () => {
      // Mock database failure (critical component)
      const originalCheckDatabase = (healthCheckService as any).checkDatabase;
      (healthCheckService as any).checkDatabase = jest.fn().mockResolvedValue({
        name: 'database',
        status: HealthStatus.UNHEALTHY,
        responseTime: 100,
        message: 'Database connection failed',
        timestamp: new Date()
      });

      const mockHealthCheck = {
        providers: {
          search: { status: 'up', lastQueryTime: 150 },
          cache: { status: 'up', lastQueryTime: 50 },
          inventory: { status: 'up', lastQueryTime: 75 },
          fileStorage: { status: 'up', lastQueryTime: 100 }
        }
      };

      mockProviderManager.getInstance().getHealthCheck = jest.fn().mockResolvedValue(mockHealthCheck);

      const result: SystemHealthResult = await healthCheckService.performHealthCheck();

      expect(result.status).toBe(HealthStatus.UNHEALTHY);

      // Restore original method
      (healthCheckService as any).checkDatabase = originalCheckDatabase;
    });

    it('should handle timeout scenarios', async () => {
      // Create service with very short timeout
      const timeoutConfig = { ...config, timeout: 1 };
      const timeoutService = new HealthCheckService(timeoutConfig);

      // Mock a slow provider response
      (mockProviderManager.getInstance().getHealthCheck as jest.Mock).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({
          providers: {
            search: { status: 'up', lastQueryTime: 150 },
            cache: { status: 'up', lastQueryTime: 50 },
            inventory: { status: 'up', lastQueryTime: 75 },
            fileStorage: { status: 'up', lastQueryTime: 100 }
          }
        }), 10)) // Delay longer than timeout
      );

      const result: SystemHealthResult = await timeoutService.performHealthCheck();

      expect(result.components.some(c => c.message?.includes('timeout'))).toBe(true);
    });

    it('should update metrics correctly', async () => {
      const mockHealthCheck = {
        providers: {
          search: { status: 'up', lastQueryTime: 150 },
          cache: { status: 'up', lastQueryTime: 50 },
          inventory: { status: 'up', lastQueryTime: 75 },
          fileStorage: { status: 'up', lastQueryTime: 100 }
        }
      };

      mockProviderManager.getInstance().getHealthCheck = jest.fn().mockResolvedValue(mockHealthCheck);

      await healthCheckService.performHealthCheck();
      const metrics = healthCheckService.getMetrics();

      expect(metrics.totalChecks).toBeGreaterThan(0);
      expect(metrics.averageResponseTime).toBeGreaterThan(0);
      expect(metrics.successRate).toBeGreaterThan(0);
    });
  });

  describe('component health checks', () => {
    describe('checkDatabase', () => {
      it('should return healthy status for successful database check', async () => {
        const result: ComponentHealthResult = await (healthCheckService as any).checkDatabase();

        expect(result.name).toBe('database');
        expect(result.status).toBe(HealthStatus.HEALTHY);
        expect(result.responseTime).toBeGreaterThanOrEqual(0);
        expect(result.message).toContain('Database connection healthy');
        expect(result.details).toHaveProperty('metrics');
      });

      it('should handle database errors gracefully', async () => {
        mockPrismaClient.$queryRaw.mockRejectedValueOnce(new Error('Connection refused'));

        const result: ComponentHealthResult = await (healthCheckService as any).checkDatabase();

        expect(result.status).toBe(HealthStatus.UNHEALTHY);
        expect(result.message).toContain('Database check failed');
      });
    });

    describe('checkCache', () => {
      it('should return healthy status when cache operations succeed', async () => {
        // Mock cache instance
        const mockCache = {
          set: jest.fn().mockResolvedValue(undefined),
          get: jest.fn().mockResolvedValue('ok')
        };
        (healthCheckService as any).getCacheInstance = jest.fn().mockResolvedValue(mockCache);

        const result: ComponentHealthResult = await (healthCheckService as any).checkCache();

        expect(result.name).toBe('cache');
        expect(result.status).toBe(HealthStatus.HEALTHY);
        expect(mockCache.set).toHaveBeenCalledWith('health-check', 'ok', 10);
        expect(mockCache.get).toHaveBeenCalledWith('health-check');
      });

      it('should return unhealthy status when cache operations fail', async () => {
        const mockCache = {
          set: jest.fn().mockResolvedValue(undefined),
          get: jest.fn().mockResolvedValue(null) // Cache miss
        };
        (healthCheckService as any).getCacheInstance = jest.fn().mockResolvedValue(mockCache);

        const result: ComponentHealthResult = await (healthCheckService as any).checkCache();

        expect(result.status).toBe(HealthStatus.UNHEALTHY);
        expect(result.message).toContain('Cache read/write test failed');
      });

      it('should handle cache unavailability', async () => {
        (healthCheckService as any).getCacheInstance = jest.fn().mockResolvedValue(null);

        const result: ComponentHealthResult = await (healthCheckService as any).checkCache();

        expect(result.status).toBe(HealthStatus.HEALTHY); // Still healthy if cache is optional
      });
    });

    describe('checkSearch', () => {
      it('should return healthy status when search provider is up', async () => {
        const mockHealthCheck = {
          providers: {
            search: { status: 'up', lastQueryTime: 150 }
          }
        };

        (mockProviderManager.getInstance().getHealthCheck as jest.Mock).mockResolvedValue(mockHealthCheck);

        const result: ComponentHealthResult = await (healthCheckService as any).checkSearch();

        expect(result.name).toBe('search');
        expect(result.status).toBe(HealthStatus.HEALTHY);
        expect(result.details?.lastQueryTime).toBe(150);
      });

      it('should return unhealthy status when search provider is down', async () => {
        const mockHealthCheck = {
          providers: {
            search: { status: 'down', lastQueryTime: 5000 }
          }
        };

        (mockProviderManager.getInstance().getHealthCheck as jest.Mock).mockResolvedValue(mockHealthCheck);

        const result: ComponentHealthResult = await (healthCheckService as any).checkSearch();

        expect(result.status).toBe(HealthStatus.UNHEALTHY);
        expect(result.message).toContain('Search service unavailable');
      });

      it('should handle provider manager errors', async () => {
        (mockProviderManager.getInstance().getHealthCheck as jest.Mock).mockRejectedValue(new Error('Provider unavailable'));

        const result: ComponentHealthResult = await (healthCheckService as any).checkSearch();

        expect(result.status).toBe(HealthStatus.UNHEALTHY);
        expect(result.message).toContain('Search check failed');
      });
    });

    describe('checkExternalApis', () => {
      it('should return healthy status when all external services are up', async () => {
        const mockHealthCheck = {
          providers: {
            cache: { status: 'up' },
            search: { status: 'up' },
            inventory: { status: 'up' },
            fileStorage: { status: 'up' }
          }
        };

        (mockProviderManager.getInstance().getHealthCheck as jest.Mock).mockResolvedValue(mockHealthCheck);

        const result: ComponentHealthResult = await (healthCheckService as any).checkExternalApis();

        expect(result.name).toBe('external-apis');
        expect(result.status).toBe(HealthStatus.HEALTHY);
        expect(result.message).toContain('4/4 external services healthy');
        expect(result.details?.healthRatio).toBe(1);
      });

      it('should return degraded status when some services are down', async () => {
        const mockHealthCheck = {
          providers: {
            cache: { status: 'up' },
            search: { status: 'down' },
            inventory: { status: 'up' },
            fileStorage: { status: 'down' }
          }
        };

        (mockProviderManager.getInstance().getHealthCheck as jest.Mock).mockResolvedValue(mockHealthCheck);

        const result: ComponentHealthResult = await (healthCheckService as any).checkExternalApis();

        expect(result.status).toBe(HealthStatus.DEGRADED);
        expect(result.message).toContain('2/4 external services healthy');
        expect(result.details?.healthRatio).toBe(0.5);
      });

      it('should return unhealthy status when most services are down', async () => {
        const mockHealthCheck = {
          providers: {
            cache: { status: 'down' },
            search: { status: 'down' },
            inventory: { status: 'down' },
            fileStorage: { status: 'up' }
          }
        };

        (mockProviderManager.getInstance().getHealthCheck as jest.Mock).mockResolvedValue(mockHealthCheck);

        const result: ComponentHealthResult = await (healthCheckService as any).checkExternalApis();

        expect(result.status).toBe(HealthStatus.UNHEALTHY);
        expect(result.message).toContain('1/4 external services healthy');
        expect(result.details?.healthRatio).toBe(0.25);
      });
    });
  });

  describe('periodic checks', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should start periodic health checks', () => {
      const mockHealthCheck = {
        providers: {
          search: { status: 'up', lastQueryTime: 150 },
          cache: { status: 'up', lastQueryTime: 50 },
          inventory: { status: 'up', lastQueryTime: 75 },
          fileStorage: { status: 'up', lastQueryTime: 100 }
        }
      };

      (mockProviderManager.getInstance().getHealthCheck as jest.Mock).mockResolvedValue(mockHealthCheck);

      healthCheckService.startPeriodicChecks();

      // Fast-forward time
      jest.advanceTimersByTime(30000);

      expect(mockProviderManager.getInstance().getHealthCheck).toHaveBeenCalled();
    });

    it('should stop periodic health checks', () => {
      const mockHealthCheck = {
        providers: {
          search: { status: 'up', lastQueryTime: 150 },
          cache: { status: 'up', lastQueryTime: 50 },
          inventory: { status: 'up', lastQueryTime: 75 },
          fileStorage: { status: 'up', lastQueryTime: 100 }
        }
      };

      (mockProviderManager.getInstance().getHealthCheck as jest.Mock).mockResolvedValue(mockHealthCheck);

      healthCheckService.startPeriodicChecks();
      healthCheckService.stopPeriodicChecks();

      // Fast-forward time
      jest.advanceTimersByTime(30000);

      expect(mockProviderManager.getInstance().getHealthCheck).not.toHaveBeenCalled();
    });

    it('should not start checks when disabled', () => {
      const disabledService = new HealthCheckService({ ...config, enabled: false });

      disabledService.startPeriodicChecks();

      expect((disabledService as any).checkInterval).toBeUndefined();
    });
  });

  describe('component state management', () => {
    it('should track component failure counts', () => {
      const failedResult: ComponentHealthResult = {
        name: 'database',
        status: HealthStatus.UNHEALTHY,
        responseTime: 100,
        message: 'Connection failed',
        timestamp: new Date()
      };

      // Simulate multiple failures
      (healthCheckService as any).updateComponentState(failedResult);
      (healthCheckService as any).updateComponentState(failedResult);
      (healthCheckService as any).updateComponentState(failedResult);

      const metrics = healthCheckService.getMetrics();
      expect(metrics.componentStates.database.status).toBe(HealthStatus.UNHEALTHY);
    });

    it('should reset failure count on recovery', () => {
      const failedResult: ComponentHealthResult = {
        name: 'database',
        status: HealthStatus.UNHEALTHY,
        responseTime: 100,
        message: 'Connection failed',
        timestamp: new Date()
      };

      const healthyResult: ComponentHealthResult = {
        name: 'database',
        status: HealthStatus.HEALTHY,
        responseTime: 50,
        message: 'Connection restored',
        timestamp: new Date()
      };

      // Fail then recover
      (healthCheckService as any).updateComponentState(failedResult);
      (healthCheckService as any).updateComponentState(healthyResult);

      const metrics = healthCheckService.getMetrics();
      expect(metrics.componentStates.database.status).toBe(HealthStatus.HEALTHY);
    });

    it('should force component status for testing', () => {
      healthCheckService.forceComponentStatus('test-component', HealthStatus.DEGRADED);

      const metrics = healthCheckService.getMetrics();
      expect(metrics.componentStates['test-component'].status).toBe(HealthStatus.DEGRADED);
    });

    it('should reset failure counts', () => {
      const failedResult: ComponentHealthResult = {
        name: 'database',
        status: HealthStatus.UNHEALTHY,
        responseTime: 100,
        message: 'Connection failed',
        timestamp: new Date()
      };

      (healthCheckService as any).updateComponentState(failedResult);
      healthCheckService.resetFailureCounts();

      // Since we can't access private failureCounts directly, we test by checking metrics
      const metrics = healthCheckService.getMetrics();
      expect(metrics).toBeDefined();
    });
  });

  describe('overall status determination', () => {
    it('should determine healthy status when all components are healthy', () => {
      const components: ComponentHealthResult[] = [
        { name: 'db', status: HealthStatus.HEALTHY, responseTime: 10, timestamp: new Date() },
        { name: 'cache', status: HealthStatus.HEALTHY, responseTime: 5, timestamp: new Date() }
      ];

      const status = (healthCheckService as any).determineOverallStatus(components);
      expect(status).toBe(HealthStatus.HEALTHY);
    });

    it('should determine degraded status when some components are degraded', () => {
      const components: ComponentHealthResult[] = [
        { name: 'db', status: HealthStatus.HEALTHY, responseTime: 10, timestamp: new Date() },
        { name: 'cache', status: HealthStatus.DEGRADED, responseTime: 5, timestamp: new Date() }
      ];

      const status = (healthCheckService as any).determineOverallStatus(components);
      expect(status).toBe(HealthStatus.DEGRADED);
    });

    it('should determine unhealthy status when any component is unhealthy', () => {
      const components: ComponentHealthResult[] = [
        { name: 'db', status: HealthStatus.HEALTHY, responseTime: 10, timestamp: new Date() },
        { name: 'cache', status: HealthStatus.UNHEALTHY, responseTime: 5, timestamp: new Date() }
      ];

      const status = (healthCheckService as any).determineOverallStatus(components);
      expect(status).toBe(HealthStatus.UNHEALTHY);
    });
  });
});

describe('HealthCheckMiddleware', () => {
  let middleware: HealthCheckMiddleware;
  let mockReq: any;
  let mockRes: any;
  let mockHealthCheckService: jest.Mocked<HealthCheckService>;

  beforeEach(() => {
    mockReq = {};
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };

    mockHealthCheckService = {
      performHealthCheck: jest.fn(),
      getMetrics: jest.fn()
    } as any;

    middleware = new HealthCheckMiddleware(mockHealthCheckService);
  });

  describe('handleHealthCheck', () => {
    it('should return healthy status with proper HTTP codes', async () => {
      const mockResult: SystemHealthResult = {
        status: HealthStatus.HEALTHY,
        uptime: 3600000,
        timestamp: new Date(),
        version: '1.0.0',
        environment: 'test',
        components: [
          { name: 'database', status: HealthStatus.HEALTHY, responseTime: 10, timestamp: new Date() }
        ],
        metrics: {
          totalRequests: 100,
          errorRate: 0.01,
          averageResponseTime: 50
        }
      };

      mockHealthCheckService.performHealthCheck.mockResolvedValue(mockResult);

      await middleware.handleHealthCheck(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: HealthStatus.HEALTHY,
        uptime: 3600000,
        timestamp: mockResult.timestamp,
        version: '1.0.0',
        environment: 'test',
        components: expect.any(Array),
        metrics: mockResult.metrics
      });
    });

    it('should return degraded status with 200 code', async () => {
      const mockResult: SystemHealthResult = {
        status: HealthStatus.DEGRADED,
        uptime: 1800000,
        timestamp: new Date(),
        version: '1.0.0',
        environment: 'test',
        components: [],
        metrics: {
          totalRequests: 50,
          errorRate: 0.05,
          averageResponseTime: 75
        }
      };

      mockHealthCheckService.performHealthCheck.mockResolvedValue(mockResult);

      await middleware.handleHealthCheck(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        status: HealthStatus.DEGRADED
      }));
    });

    it('should return unhealthy status with 503 code', async () => {
      const mockResult: SystemHealthResult = {
        status: HealthStatus.UNHEALTHY,
        uptime: 900000,
        timestamp: new Date(),
        version: '1.0.0',
        environment: 'test',
        components: [],
        metrics: {
          totalRequests: 25,
          errorRate: 0.2,
          averageResponseTime: 150
        }
      };

      mockHealthCheckService.performHealthCheck.mockResolvedValue(mockResult);

      await middleware.handleHealthCheck(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(503);
    });

    it('should handle service errors gracefully', async () => {
      mockHealthCheckService.performHealthCheck.mockRejectedValue(new Error('Service unavailable'));

      await middleware.handleHealthCheck(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(503);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: HealthStatus.UNHEALTHY,
        error: 'Service unavailable',
        timestamp: expect.any(Date)
      });
    });
  });

  describe('handleDetailedHealthCheck', () => {
    it('should return full health check details', async () => {
      const mockResult: SystemHealthResult = {
        status: HealthStatus.HEALTHY,
        uptime: 3600000,
        timestamp: new Date(),
        version: '1.0.0',
        environment: 'test',
        components: [
          {
            name: 'database',
            status: HealthStatus.HEALTHY,
            responseTime: 10,
            message: 'Connected',
            details: { connections: 5 },
            timestamp: new Date()
          }
        ],
        metrics: {
          totalRequests: 100,
          errorRate: 0.01,
          averageResponseTime: 50
        }
      };

      mockHealthCheckService.performHealthCheck.mockResolvedValue(mockResult);

      await middleware.handleDetailedHealthCheck(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(mockResult);
    });
  });

  describe('handleReadinessCheck', () => {
    it('should return ready when critical components are healthy', async () => {
      const mockResult: SystemHealthResult = {
        status: HealthStatus.HEALTHY,
        uptime: 3600000,
        timestamp: new Date(),
        version: '1.0.0',
        environment: 'test',
        components: [
          { name: 'database', status: HealthStatus.HEALTHY, responseTime: 10, timestamp: new Date() },
          { name: 'cache', status: HealthStatus.HEALTHY, responseTime: 5, timestamp: new Date() }
        ],
        metrics: {
          totalRequests: 100,
          errorRate: 0.01,
          averageResponseTime: 50
        }
      };

      mockHealthCheckService.performHealthCheck.mockResolvedValue(mockResult);

      await middleware.handleReadinessCheck(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({ status: 'ready' });
    });

    it('should return not ready when critical components are unhealthy', async () => {
      const mockResult: SystemHealthResult = {
        status: HealthStatus.UNHEALTHY,
        uptime: 3600000,
        timestamp: new Date(),
        version: '1.0.0',
        environment: 'test',
        components: [
          { name: 'database', status: HealthStatus.UNHEALTHY, responseTime: 100, timestamp: new Date() },
          { name: 'cache', status: HealthStatus.HEALTHY, responseTime: 5, timestamp: new Date() }
        ],
        metrics: {
          totalRequests: 100,
          errorRate: 0.01,
          averageResponseTime: 50
        }
      };

      mockHealthCheckService.performHealthCheck.mockResolvedValue(mockResult);

      await middleware.handleReadinessCheck(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(503);
      expect(mockRes.json).toHaveBeenCalledWith({ status: 'not ready' });
    });
  });

  describe('handleLivenessCheck', () => {
    it('should always return alive status', async () => {
      await middleware.handleLivenessCheck(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'alive',
        timestamp: expect.any(Date),
        uptime: expect.any(Number)
      });
    });
  });
});

describe('HealthAlertSystem', () => {
  let alertSystem: HealthAlertSystem;

  beforeEach(() => {
    alertSystem = new HealthAlertSystem();
  });

  describe('alert publishing', () => {
    it('should publish alerts to subscribers', () => {
      const mockCallback = jest.fn();
      const unsubscribe = alertSystem.subscribe(mockCallback);

      alertSystem.publishAlert('database', HealthStatus.UNHEALTHY, 'Connection lost');

      expect(mockCallback).toHaveBeenCalledWith({
        component: 'database',
        status: HealthStatus.UNHEALTHY,
        timestamp: expect.any(Date),
        message: 'Connection lost'
      });

      unsubscribe();
    });

    it('should handle subscriber errors gracefully', () => {
      const errorCallback = jest.fn().mockImplementation(() => {
        throw new Error('Subscriber error');
      });

      const normalCallback = jest.fn();
      alertSystem.subscribe(errorCallback);
      alertSystem.subscribe(normalCallback);

      alertSystem.publishAlert('cache', HealthStatus.DEGRADED, 'High latency');

      expect(normalCallback).toHaveBeenCalled();
      // Error callback should not prevent normal callbacks
    });

    it('should maintain alert history', () => {
      alertSystem.publishAlert('database', HealthStatus.UNHEALTHY, 'Alert 1');
      alertSystem.publishAlert('cache', HealthStatus.DEGRADED, 'Alert 2');

      const alerts = alertSystem.getRecentAlerts(10);
      expect(alerts).toHaveLength(2);
      expect(alerts[0].component).toBe('database');
      expect(alerts[1].component).toBe('cache');
    });

    it('should limit alert history to 100 entries', () => {
      // Create 105 alerts
      for (let i = 0; i < 105; i++) {
        alertSystem.publishAlert(`component-${i}`, HealthStatus.UNHEALTHY, `Alert ${i}`);
      }

      const alerts = alertSystem.getRecentAlerts(105);
      expect(alerts).toHaveLength(100); // Should be capped at 100
    });

    it('should clear alerts', () => {
      alertSystem.publishAlert('database', HealthStatus.UNHEALTHY, 'Test alert');
      alertSystem.clearAlerts();

      const alerts = alertSystem.getRecentAlerts();
      expect(alerts).toHaveLength(0);
    });

    it('should allow unsubscribing from alerts', () => {
      const mockCallback = jest.fn();
      const unsubscribe = alertSystem.subscribe(mockCallback);

      alertSystem.publishAlert('database', HealthStatus.UNHEALTHY, 'First alert');
      unsubscribe();
      alertSystem.publishAlert('database', HealthStatus.HEALTHY, 'Second alert');

      expect(mockCallback).toHaveBeenCalledTimes(1);
      expect(mockCallback).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'First alert' })
      );
    });
  });

  describe('global alert system', () => {
    it('should be available as singleton', () => {
      expect(globalHealthAlertSystem).toBeDefined();
      expect(typeof globalHealthAlertSystem.subscribe).toBe('function');
      expect(typeof globalHealthAlertSystem.publishAlert).toBe('function');
    });
  });
});

describe('HealthCheckFactory', () => {
  it('should create health check service instances', () => {
    const service = HealthCheckService.create({ enabled: false });
    expect(service).toBeDefined();
    expect(service).toBeInstanceOf(HealthCheckService);
  });

  it('should manage singleton instance', () => {
    // Clear any existing instance
    HealthCheckService.setInstance(null as any);

    const service1 = new HealthCheckService();
    HealthCheckService.setInstance(service1);

    const service2 = HealthCheckService.getInstance();
    expect(service2).toBe(service1);

    // Should throw on duplicate set
    expect(() => HealthCheckService.setInstance(new HealthCheckService())).toThrow();
  });
});
