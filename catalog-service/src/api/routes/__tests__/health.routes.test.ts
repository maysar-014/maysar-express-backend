/**
 * Health Routes Tests
 * Comprehensive testing of health monitoring endpoints and service status checks
 * Validates health probes, service readiness, and monitoring capabilities
 */

import { Router } from 'express';
import request from 'supertest';
import express from 'express';
import { createHealthRoutes, HealthRoutesFactory, HEALTH_ROUTES_METADATA } from '../health.routes';

// Mock Express app for integration testing
function createTestApp(routes: Router): express.Application {
  const app = express();
  app.use(express.json());
  app.use(routes);
  return app;
}

describe('Health Routes', () => {
  let app: express.Application;
  let routes: Router;

  beforeEach(() => {
    jest.clearAllMocks();
    routes = createHealthRoutes();
    app = createTestApp(routes);
  });

  describe('Route Registration', () => {
    it('should create a Router instance', () => {
      expect(routes).toBeDefined();
      expect(typeof routes).toBe('function');
    });

    it('should have correct route metadata', () => {
      expect(HEALTH_ROUTES_METADATA.version).toBe('v1');
      expect(HEALTH_ROUTES_METADATA.prefix).toBe('/api/v1');
      expect(HEALTH_ROUTES_METADATA.routes).toHaveLength(7);
      expect(HEALTH_ROUTES_METADATA.healthChecks).toEqual([
        'basic_health',
        'readiness_probe',
        'liveness_probe',
        'detailed_health',
        'service_info'
      ]);
    });
  });

  describe('Basic Health Check - GET /api/v1/health', () => {
    it('should return healthy status', async () => {
      const response = await request(app)
        .get('/api/v1/health');

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        status: 'healthy',
        service: 'catalog-service',
        version: '1.0.0'
      });
      expect(response.body.timestamp).toBeDefined();
      expect(typeof response.body.uptime).toBe('number');
    });

    it('should include required health fields', async () => {
      const response = await request(app)
        .get('/api/v1/health');

      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('uptime');
      expect(response.body).toHaveProperty('version');
      expect(response.body).toHaveProperty('service');

      // Validate timestamp format
      expect(new Date(response.body.timestamp).toISOString()).toBe(response.body.timestamp);
    });
  });

  describe('Readiness Probe - GET /api/v1/health/ready', () => {
    it('should return ready status when service is ready', async () => {
      // Mock checkServiceReadiness to return true
      const originalCheckReadiness = (global as any).checkServiceReadiness;
      (global as any).checkServiceReadiness = jest.fn().mockResolvedValue(true);

      const response = await request(app)
        .get('/api/v1/health/ready');

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        status: 'ready',
        checks: {
          database: true,
          cache: true,
          messageBus: true
        }
      });
      expect(response.body.timestamp).toBeDefined();

      // Restore original function
      (global as any).checkServiceReadiness = originalCheckReadiness;
    });

    it('should return not ready status when service is not ready', async () => {
      // Mock checkServiceReadiness to return false
      const originalCheckReadiness = (global as any).checkServiceReadiness;
      (global as any).checkServiceReadiness = jest.fn().mockResolvedValue(false);

      const response = await request(app)
        .get('/api/v1/health/ready');

      expect(response.status).toBe(503);
      expect(response.body).toMatchObject({
        status: 'not_ready',
        checks: {
          database: false,
          cache: false,
          messageBus: false
        }
      });
      expect(response.body.timestamp).toBeDefined();

      // Restore original function
      (global as any).checkServiceReadiness = originalCheckReadiness;
    });

    it('should include timestamp and validate format', async () => {
      const response = await request(app)
        .get('/api/v1/health/ready');

      expect(response.body.timestamp).toBeDefined();
      expect(new Date(response.body.timestamp).toISOString()).toBe(response.body.timestamp);
    });
  });

  describe('Liveness Probe - GET /api/v1/health/live', () => {
    it('should return alive status', async () => {
      const response = await request(app)
        .get('/api/v1/health/live');

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        status: 'alive'
      });
      expect(response.body.timestamp).toBeDefined();
      expect(response.body.memory).toBeDefined();
    });

    it('should include memory usage information', async () => {
      const response = await request(app)
        .get('/api/v1/health/live');

      expect(response.body.memory).toHaveProperty('used');
      expect(response.body.memory).toHaveProperty('total');
      expect(response.body.memory).toHaveProperty('unit');
      expect(response.body.memory.unit).toBe('MB');

      // Memory values should be reasonable numbers
      expect(typeof response.body.memory.used).toBe('number');
      expect(typeof response.body.memory.total).toBe('number');
      expect(response.body.memory.used).toBeGreaterThanOrEqual(0);
      expect(response.body.memory.total).toBeGreaterThanOrEqual(0);
    });

    it('should include valid timestamp', async () => {
      const response = await request(app)
        .get('/api/v1/health/live');

      expect(response.body.timestamp).toBeDefined();
      expect(new Date(response.body.timestamp).toISOString()).toBe(response.body.timestamp);
    });
  });

  describe('Detailed Health Check - GET /api/v1/health/detailed', () => {
    it('should return detailed health status when enabled', async () => {
      const response = await request(app)
        .get('/api/v1/health/detailed');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('overall');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('uptime');
      expect(response.body).toHaveProperty('version');
      expect(response.body).toHaveProperty('checks');
      expect(response.body).toHaveProperty('summary');
    });

    it('should include comprehensive health checks', async () => {
      const response = await request(app)
        .get('/api/v1/health/detailed');

      const checks = response.body.checks;
      expect(checks).toHaveProperty('database');
      expect(checks).toHaveProperty('cache');
      expect(checks).toHaveProperty('messageBus');
      expect(checks).toHaveProperty('search');
      expect(checks).toHaveProperty('externalServices');

      // Validate database check structure
      expect(checks.database).toHaveProperty('status');
      expect(checks.database).toHaveProperty('latency');
      expect(checks.database).toHaveProperty('connections');

      // Validate cache check structure
      expect(checks.cache).toHaveProperty('status');
      expect(checks.cache).toHaveProperty('hitRate');
      expect(checks.cache).toHaveProperty('memoryUsage');

      // Validate external services structure
      expect(checks.externalServices).toHaveProperty('services');
      expect(checks.externalServices.services).toHaveProperty('cdn');
      expect(checks.externalServices.services).toHaveProperty('payment');
      expect(checks.externalServices.services).toHaveProperty('notification');
    });

    it('should include summary statistics', async () => {
      const response = await request(app)
        .get('/api/v1/health/detailed');

      const summary = response.body.summary;
      expect(summary).toHaveProperty('totalChecks');
      expect(summary).toHaveProperty('healthy');
      expect(summary).toHaveProperty('degraded');
      expect(summary).toHaveProperty('unhealthy');

      // Validate summary calculations
      expect(summary.totalChecks).toBe(5); // database, cache, messageBus, search, externalServices
      expect(summary.healthy + summary.degraded + summary.unhealthy).toBe(summary.totalChecks);
    });

    it('should determine overall status correctly', async () => {
      const response = await request(app)
        .get('/api/v1/health/detailed');

      const overall = response.body.overall;
      expect(['healthy', 'degraded', 'unhealthy']).toContain(overall);

      // With mock data, should be healthy
      expect(overall).toBe('healthy');
    });

    it('should return forbidden when detailed health is disabled', async () => {
      const disabledRoutes = createHealthRoutes({ enableDetailedHealth: false });
      const disabledApp = createTestApp(disabledRoutes);

      const response = await request(disabledApp)
        .get('/api/v1/health/detailed');

      expect(response.status).toBe(403);
      expect(response.body).toMatchObject({
        status: 'forbidden',
        message: 'Detailed health checks are disabled'
      });
    });
  });

  describe('Load Balancer Health Check - GET /health', () => {
    it('should return simple OK response for load balancers', async () => {
      const response = await request(app)
        .get('/health');

      expect(response.status).toBe(200);
      expect(response.text).toBe('OK');
    });

    it('should not return JSON for load balancer endpoint', async () => {
      const response = await request(app)
        .get('/health');

      expect(response.headers['content-type']).toContain('text/html');
      expect(response.text).toBe('OK');
    });
  });

  describe('Ping Endpoint - GET /api/v1/ping', () => {
    it('should respond with pong', async () => {
      const response = await request(app)
        .get('/api/v1/ping');

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        pong: true,
        service: 'catalog-service'
      });
      expect(response.body.timestamp).toBeDefined();
    });

    it('should include valid timestamp', async () => {
      const response = await request(app)
        .get('/api/v1/ping');

      expect(response.body.timestamp).toBeDefined();
      expect(new Date(response.body.timestamp).toISOString()).toBe(response.body.timestamp);
    });
  });

  describe('Service Info - GET /api/v1/info', () => {
    it('should return comprehensive service information', async () => {
      const response = await request(app)
        .get('/api/v1/info');

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        service: 'catalog-service',
        version: '1.0.0'
      });
      expect(response.body).toHaveProperty('environment');
      expect(response.body).toHaveProperty('uptime');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('endpoints');
    });

    it('should include all available endpoints', async () => {
      const response = await request(app)
        .get('/api/v1/info');

      const endpoints = response.body.endpoints;
      expect(endpoints).toContain('GET /api/v1/health');
      expect(endpoints).toContain('GET /api/v1/health/ready');
      expect(endpoints).toContain('GET /api/v1/health/live');
      expect(endpoints).toContain('GET /api/v1/health/detailed');
      expect(endpoints).toContain('GET /api/v1/ping');
      expect(endpoints).toContain('GET /api/v1/info');
      expect(endpoints).toHaveLength(6);
    });

    it('should include environment information', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const response = await request(app)
        .get('/api/v1/info');

      expect(response.body.environment).toBe('production');

      // Restore environment
      process.env.NODE_ENV = originalEnv;
    });

    it('should include uptime as number', async () => {
      const response = await request(app)
        .get('/api/v1/info');

      expect(typeof response.body.uptime).toBe('number');
      expect(response.body.uptime).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Configuration Handling', () => {
    it('should support custom API version', async () => {
      const customRoutes = createHealthRoutes({ apiVersion: 'v2' });
      const customApp = createTestApp(customRoutes);

      const response = await request(customApp)
        .get('/api/v2/health');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('healthy');
    });

    it('should support disabling detailed health checks', async () => {
      const customRoutes = createHealthRoutes({ enableDetailedHealth: false });
      const customApp = createTestApp(customRoutes);

      const response = await request(customApp)
        .get('/api/v1/health/detailed');

      expect(response.status).toBe(403);
    });

    it('should use default configuration when none provided', async () => {
      const defaultRoutes = createHealthRoutes();
      const defaultApp = createTestApp(defaultRoutes);

      const response = await request(defaultApp)
        .get('/api/v1/health');

      expect(response.status).toBe(200);
      expect(response.body.service).toBe('catalog-service');
    });
  });

  describe('HealthRoutesFactory', () => {
    describe('create', () => {
      it('should create health routes with default config', () => {
        const routes = HealthRoutesFactory.create();

        expect(routes).toBeDefined();
        expect(typeof routes).toBe('function');
      });

      it('should create health routes with custom config', () => {
        const routes = HealthRoutesFactory.create({
          apiVersion: 'v2',
          enableDetailedHealth: false
        });

        expect(routes).toBeDefined();
      });
    });
  });

  describe('Route Metadata Validation', () => {
    it('should export comprehensive metadata', () => {
      expect(HEALTH_ROUTES_METADATA).toBeDefined();
      expect(HEALTH_ROUTES_METADATA.version).toBe('v1');
      expect(HEALTH_ROUTES_METADATA.routes).toHaveLength(7);
      expect(HEALTH_ROUTES_METADATA.healthChecks).toHaveLength(5);
    });

    it('should include all health check endpoints in metadata', () => {
      const routes = HEALTH_ROUTES_METADATA.routes;
      const paths = routes.map(r => r.path);

      expect(paths).toContain('/health');
      expect(paths).toContain('/health/ready');
      expect(paths).toContain('/health/live');
      expect(paths).toContain('/health/detailed');
      expect(paths).toContain('/ping');
      expect(paths).toContain('/info');
    });

    it('should specify correct HTTP methods', () => {
      const routes = HEALTH_ROUTES_METADATA.routes;
      const methods = routes.map(r => r.method);

      expect(methods.every(method => method === 'GET')).toBe(true);
    });

    it('should mark all endpoints as requiring no authentication', () => {
      const routes = HEALTH_ROUTES_METADATA.routes;
      const auths = routes.map(r => r.auth);

      expect(auths.every(auth => auth === 'none')).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle route-level errors gracefully', async () => {
      const invalidRoutes = createHealthRoutes({});
      const invalidApp = createTestApp(invalidRoutes);

      const response = await request(invalidApp)
        .get('/api/v1/non-existent-endpoint');

      expect(response.status).toBe(404);
    });
  });

  describe('Performance and Load Testing', () => {
    it('should handle multiple concurrent health checks', async () => {
      const promises = Array(10).fill().map(() =>
        request(app).get('/api/v1/health')
      );

      const responses = await Promise.all(promises);

      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.status).toBe('healthy');
      });
    });

    it('should respond quickly to basic health checks', async () => {
      const startTime = Date.now();

      await request(app).get('/api/v1/health');

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      // Should respond within 100ms
      expect(responseTime).toBeLessThan(100);
    });
  });

  describe('Kubernetes Compatibility', () => {
    it('should provide proper HTTP status codes for probes', async () => {
      // Readiness probe
      const readyResponse = await request(app).get('/api/v1/health/ready');
      expect([200, 503]).toContain(readyResponse.status);

      // Liveness probe
      const liveResponse = await request(app).get('/api/v1/health/live');
      expect(liveResponse.status).toBe(200);

      // Basic health
      const healthResponse = await request(app).get('/api/v1/health');
      expect(healthResponse.status).toBe(200);
    });

    it('should provide load balancer compatible endpoint', async () => {
      const lbResponse = await request(app).get('/health');

      expect(lbResponse.status).toBe(200);
      expect(lbResponse.text).toBe('OK');
    });
  });

  describe('Monitoring and Observability', () => {
    it('should include timestamp in all responses', async () => {
      const endpoints = [
        '/api/v1/health',
        '/api/v1/health/ready',
        '/api/v1/health/live',
        '/api/v1/ping',
        '/api/v1/info'
      ];

      for (const endpoint of endpoints) {
        const response = await request(app).get(endpoint);
        expect(response.body.timestamp).toBeDefined();
        expect(new Date(response.body.timestamp).toISOString()).toBe(response.body.timestamp);
      }
    });

    it('should include consistent service identification', async () => {
      const endpoints = [
        '/api/v1/health',
        '/api/v1/ping',
        '/api/v1/info'
      ];

      for (const endpoint of endpoints) {
        const response = await request(app).get(endpoint);
        expect(response.body.service).toBe('catalog-service');
      }
    });
  });
});
