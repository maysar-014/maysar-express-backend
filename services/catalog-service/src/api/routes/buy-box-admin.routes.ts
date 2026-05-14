/**
 * Buy Box Admin Routes
 * RESTful route definitions for operator/admin buy-box management operations
 *
 * Requirements: 2, 5, 11, 13
 */

import { Router } from 'express';
import { z } from 'zod';
import { requireRole } from '@shared/middleware/auth-context.middleware';
import { validateRequest } from '../middleware/validation.middleware';
import { BuyBoxAdminController } from '../controllers/buy-box-admin.controller';

const upsertStrategySchema = z.object({
  weights: z.record(z.string(), z.number()),
  explorationBudget: z.number().min(0).max(0.20)
});

const applyOverrideSchema = z.object({
  productId: z.string(),
  sellerId: z.string(),
  reason: z.string(),
  startAt: z.string(),
  endAt: z.string().optional()
});

export function createBuyBoxAdminRoutes(controller: BuyBoxAdminController): Router {
  const router = Router();

  /**
   * PUT /v1/admin/buy-box/strategies/:categoryId
   * Operator/admin — upsert category ranking strategy weights
   */
  router.put(
    '/v1/admin/buy-box/strategies/:categoryId',
    requireRole(['admin', 'operator']),
    validateRequest(upsertStrategySchema),
    async (req, res) => {
      await controller.upsertCategoryStrategy(req, res);
    }
  );

  /**
   * POST /v1/admin/buy-box/overrides
   * Operator/admin — apply a manual buy-box override
   */
  router.post(
    '/v1/admin/buy-box/overrides',
    requireRole(['admin', 'operator']),
    validateRequest(applyOverrideSchema),
    async (req, res) => {
      await controller.applyOverride(req, res);
    }
  );

  /**
   * DELETE /v1/admin/buy-box/anomaly-flags/:flagId
   * Operator/admin — clear an anomaly flag
   */
  router.delete(
    '/v1/admin/buy-box/anomaly-flags/:flagId',
    requireRole(['admin', 'operator']),
    async (req, res) => {
      await controller.clearAnomalyFlag(req, res);
    }
  );

  /**
   * GET /v1/admin/buy-box/history/:productId
   * Operator/admin — retrieve buy-box score snapshot history
   */
  router.get(
    '/v1/admin/buy-box/history/:productId',
    requireRole(['admin', 'operator']),
    async (req, res) => {
      await controller.getBuyBoxHistory(req, res);
    }
  );

  return router;
}
