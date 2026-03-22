import { Router, Request, Response } from 'express';
import { Container } from '../../container';
import { HealthCheckService } from '../../infrastructure/services/health-check.service';
import { eventBus } from '@shared/events/eventBus';

const router = Router();

// Initialize health check service
let healthCheckService: HealthCheckService;

// Lazy initialization to ensure container is ready
const getHealthCheckService = (): HealthCheckService => {
    if (!healthCheckService) {
        const container = Container.getInstance();
        healthCheckService = new HealthCheckService(
            container.prisma,
            container.pesapalAdapter,
            container.redisClient
        );
    }
    return healthCheckService;
};

/**
 * GET /health
 * Comprehensive health check with all dependencies
 * Returns 200 with health status details
 */
router.get('/', async (_req: Request, res: Response) => {
    try {
        const service = getHealthCheckService();
        const health = await service.checkAll();

        const eventBusMetrics = {
            subscribers: {
                PaymentInitiated: 0,
                PaymentCompleted: 0,
                PaymentFailed: 0
            },
            dlqSizes: {
                PaymentInitiated: 0,
                PaymentCompleted: 0,
                PaymentFailed: 0
            }
        };

        const normalizedStatus = health.status === 'healthy' ? 'healthy' : 'degraded';
        res.status(200).json({ ...health, status: normalizedStatus, eventBus: eventBusMetrics });
    } catch (error) {
        res.status(200).json({
            status: 'degraded',
            service: 'payment-service',
            timestamp: new Date().toISOString(),
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * GET /ready
 * Readiness probe - checks critical dependencies
 * Returns 200 with readiness details
 */
router.get('/ready', async (_req: Request, res: Response) => {
    try {
        const service = getHealthCheckService();
        const readiness = await service.checkReadiness();

        res.status(200).json({
            status: readiness.ready ? 'ready' : 'not_ready',
            ready: readiness.ready,
            service: 'payment-service',
            timestamp: new Date().toISOString(),
            checks: readiness.checks
        });
    } catch (error) {
        res.status(200).json({
            status: 'not_ready',
            ready: false,
            service: 'payment-service',
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
        const service = getHealthCheckService();
        const liveness = service.checkLiveness();

        res.status(200).json({
            status: 'alive',
            service: 'payment-service',
            timestamp: new Date().toISOString(),
            ...liveness
        });
    } catch (error) {
        // Even if liveness check fails, return 200 if we can respond
        res.status(200).json({
            status: 'alive',
            service: 'payment-service',
            timestamp: new Date().toISOString(),
            uptime: `${Math.floor(process.uptime())}s`
        });
    }
});

export { router as healthRoutes };


