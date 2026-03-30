import { Router, Request, Response } from 'express';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
    res.status(200).json({
        status: 'healthy',
        service: 'checkout-service',
        timestamp: new Date().toISOString()
    });
});

router.get('/ready', (_req: Request, res: Response) => {
    res.status(200).json({ status: 'ready', service: 'checkout-service' });
});

router.get('/live', (_req: Request, res: Response) => {
    res.status(200).json({ status: 'alive', service: 'checkout-service' });
});

export { router as healthRoutes };
export default router;
