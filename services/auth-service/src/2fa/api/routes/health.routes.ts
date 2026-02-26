import { Router, Request, Response } from 'express';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
    res.status(200).json({
        status: 'healthy',
        service: 'two-factor-service',
        timestamp: new Date().toISOString(),
        uptime: `${Math.floor(process.uptime())}s`
    });
});

router.get('/ready', (_req: Request, res: Response) => {
    res.status(200).json({ status: 'ready', service: 'two-factor-service', timestamp: new Date().toISOString() });
});

router.get('/live', (_req: Request, res: Response) => {
    res.status(200).json({ status: 'alive', service: 'two-factor-service', timestamp: new Date().toISOString() });
});

export { router as healthRoutes };
