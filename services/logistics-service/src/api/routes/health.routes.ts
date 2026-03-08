import { Router, Request, Response } from 'express';
import { eventBus } from '@shared/events/eventBus';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
    const eventBusMetrics = {
        subscribers: {
            DeliveryCreated: 0,
            DeliveryAssigned: 0,
            DeliveryCompleted: 0
        },
        dlqSizes: {
            DeliveryCreated: 0,
            DeliveryAssigned: 0,
            DeliveryCompleted: 0
        }
    };

    res.status(200).json({
        status: 'healthy',
        service: 'logistics-service',
        timestamp: new Date().toISOString(),
        eventBus: eventBusMetrics
    });
});

router.get('/ready', (_req: Request, res: Response) => {
    res.status(200).json({ status: 'ready', service: 'logistics-service' });
});

router.get('/live', (_req: Request, res: Response) => {
    res.status(200).json({ status: 'alive', service: 'logistics-service' });
});

export { router as healthRoutes };
