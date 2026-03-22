import { Request, Response, Router } from 'express';
import Joi from 'joi';
import { PreferenceController } from '../controllers/preference.controller';
import { asyncHandler } from '../middleware/error.middleware';
import { authMiddleware } from '../middleware/auth.middleware';
import { rateLimit } from '../middleware/rate-limit.middleware';
import { validateJoiRequest } from '@shared/middleware/joi-request-validation';

const userIdParamsSchema = Joi.object({
  userId: Joi.string().min(1).max(100).required(),
}).unknown(false);

const preferenceUpdateBodySchema = Joi.object({
  channel: Joi.string().valid('email', 'sms', 'push', 'in-app').required(),
  enabled: Joi.boolean().optional(),
  frequency: Joi.string().valid('realtime', 'hourly', 'daily', 'weekly').optional(),
}).unknown(false);

const preferenceOptOutBodySchema = Joi.object({
  channel: Joi.string().valid('email', 'sms', 'push', 'in-app').required(),
}).unknown(false);

export function createPreferenceRoutes(controller: PreferenceController): Router {
  const router = Router();
  router.use(authMiddleware);
  router.use(rateLimit({ limit: 60, windowMs: 60000 }));

  router.get(
    '/:userId',
    validateJoiRequest({ params: userIdParamsSchema }),
    asyncHandler((req: Request, res: Response) => controller.getPreferences(req, res))
  );
  router.put(
    '/:userId',
    validateJoiRequest({ params: userIdParamsSchema, body: preferenceUpdateBodySchema }),
    asyncHandler((req: Request, res: Response) => controller.updatePreferences(req, res))
  );
  router.post(
    '/:userId/opt-out',
    validateJoiRequest({ params: userIdParamsSchema, body: preferenceOptOutBodySchema }),
    asyncHandler((req: Request, res: Response) => controller.optOut(req, res))
  );

  return router;
}
