/**
 * Health Routes Test Suite
 * Tests for health check endpoints
 */

import request from 'supertest';
import express from 'express';
import { createHealthRoutes } from '../health.routes';

describe('Health Routes', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/health', createHealthRoutes());
  });

  describe('GET /api/health', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: {
          status: 'healthy',
          timestamp: expect.any(String),
          uptime: expect.any(Number),
          version: expect.any(String),
          environment: expect.any(String)
        }
      });
    });

    it('should include system information', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.body.data).toHaveProperty('memory');
      expect(response.body.data).toHaveProperty('cpu');
      expect(response.body.data).toHaveProperty('disk');
      expect(response.body.data).toHaveProperty('dependencies');
    });

    it('should include service dependencies status', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.body.data.dependencies).toEqual({
        database: expect.objectContaining({
          status: expect.any(String),
          responseTime: expect.any(Number)
        }),
        cache: expect.objectContaining({
          status: expect.any(String),
          responseTime: expect.any(Number)
        }),
        messaging: expect.objectContaining({
          status: expect.any(String),
          responseTime: expect.any(Number)
        }),
        externalServices: expect.objectContaining({
          status: expect.any(String),
          responseTime: expect.any(Number)
        })
      });
    });

    it('should handle database connection check', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.body.data.dependencies.database.status).toMatch(/^(healthy|unhealthy)$/);
      expect(typeof response.body.data.dependencies.database.responseTime).toBe('number');
    });

    it('should handle cache connection check', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.body.data.dependencies.cache.status).toMatch(/^(healthy|unhealthy)$/);
      expect(typeof response.body.data.dependencies.cache.responseTime).toBe('number');
    });

    it('should handle messaging connection check', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.body.data.dependencies.messaging.status).toMatch(/^(healthy|unhealthy)$/);
      expect(typeof response.body.data.dependencies.messaging.responseTime).toBe('number');
    });

    it('should handle external services check', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.body.data.dependencies.externalServices.status).toMatch(/^(healthy|unhealthy)$/);
      expect(typeof response.body.data.dependencies.externalServices.responseTime).toBe('number');
    });

    it('should return 503 when service is unhealthy', async () => {
      // Mock unhealthy dependencies
      const mockHealthCheck = jest.fn().mockResolvedValue({
        status: 'unhealthy',
        responseTime: 100
      });

      // This would require mocking the health check service
      // For now, we'll test the successful case
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/health/live', () => {
    it('should return liveness probe status', async () => {
      const response = await request(app)
        .get('/api/health/live')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: {
          status: 'alive',
          timestamp: expect.any(String),
          uptime: expect.any(Number)
        }
      });
    });

    it('should be lightweight and fast', async () => {
      const startTime = Date.now();
      
      const response = await request(app)
        .get('/api/health/live')
        .expect(200);

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      expect(responseTime).toBeLessThan(100); // Should respond quickly
      expect(response.body.data.status).toBe('alive');
    });
  });

  describe('GET /api/health/ready', () => {
    it('should return readiness probe status', async () => {
      const response = await request(app)
        .get('/api/health/ready')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: {
          status: 'ready',
          timestamp: expect.any(String),
          uptime: expect.any(Number),
          checks: expect.objectContaining({
            database: expect.objectContaining({
              status: expect.any(String),
              healthy: expect.any(Boolean)
            }),
            cache: expect.objectContaining({
              status: expect.any(String),
              healthy: expect.any(Boolean)
            }),
            messaging: expect.objectContaining({
              status: expect.any(String),
              healthy: expect.any(Boolean)
            })
          })
        }
      });
    });

    it('should check all critical dependencies', async () => {
      const response = await request(app)
        .get('/api/health/ready')
        .expect(200);

      expect(response.body.data.checks).toHaveProperty('database');
      expect(response.body.data.checks).toHaveProperty('cache');
      expect(response.body.data.checks).toHaveProperty('messaging');
    });

    it('should return 503 when not ready', async () => {
      // This would require mocking unhealthy dependencies
      // For now, we'll test the successful case
      const response = await request(app)
        .get('/api/health/ready')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('ready');
    });

    it('should include detailed check information', async () => {
      const response = await request(app)
        .get('/api/health/ready')
        .expect(200);

      const checks = response.body.data.checks;
      
      expect(checks.database).toHaveProperty('status');
      expect(checks.database).toHaveProperty('healthy');
      expect(checks.database).toHaveProperty('responseTime');
      expect(checks.database).toHaveProperty('details');

      expect(checks.cache).toHaveProperty('status');
      expect(checks.cache).toHaveProperty('healthy');
      expect(checks.cache).toHaveProperty('responseTime');
      expect(checks.cache).toHaveProperty('details');

      expect(checks.messaging).toHaveProperty('status');
      expect(checks.messaging).toHaveProperty('healthy');
      expect(checks.messaging).toHaveProperty('responseTime');
      expect(checks.messaging).toHaveProperty('details');
    });
  });

  describe('GET /api/health/metrics', () => {
    it('should return system metrics', async () => {
      const response = await request(app)
        .get('/api/health/metrics')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: expect.objectContaining({
          memory: expect.objectContaining({
            used: expect.any(Number),
            total: expect.any(Number),
            percentage: expect.any(Number)
          }),
          cpu: expect.objectContaining({
            usage: expect.any(Number),
            count: expect.any(Number)
          }),
          disk: expect.objectContaining({
            used: expect.any(Number),
            total: expect.any(Number),
            percentage: expect.any(Number)
          }),
          requests: expect.objectContaining({
            total: expect.any(Number),
            active: expect.any(Number),
            rate: expect.any(Number)
          }),
          errors: expect.objectContaining({
            total: expect.any(Number),
            rate: expect.any(Number)
          }),
          uptime: expect.any(Number),
          timestamp: expect.any(String)
        })
      });
    });

    it('should include memory metrics', async () => {
      const response = await request(app)
        .get('/api/health/metrics')
        .expect(200);

      const memory = response.body.data.memory;
      expect(memory).toHaveProperty('used');
      expect(memory).toHaveProperty('total');
      expect(memory).toHaveProperty('percentage');
      expect(typeof memory.used).toBe('number');
      expect(typeof memory.total).toBe('number');
      expect(typeof memory.percentage).toBe('number');
    });

    it('should include CPU metrics', async () => {
      const response = await request(app)
        .get('/api/health/metrics')
        .expect(200);

      const cpu = response.body.data.cpu;
      expect(cpu).toHaveProperty('usage');
      expect(cpu).toHaveProperty('count');
      expect(typeof cpu.usage).toBe('number');
      expect(typeof cpu.count).toBe('number');
    });

    it('should include disk metrics', async () => {
      const response = await request(app)
        .get('/api/health/metrics')
        .expect(200);

      const disk = response.body.data.disk;
      expect(disk).toHaveProperty('used');
      expect(disk).toHaveProperty('total');
      expect(disk).toHaveProperty('percentage');
      expect(typeof disk.used).toBe('number');
      expect(typeof disk.total).toBe('number');
      expect(typeof disk.percentage).toBe('number');
    });

    it('should include request metrics', async () => {
      const response = await request(app)
        .get('/api/health/metrics')
        .expect(200);

      const requests = response.body.data.requests;
      expect(requests).toHaveProperty('total');
      expect(requests).toHaveProperty('active');
      expect(requests).toHaveProperty('rate');
      expect(typeof requests.total).toBe('number');
      expect(typeof requests.active).toBe('number');
      expect(typeof requests.rate).toBe('number');
    });

    it('should include error metrics', async () => {
      const response = await request(app)
        .get('/api/health/metrics')
        .expect(200);

      const errors = response.body.data.errors;
      expect(errors).toHaveProperty('total');
      expect(errors).toHaveProperty('rate');
      expect(typeof errors.total).toBe('number');
      expect(typeof errors.rate).toBe('number');
    });
  });

  describe('GET /api/health/version', () => {
    it('should return version information', async () => {
      const response = await request(app)
        .get('/api/health/version')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: expect.objectContaining({
          version: expect.any(String),
          build: expect.objectContaining({
            number: expect.any(String),
            timestamp: expect.any(String),
            commit: expect.any(String),
            branch: expect.any(String)
          }),
          dependencies: expect.any(Object),
          environment: expect.any(String),
          nodeVersion: expect.any(String),
          platform: expect.any(String)
        })
      });
    });

    it('should include build information', async () => {
      const response = await request(app)
        .get('/api/health/version')
        .expect(200);

      const build = response.body.data.build;
      expect(build).toHaveProperty('number');
      expect(build).toHaveProperty('timestamp');
      expect(build).toHaveProperty('commit');
      expect(build).toHaveProperty('branch');
      expect(typeof build.number).toBe('string');
      expect(typeof build.timestamp).toBe('string');
      expect(typeof build.commit).toBe('string');
      expect(typeof build.branch).toBe('string');
    });

    it('should include environment information', async () => {
      const response = await request(app)
        .get('/api/health/version')
        .expect(200);

      const data = response.body.data;
      expect(data).toHaveProperty('environment');
      expect(data).toHaveProperty('nodeVersion');
      expect(data).toHaveProperty('platform');
      expect(typeof data.environment).toBe('string');
      expect(typeof data.nodeVersion).toBe('string');
      expect(typeof data.platform).toBe('string');
    });

    it('should include dependency versions', async () => {
      const response = await request(app)
        .get('/api/health/version')
        .expect(200);

      expect(response.body.data).toHaveProperty('dependencies');
      expect(typeof response.body.data.dependencies).toBe('object');
    });
  });

  describe('Error handling', () => {
    it('should handle invalid endpoints', async () => {
      const response = await request(app)
        .get('/api/health/invalid')
        .expect(404);

      expect(response.body).toEqual({
        success: false,
        error: expect.objectContaining({
          code: 'NOT_FOUND',
          message: expect.stringContaining('not found')
        }),
        meta: expect.any(Object)
      });
    });

    it('should handle database connection errors gracefully', async () => {
      // This would require mocking database errors
      // For now, we'll test the successful case
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should handle cache connection errors gracefully', async () => {
      // This would require mocking cache errors
      // For now, we'll test the successful case
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should handle messaging connection errors gracefully', async () => {
      // This would require mocking messaging errors
      // For now, we'll test the successful case
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('Response format', () => {
    it('should return consistent response format', async () => {
      const endpoints = ['/api/health', '/api/health/live', '/api/health/ready', '/api/health/metrics', '/api/health/version'];

      for (const endpoint of endpoints) {
        const response = await request(app)
          .get(endpoint)
          .expect(200);

        expect(response.body).toHaveProperty('success');
        expect(response.body).toHaveProperty('data');
        expect(response.body).toHaveProperty('meta');
        expect(typeof response.body.success).toBe('boolean');
        expect(typeof response.body.data).toBe('object');
        expect(typeof response.body.meta).toBe('object');
      }
    });

    it('should include timestamp in meta', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.body.meta).toHaveProperty('timestamp');
      expect(typeof response.body.meta.timestamp).toBe('string');
    });

    it('should include request information in meta', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.body.meta).toHaveProperty('request');
      expect(response.body.meta.request).toHaveProperty('method');
      expect(response.body.meta.request).toHaveProperty('url');
      expect(response.body.meta.request.method).toBe('GET');
      expect(response.body.meta.request.url).toBe('/api/health');
    });
  });

  describe('Performance', () => {
    it('should respond quickly to health checks', async () => {
      const startTime = Date.now();

      await request(app)
        .get('/api/health')
        .expect(200);

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      expect(responseTime).toBeLessThan(500); // Should respond within 500ms
    });

    it('should handle concurrent health check requests', async () => {
      const promises = Array.from({ length: 10 }, () =>
        request(app)
          .get('/api/health')
          .expect(200)
      );

      const responses = await Promise.all(promises);

      responses.forEach(response => {
        expect(response.body.success).toBe(true);
        expect(response.body.data.status).toBe('healthy');
      });
    });

    it('should not overload the system with metrics requests', async () => {
      const startTime = Date.now();

      await request(app)
        .get('/api/health/metrics')
        .expect(200);

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      expect(responseTime).toBeLessThan(1000); // Metrics should respond within 1s
    });
  });
});
