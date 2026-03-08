import { Router, Request, Response } from 'express';
import { logger } from '../../infrastructure/services/logger.service';
import { eventBus } from '@shared/events/eventBus';

const router = Router();

router.get('/', async (_req: Request, res: Response) => {
    const uptime = process.uptime();
    const memUsage = process.memoryUsage();

    const eventBusMetrics = {
        subscribers: {
            WalletCredited: 0,
            WalletDebited: 0,
            CODSettlementRequested: 0
        },
        dlqSizes: {
            WalletCredited: 0,
            WalletDebited: 0,
            CODSettlementRequested: 0
        }
    };

    const healthCheck = {
        status: 'healthy',
        service: 'wallet-service',
        timestamp: new Date().toISOString(),
        uptime: `${Math.floor(uptime)}s`,
        memory: {
            rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`,
            heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`
        },
        eventBus: eventBusMetrics
    };

    res.status(200).json(healthCheck);
});

router.get('/ready', (_req: Request, res: Response) => {
    res.status(200).json({ status: 'ready', service: 'wallet-service' });
});

router.get('/live', (_req: Request, res: Response) => {
    res.status(200).json({ status: 'alive', service: 'wallet-service' });
});

export { router as healthRoutes };
