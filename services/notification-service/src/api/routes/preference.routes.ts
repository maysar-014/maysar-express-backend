import { Request, Response, Router } from 'express';
import { PreferenceController } from '../controllers/preference.controller';
import { asyncHandler } from '../middleware/error.middleware';
import { authMiddleware } from '../middleware/auth.middleware';
import { rateLimit } from '../middleware/rate-limit.middleware';

export function createPreferenceRoutes(controller: PreferenceController): Router {
  const router = Router();
  router.use(authMiddleware);
  router.use(rateLimit({ limit: 60, windowMs: 60000 }));

  router.get('/:userId', asyncHandler((req: Request, res: Response) => controller.getPreferences(req, res)));
  router.put('/:userId', asyncHandler((req: Request, res: Response) => controller.updatePreferences(req, res)));
  router.post('/:userId/opt-out', asyncHandler((req: Request, res: Response) => controller.optOut(req, res)));

  return router;
}
