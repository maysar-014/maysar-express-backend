import { Request, Response, Router } from 'express';
import { PushTokenController } from '../controllers/push-token.controller';
import { asyncHandler } from '../middleware/error.middleware';
import { authMiddleware } from '../middleware/auth.middleware';
import { rateLimit } from '../middleware/rate-limit.middleware';

export function createPushTokenRoutes(controller: PushTokenController): Router {
  const router = Router();
  router.use(authMiddleware);
  router.use(rateLimit({ limit: 60, windowMs: 60000 }));

  router.post('/', asyncHandler((req: Request, res: Response) => controller.register(req, res)));
  router.delete('/:token', asyncHandler((req: Request, res: Response) => controller.unregister(req, res)));

  return router;
}
