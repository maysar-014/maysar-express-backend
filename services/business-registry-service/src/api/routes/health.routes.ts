import { Router, Request, Response } from 'express';
import { getPrismaClient } from '../../infrastructure/database/prisma-client';
import { eventBus } from '@shared/events/eventBus';

export function createHealthRoutes(): Router {
  const router = Router();

  router.get('/', (_req: Request, res: Response) => {
    const dlq = eventBus.getDLQ();
    const eventBusMetrics = {
      subscribers: {
        BusinessRegistered: eventBus.getSubscriberCount('BusinessRegistered'),
        BusinessVerified: eventBus.getSubscriberCount('BusinessVerified'),
        BusinessUpdated: eventBus.getSubscriberCount('BusinessUpdated')
      },
      dlqSizes: {
        BusinessRegistered: dlq.get('BusinessRegistered')?.length ?? 0,
        BusinessVerified: dlq.get('BusinessVerified')?.length ?? 0,
        BusinessUpdated: dlq.get('BusinessUpdated')?.length ?? 0
      }
    };

    res.status(200).json({
      status: 'ok',
      service: 'business-registry-service',
      timestamp: new Date().toISOString(),
      eventBus: eventBusMetrics
    });
  });

  router.get('/ready', async (_req: Request, res: Response) => {
    try {
      const prisma = getPrismaClient();
      await prisma.$queryRaw`SELECT 1`;
      res.status(200).json({
        status: 'ready',
        database: 'connected',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(503).json({
        status: 'not ready',
        database: 'disconnected',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    }
  });

  router.get('/live', (_req: Request, res: Response) => {
    res.status(200).json({
      status: 'alive',
      timestamp: new Date().toISOString()
    });
  });

  return router;
}
