/**
 * Health Check Routes
 * Comprehensive health monitoring endpoints for the Order Service
 */

import express, { Request, Response } from 'express';
import { SupabaseClientManager } from '../../infrastructure/database/supabase.client';
import { circuitBreakerRegistry } from '../../infrastructure/circuit-breaker';
import { metricsCollector } from '../../infrastructure/monitoring/metrics';
import { appLogger } from '../../infrastructure/monitoring/logger';

const router = express.Router();

/**
 * Basic health check endpoint
 * GET /health
 */
router.get('/', async (req: Request, res: Response) => {
  const startTime = Date.now();

  try {
    // Check Supabase database connectivity (only concerned with Supabase, not Prisma)
    const supabaseHealth = await SupabaseClientManager.getInstance().healthCheck();
    const isHealthy = supabaseHealth.status === 'healthy';

    // Record health check metrics
    metricsCollector.recordHealthCheck('basic', isHealthy, Date.now() - startTime);

    const response = {
      service: 'order-service',
      status: isHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      uptime: process.uptime(),
      database: {
        prisma: false, // Not using Prisma
        supabase: isHealthy,
        details: {
          supabase: {
            status: supabaseHealth.status,
            latency: supabaseHealth.latency
          }
        }
      },
    };

    res.status(isHealthy ? 200 : 503).json(response);

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

/**
 * Detailed health check endpoint
 * GET /health/detailed
 */
router.get('/detailed', async (req: Request, res: Response) => {
  const startTime = Date.now();

  try {
    // Database health
    const supabaseHealth = await SupabaseClientManager.getInstance().healthCheck();
    const dbHealth = {
      prisma: false, // Not using Prisma
      supabase: supabaseHealth.status === 'healthy',
      details: {
        supabase: {
          status: supabaseHealth.status,
          latency: supabaseHealth.latency
        }
      }
    };

    // Circuit breaker status
    const circuitBreakers = circuitBreakerRegistry.getAllStats();

    // Memory usage
    const memUsage = process.memoryUsage();

    // System information
    const systemInfo = {
      platform: process.platform,
      arch: process.arch,
      nodeVersion: process.version,
      pid: process.pid,
      uptime: process.uptime(),
    };

    // Application metrics
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
      dbHealth.supabase && // Only check Supabase
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

/**
 * Readiness check endpoint
 * GET /health/ready
 */
router.get('/ready', async (req: Request, res: Response) => {
  const startTime = Date.now();

  try {
    // Check if Supabase database is ready (only concerned with Supabase)
    const supabaseHealth = await SupabaseClientManager.getInstance().healthCheck();
    const isReady = supabaseHealth.status === 'healthy';

    const dbHealth = {
      prisma: false, // Not using Prisma
      supabase: isReady,
      details: {
        supabase: {
          status: supabaseHealth.status,
          latency: supabaseHealth.latency
        }
      }
    };

    metricsCollector.recordHealthCheck('ready', isReady, Date.now() - startTime);

    if (isReady) {
      res.status(200).json({
        service: 'order-service',
        status: 'ready',
        timestamp: new Date().toISOString(),
        database: dbHealth,
      });
    } else {
      res.status(503).json({
        service: 'order-service',
        status: 'not ready',
        timestamp: new Date().toISOString(),
        database: dbHealth,
      });
    }

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

/**
 * Liveness check endpoint
 * GET /health/live
 */
router.get('/live', (req: Request, res: Response) => {
  const startTime = Date.now();

  // Basic liveness check - if the process is running and responding
  const isAlive = true;

  metricsCollector.recordHealthCheck('live', isAlive, Date.now() - startTime);

  res.status(200).json({
    service: 'order-service',
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

/**
 * Metrics endpoint (Prometheus format)
 * GET /health/metrics
 */
router.get('/metrics', async (req: Request, res: Response) => {
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

/**
 * Ping endpoint for load balancer health checks
 * GET /health/ping
 */
router.get('/ping', (req: Request, res: Response) => {
  res.status(200).json({
    service: 'order-service',
    status: 'pong',
    timestamp: new Date().toISOString(),
  });
});

/**
 * Circuit breaker status endpoint
 * GET /health/circuit-breakers
 */
router.get('/circuit-breakers', (req: Request, res: Response) => {
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
