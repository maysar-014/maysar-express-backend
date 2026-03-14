/**
 * Health Check Routes
 * Comprehensive health monitoring endpoints for the Order Service
 */

import express, { Request, Response } from 'express';
import { databaseManager } from '../../config/database.config';
import { circuitBreakerRegistry } from '../../infrastructure/circuit-breaker';
import { metricsCollector } from '../../infrastructure/monitoring/metrics';
import { appLogger } from '../../infrastructure/monitoring/logger';

const router = express.Router();

router.get('/', async (_req: Request, res: Response) => {
  const startTime = Date.now();

  try {
    const dbHealth = await databaseManager.healthCheck();
    const isHealthy = dbHealth.prisma;

    metricsCollector.recordHealthCheck('basic', isHealthy, Date.now() - startTime);

    res.status(isHealthy ? 200 : 503).json({
      service: 'order-service',
      status: isHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      uptime: process.uptime(),
      database: {
        prisma: dbHealth.prisma,
        details: dbHealth.details,
      },
    });
  } catch (error) {
    appLogger.error('Health check failed', error);

    metricsCollector.recordHealthCheck('basic', false, Date.now() - startTime);

    res.status(503).json({
      service: 'order-service',
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Health check failed',
    });
  }
});

router.get('/detailed', async (_req: Request, res: Response) => {
  const startTime = Date.now();

  try {
    const dbHealth = await databaseManager.healthCheck();
    const circuitBreakers = circuitBreakerRegistry.getAllStats();
    const memUsage = process.memoryUsage();

    const systemInfo = {
      platform: process.platform,
      arch: process.arch,
      nodeVersion: process.version,
      pid: process.pid,
      uptime: process.uptime(),
    };

    const appMetrics = {
      memory: {
        rss: memUsage.rss,
        heapUsed: memUsage.heapUsed,
        heapTotal: memUsage.heapTotal,
        external: memUsage.external,
      },
      circuitBreakers,
    };

    const isHealthy =
      dbHealth.prisma &&
      Object.values(circuitBreakers).every(cb => cb.state === 'CLOSED');

    metricsCollector.recordHealthCheck('detailed', isHealthy, Date.now() - startTime);

    res.status(isHealthy ? 200 : 503).json({
      service: 'order-service',
      status: isHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      checks: {
        database: dbHealth,
        circuitBreakers,
        system: systemInfo,
        metrics: appMetrics,
      },
    });
  } catch (error) {
    appLogger.error('Detailed health check failed', error);

    metricsCollector.recordHealthCheck('detailed', false, Date.now() - startTime);

    res.status(503).json({
      service: 'order-service',
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Detailed health check failed',
    });
  }
});

router.get('/ready', async (_req: Request, res: Response) => {
  const startTime = Date.now();

  try {
    const dbHealth = await databaseManager.healthCheck();
    const isReady = dbHealth.prisma;

    metricsCollector.recordHealthCheck('ready', isReady, Date.now() - startTime);

    res.status(isReady ? 200 : 503).json({
      service: 'order-service',
      status: isReady ? 'ready' : 'not ready',
      timestamp: new Date().toISOString(),
      database: dbHealth,
    });
  } catch (error) {
    appLogger.error('Readiness check failed', error);

    metricsCollector.recordHealthCheck('ready', false, Date.now() - startTime);

    res.status(503).json({
      service: 'order-service',
      status: 'not ready',
      timestamp: new Date().toISOString(),
      error: 'Readiness check failed',
    });
  }
});

router.get('/live', (_req: Request, res: Response) => {
  const startTime = Date.now();
  metricsCollector.recordHealthCheck('live', true, Date.now() - startTime);

  res.status(200).json({
    service: 'order-service',
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

router.get('/metrics', async (_req: Request, res: Response) => {
  try {
    const metrics = await metricsCollector.getMetrics();

    res.set('Content-Type', 'text/plain; charset=utf-8');
    res.status(200).send(metrics);
  } catch (error) {
    appLogger.error('Metrics endpoint failed', error);

    res.status(500).json({
      error: 'Failed to retrieve metrics',
      timestamp: new Date().toISOString(),
    });
  }
});

router.get('/ping', (_req: Request, res: Response) => {
  res.status(200).json({
    service: 'order-service',
    status: 'pong',
    timestamp: new Date().toISOString(),
  });
});

router.get('/circuit-breakers', (_req: Request, res: Response) => {
  try {
    const circuitBreakers = circuitBreakerRegistry.getAllStats();

    res.status(200).json({
      service: 'order-service',
      timestamp: new Date().toISOString(),
      circuitBreakers,
    });
  } catch (error) {
    appLogger.error('Circuit breaker status check failed', error);

    res.status(500).json({
      error: 'Failed to retrieve circuit breaker status',
      timestamp: new Date().toISOString(),
    });
  }
});

export default router;