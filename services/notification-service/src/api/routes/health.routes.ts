import { Router, Request, Response } from 'express';
import { DatabaseConnection } from '../../infrastructure/database/prisma-client';
import { logger } from '../../infrastructure/services/logger.service';

const router = Router();

router.get('/', async (_req: Request, res: Response) => {
  try {
    const dbStatus = await DatabaseConnection.getConnectionStatus();
    const memUsage = process.memoryUsage();
    const healthCheck = {
      status: dbStatus.connected ? 'healthy' : 'degraded',
      service: 'notification-service',
      version: process.env.npm_package_version || '1.0.0',
      timestamp: new Date().toISOString(),
      uptime: `${Math.floor(process.uptime())}s`,
      environment: process.env.NODE_ENV || 'development',
      checks: {
        database: {
          status: dbStatus.connected ? 'healthy' : 'unhealthy',
          responseTime: dbStatus.responseTime,
          connectionInfo: dbStatus.connectionInfo
        },
        memory: {
          status: 'healthy',
          rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`,
          heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`
        }
      }
    };
    res.status(200).json(healthCheck);
  } catch (error) {
    logger.error('Health check failed', { error });
    res.status(503).json({
      status: 'unhealthy',
      service: 'notification-service',
      timestamp: new Date().toISOString(),
      error: 'Health check failed'
    });
  }
});

router.get('/ready', async (_req: Request, res: Response) => {
  try {
    const dbStatus = await DatabaseConnection.getConnectionStatus();
    if (!dbStatus.connected) {
      res.status(503).json({ status: 'not ready', reason: 'Database not connected' });
      return;
    }
    res.status(200).json({ status: 'ready', timestamp: new Date().toISOString() });
  } catch (error) {
    res.status(503).json({ status: 'not ready', error: 'Readiness check failed' });
  }
});

router.get('/live', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'alive', timestamp: new Date().toISOString(), uptime: `${Math.floor(process.uptime())}s` });
});

export const healthRoutes = router;
