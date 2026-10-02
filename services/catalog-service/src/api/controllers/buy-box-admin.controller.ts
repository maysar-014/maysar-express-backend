// @ts-nocheck
/**
 * Buy Box Admin Controller
 * API layer controller for operator/admin buy-box management operations
 *
 * Requirements: 2, 5, 11, 13
 */

import { Request, Response } from 'express';
import { ManageCategoryStrategyUseCase } from '../../application/use-cases/manage-category-strategy.use-case';
import { ApplyBuyBoxOverrideUseCase } from '../../application/use-cases/apply-buy-box-override.use-case';
import { ClearAnomalyFlagUseCase } from '../../application/use-cases/clear-anomaly-flag.use-case';
import { GetBuyBoxHistoryUseCase } from '../../application/use-cases/get-buy-box-history.use-case';

export class BuyBoxAdminController {
  constructor(
    private readonly manageCategoryStrategyUseCase: ManageCategoryStrategyUseCase,
    private readonly applyBuyBoxOverrideUseCase: ApplyBuyBoxOverrideUseCase,
    private readonly clearAnomalyFlagUseCase: ClearAnomalyFlagUseCase,
    private readonly getBuyBoxHistoryUseCase: GetBuyBoxHistoryUseCase
  ) {}

  /**
   * PUT /v1/admin/buy-box/strategies/:categoryId
   * Operator/admin — upsert category ranking strategy weights
   */
  async upsertCategoryStrategy(req: Request, res: Response): Promise<void> {
    try {
      const categoryId = req.params.categoryId;
      const operatorId = (req as any).user?.userId || (req as any).user?.id;
      const operatorRole = (req as any).user?.role ?? (req as any).user?.roles?.[0] ?? '';
      const { weights, explorationBudget } = req.body;

      const result = await this.manageCategoryStrategyUseCase.execute(
        categoryId,
        weights,
        explorationBudget,
        operatorId,
        operatorRole
      );

      res.status(200).json({ success: true, data: result });
    } catch (error) {
      if (error instanceof Error && error.message === 'INSUFFICIENT_PERMISSIONS') {
        res.status(403).json({
          success: false,
          error: { code: 'INSUFFICIENT_PERMISSIONS', message: 'You do not have permission to perform this action.' }
        });
        return;
      }

      if (error instanceof Error && error.message.includes('validation')) {
        res.status(422).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: error.message }
        });
        return;
      }

      console.error('BuyBoxAdminController.upsertCategoryStrategy error:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'An internal error occurred.' }
      });
    }
  }

  /**
   * POST /v1/admin/buy-box/overrides
   * Operator/admin — apply a manual buy-box override for a product/seller pair
   */
  async applyOverride(req: Request, res: Response): Promise<void> {
    try {
      const operatorId = (req as any).user?.userId || (req as any).user?.id;
      const operatorRole = (req as any).user?.role ?? (req as any).user?.roles?.[0] ?? '';
      const { productId, sellerId, reason, startAt, endAt } = req.body;

      await this.applyBuyBoxOverrideUseCase.execute({
        productId,
        sellerId,
        operatorId,
        operatorRole,
        reason,
        startAt: new Date(startAt),
        endAt: endAt ? new Date(endAt) : undefined
      });

      res.status(201).json({ success: true });
    } catch (error) {
      if (error instanceof Error && error.message === 'INSUFFICIENT_PERMISSIONS') {
        res.status(403).json({
          success: false,
          error: { code: 'INSUFFICIENT_PERMISSIONS', message: 'You do not have permission to perform this action.' }
        });
        return;
      }

      console.error('BuyBoxAdminController.applyOverride error:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'An internal error occurred.' }
      });
    }
  }

  /**
   * DELETE /v1/admin/buy-box/anomaly-flags/:flagId
   * Operator/admin — clear an anomaly flag
   */
  async clearAnomalyFlag(req: Request, res: Response): Promise<void> {
    try {
      const flagId = req.params.flagId;
      const operatorId = (req as any).user?.userId || (req as any).user?.id;
      const operatorRole = (req as any).user?.role ?? (req as any).user?.roles?.[0] ?? '';

      await this.clearAnomalyFlagUseCase.execute(flagId, operatorId, operatorRole);

      res.status(200).json({ success: true });
    } catch (error) {
      if (error instanceof Error && error.message === 'INSUFFICIENT_PERMISSIONS') {
        res.status(403).json({
          success: false,
          error: { code: 'INSUFFICIENT_PERMISSIONS', message: 'You do not have permission to perform this action.' }
        });
        return;
      }

      // Prisma P2025 = "record to update not found" → no anomaly flag with that id
      if ((error as { code?: string })?.code === 'P2025'
        || String((error as Error)?.message || '').includes('Record to update not found')) {
        res.status(404).json({
          success: false,
          error: { code: 'ANOMALY_FLAG_NOT_FOUND', message: 'Anomaly flag not found.' }
        });
        return;
      }

      console.error('BuyBoxAdminController.clearAnomalyFlag error:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'An internal error occurred.' }
      });
    }
  }

  /**
   * GET /v1/admin/buy-box/history/:productId
   * Operator/admin — retrieve buy-box score snapshot history for a product
   */
  async getBuyBoxHistory(req: Request, res: Response): Promise<void> {
    try {
      const productId = req.params.productId;

      const result = await this.getBuyBoxHistoryUseCase.execute(productId);

      res.status(200).json({ success: true, data: result });
    } catch (error) {
      console.error('BuyBoxAdminController.getBuyBoxHistory error:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'An internal error occurred.' }
      });
    }
  }
}
