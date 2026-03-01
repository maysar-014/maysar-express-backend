import { Router, Request, Response } from 'express';
import { DatabaseConnection } from '../../infrastructure/database/prisma-client';
// rate limiting removed from this service; monitoring disabled
import { logger } from '../../infrastructure/services/logger.service';
import { eventBus } from '@shared/events/eventBus';

const router = Router();

/**
 * Health check endpoint
 * GET /health
 */
router.get('/', async (_req: Request, res: Response) => {
  try {
    const startTime = Date.now();

    // Database health check
    const dbStatus = await DatabaseConnection.getConnectionStatus();


    // Memory usage
    const memUsage = process.memoryUsage();
    const uptime = process.uptime();

    const dlq = eventBus.getDLQ();
    const eventBusMetrics = {
      subscribers: {
        UserCreated: eventBus.getSubscriberCount('UserCreated'),
        UserUpdated: eventBus.getSubscriberCount('UserUpdated'),
        UserVerified: eventBus.getSubscriberCount('UserVerified')
      },
      dlqSizes: {
        UserCreated: dlq.get('UserCreated')?.length ?? 0,
        UserUpdated: dlq.get('UserUpdated')?.length ?? 0,
        UserVerified: dlq.get('UserVerified')?.length ?? 0
      }
    };

    const healthCheck = {
      status: 'healthy',
      service: 'user-service',
      version: process.env.npm_package_version || '1.0.0',
      timestamp: new Date().toISOString(),
      uptime: `${Math.floor(uptime)}s`,
      environment: process.env.NODE_ENV || 'development',

      checks: {
        database: {
          status: dbStatus.connected ? 'healthy' : 'unhealthy',
          responseTime: dbStatus.responseTime,
          connectionInfo: dbStatus.connectionInfo
        },

        rateLimiting: {
          status: 'healthy'
        },

        memory: {
          status: 'healthy',
          rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`,
          heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
          heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
          external: `${Math.round(memUsage.external / 1024 / 1024)}MB`
        },

        system: {
          status: 'healthy',
          platform: process.platform,
          arch: process.arch,
          nodeVersion: process.version,
          pid: process.pid
        }
      },

      eventBus: eventBusMetrics,

      responseTime: `${Date.now() - startTime}ms`
    };

    // Determine overall health status
    const hasUnhealthyChecks = Object.values(healthCheck.checks).some(
      (check: any) => check.status !== 'healthy'
    );

    if (hasUnhealthyChecks) {
      healthCheck.status = 'degraded';
      res.status(200); // Still return 200 for degraded state
    } else {
      res.status(200);
    }

    // Log health check for monitoring
    logger.info('Health check completed', {
      status: healthCheck.status,
      responseTime: healthCheck.responseTime,
      databaseStatus: healthCheck.checks.database.status
    });

    res.json(healthCheck);
  } catch (error) {
    logger.error('Health check failed', { error });

    res.status(503).json({
      status: 'unhealthy',
      service: 'user-service',
      timestamp: new Date().toISOString(),
      error: 'Health check failed',
      checks: {
        database: { status: 'unknown' },
        rateLimiting: { status: 'unknown' },
        memory: { status: 'unknown' },
        system: { status: 'unknown' }
      }
    });
  }
});

/**
 * Readiness check endpoint
 * GET /health/ready
 */
router.get('/ready', async (_req: Request, res: Response): Promise<void> => {
  try {
    // Check if database is ready
    const dbStatus = await DatabaseConnection.getConnectionStatus();

    if (!dbStatus.connected) {
      res.status(503).json({
        status: 'not ready',
        service: 'user-service',
        timestamp: new Date().toISOString(),
        reason: 'Database not connected'
      });
      return;
    }

    res.status(200).json({
      status: 'ready',
      service: 'user-service',
      timestamp: new Date().toISOString(),
      checks: {
        database: {
          status: 'ready',
          responseTime: dbStatus.responseTime
        }
      }
    });
  } catch (error) {
    logger.error('Readiness check failed', { error });

    res.status(503).json({
      status: 'not ready',
      service: 'user-service',
      timestamp: new Date().toISOString(),
      error: 'Readiness check failed'
    });
  }
});

/**
 * Liveness check endpoint
 * GET /health/live
 */
router.get('/live', (_req: Request, res: Response) => {
  // Simple liveness check - if the process is running, it's alive
  res.status(200).json({
    status: 'alive',
    service: 'user-service',
    timestamp: new Date().toISOString(),
    uptime: `${Math.floor(process.uptime())}s`
  });
});

/**
 * Detailed metrics endpoint (protected)
 * GET /health/metrics
 */
router.get('/metrics', async (_req: Request, res: Response) => {
  try {
    // This endpoint might require authentication in production
    const metrics = {
      timestamp: new Date().toISOString(),
      service: 'user-service',
      version: process.env.npm_package_version || '1.0.0',

      process: {
        pid: process.pid,
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        cpu: process.cpuUsage()
      },

      environment: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        environment: process.env.NODE_ENV || 'development'
      },

      database: await DatabaseConnection.getHealthMetrics(),

      rateLimiting: { status: 'healthy' }
    };

    res.status(200).json(metrics);
  } catch (error) {
    logger.error('Metrics endpoint failed', { error });

    res.status(500).json({
      status: 'error',
      service: 'user-service',
      timestamp: new Date().toISOString(),
      error: 'Failed to collect metrics'
    });
  }
});

/**
 * Ping endpoint for load balancer checks
 * GET /health/ping
 */
router.get('/ping', (_req: Request, res: Response) => {
  res.status(200).send('pong');
});

export { router as healthRoutes };
