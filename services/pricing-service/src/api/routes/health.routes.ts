import { Router, Request, Response } from 'express';
import { HealthCheckService } from '../../infrastructure/services/health-check.service';

const router = Router();

/**
 * GET /health
 * Comprehensive health check with all dependencies
 * Returns 200 if healthy, 503 if unhealthy or degraded
 */
router.get('/', async (_req: Request, res: Response) => {
    try {
        const health = await HealthCheckService.checkAll();

        const statusCode = health.status === 'healthy' ? 200 : 503;

        res.status(statusCode).json(health);
    } catch (error) {
        res.status(503).json({
            status: 'unhealthy',
            service: 'pricing-service',
            timestamp: new Date().toISOString(),
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * GET /ready
 * Readiness probe - checks critical dependencies
 * Returns 200 if ready, 503 if not ready
 */
router.get('/ready', async (_req: Request, res: Response) => {
    try {
        const readiness = await HealthCheckService.checkReadiness();

        const statusCode = readiness.ready ? 200 : 503;

        res.status(statusCode).json({
            status: readiness.ready ? 'ready' : 'not_ready',
            service: 'pricing-service',
            timestamp: new Date().toISOString(),
            checks: readiness.checks
        });
    } catch (error) {
        res.status(503).json({
            status: 'not_ready',
            service: 'pricing-service',
            timestamp: new Date().toISOString(),
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * GET /live
 * Liveness probe - basic process health
 * Always returns 200 unless process is dying
 */
router.get('/live', (_req: Request, res: Response) => {
    try {
        const liveness = HealthCheckService.checkLiveness();

        res.status(200).json({
            status: 'alive',
            service: 'pricing-service',
            timestamp: new Date().toISOString(),
            ...liveness
        });
    } catch (error) {
        // Even if liveness check fails, return 200 if we can respond
        res.status(200).json({
            status: 'alive',
            service: 'pricing-service',
            timestamp: new Date().toISOString(),
            uptime: `${Math.floor(process.uptime())}s`
        });
    }
});

export { router as healthRoutes };

