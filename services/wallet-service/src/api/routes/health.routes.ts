import { Router, Request, Response } from 'express';
import { logger } from '../../infrastructure/services/logger.service';

const router = Router();

router.get('/', async (_req: Request, res: Response) => {
    const uptime = process.uptime();
    const memUsage = process.memoryUsage();

    const healthCheck = {
        status: 'healthy',
        service: 'wallet-service',
        timestamp: new Date().toISOString(),
        uptime: `${Math.floor(uptime)}s`,
        memory: {
            rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`,
            heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`
        }
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
