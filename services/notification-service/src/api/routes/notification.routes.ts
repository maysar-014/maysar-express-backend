import { Request, Response, Router } from 'express';
import { NotificationController } from '../controllers/notification.controller';
import { asyncHandler } from '../middleware/error.middleware';
import { requireAuth } from '@shared/middleware/auth-context.middleware';
import { rateLimit } from '../middleware/rate-limit.middleware';

export function createNotificationRoutes(controller: NotificationController): Router {
  const router = Router();
  router.use(requireAuth);
  router.use(rateLimit({ limit: 100, windowMs: 60000 }));

  router.post('/', asyncHandler((req: Request, res: Response) => controller.createNotification(req, res)));
  router.get('/', asyncHandler((req: Request, res: Response) => controller.listNotifications(req, res)));
  router.post('/bulk', asyncHandler((req: Request, res: Response) => controller.bulkSend(req, res)));
  router.get('/:id', asyncHandler((req: Request, res: Response) => controller.getNotification(req, res)));
  router.patch('/:id/status', asyncHandler((req: Request, res: Response) => controller.updateStatus(req, res)));
  router.delete('/:id', asyncHandler((req: Request, res: Response) => controller.cancelScheduled(req, res)));
  router.post('/:id/retry', asyncHandler((req: Request, res: Response) => controller.retryFailed(req, res)));

  return router;
}
