import { Router } from 'express';
import { NotificationController } from '../controllers/notification.controller';
import { asyncHandler } from '../middleware/error.middleware';
import { authMiddleware } from '../middleware/auth.middleware';
import { rateLimit } from '../middleware/rate-limit.middleware';

export function createNotificationRoutes(controller: NotificationController): Router {
  const router = Router();
  router.use(authMiddleware);
  router.use(rateLimit({ limit: 100, windowMs: 60000 }));

  router.post('/', asyncHandler((req, res) => controller.createNotification(req, res)));
  router.get('/', asyncHandler((req, res) => controller.listNotifications(req, res)));
  router.post('/bulk', asyncHandler((req, res) => controller.bulkSend(req, res)));
  router.get('/:id', asyncHandler((req, res) => controller.getNotification(req, res)));
  router.patch('/:id/status', asyncHandler((req, res) => controller.updateStatus(req, res)));
  router.delete('/:id', asyncHandler((req, res) => controller.cancelScheduled(req, res)));
  router.post('/:id/retry', asyncHandler((req, res) => controller.retryFailed(req, res)));

  return router;
}
