import { Router } from 'express';
import { z } from 'zod';
import { SellerStorefrontController } from '../controllers/seller-storefront.controller';
import { requireAuth } from '@shared/middleware/auth-context.middleware';
import { asyncHandler } from '@shared/middleware/async-handler';
import { validateRequest as validateSchemaRequest } from '../middleware/validation.middleware';

const shareUrlBodySchema = z.object({
  includeQR: z.boolean().optional(),
  customSlug: z.string().min(1).regex(/^[a-zA-Z0-9-]+$/).optional()
}).strict().default({});

export function createSellerStorefrontRoutes(controller: SellerStorefrontController): Router {
  const router = Router();

  router.get('/:sellerId/storefront', asyncHandler((req, res) => controller.getStorefront(req, res)));
  router.post(
    '/:sellerId/share-url',
    requireAuth,
    validateSchemaRequest(shareUrlBodySchema),
    asyncHandler((req, res) => controller.generateShareUrl(req, res))
  );

  return router;
}
