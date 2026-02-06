import { Router, Request, Response } from 'express';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
    res.status(200).json({
        status: 'healthy',
        service: 'inventory-service',
        timestamp: new Date().toISOString()
    });
});

router.get('/ready', (_req: Request, res: Response) => {
    res.status(200).json({ status: 'ready', service: 'inventory-service' });
});

router.get('/live', (_req: Request, res: Response) => {
    res.status(200).json({ status: 'alive', service: 'inventory-service' });
});

export { router as healthRoutes };
