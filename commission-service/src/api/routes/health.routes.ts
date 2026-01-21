/**
 * Health Routes
 * Health check endpoints for monitoring
 */

import { Router, Request, Response } from 'express';

const router = Router();

/**
 * GET /health
 * Basic health check
 */
router.get('/', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'commission-service',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

/**
 * GET /health/detailed
 * Detailed health check with dependencies
 */
router.get('/detailed', async (req: Request, res: Response) => {
  try {
    const { HealthCheckService } = await import('../../infrastructure/services/health-check.service');
    const dependencies = await HealthCheckService.checkAll();

    const health = {
      status: 'healthy',
      service: 'commission-service',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      dependencies
    };

    // Check if all dependencies are healthy
    const allHealthy = Object.values(dependencies).every(dep => dep.status === 'healthy');
    health.status = allHealthy ? 'healthy' : 'unhealthy';

    const statusCode = allHealthy ? 200 : 503;
    res.status(statusCode).json(health);
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      service: 'commission-service',
      timestamp: new Date().toISOString(),
      error: 'Health check failed'
    });
  }
});

/**
 * GET /health/ready
 * Readiness check for Kubernetes
 */
router.get('/ready', (req: Request, res: Response) => {
  // TODO: Implement actual readiness checks (database connections, etc.)
  res.status(200).json({
    status: 'ready',
    service: 'commission-service',
    timestamp: new Date().toISOString()
  });
});

/**
 * GET /health/live
 * Liveness check for Kubernetes
 */
router.get('/live', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'alive',
    service: 'commission-service',
    timestamp: new Date().toISOString()
  });
});

export default router;
