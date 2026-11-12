/**
 * Checkout Validation Routes
 * ENH-007/011/012: API endpoint for pre-checkout validation using
 * CheckoutTransactionBoundaryPolicy (Constitution §10.1, §24).
 *
 * This endpoint allows the frontend to validate a checkout line item
 * before the final commit — it runs the full 6-step sequence:
 * validate config → resolve offer → recalculate price → check stock → build snapshot
 */

import { Router, Request, Response } from 'express';
import { requireRole } from '@shared/middleware/auth-context.middleware';
import { prisma } from '../../../../../src/config/prisma';

export function createCheckoutValidationRoutes(): Router {
  const router = Router();

  /**
   * Validate a checkout line item
   * POST /v1/checkout/validate
   *
   * Body: {
   *   lineItem: {
   *     productId: string,
   *     productName: string,
   *     productImage: string | null,
   *     variantId: string | null,
   *     selectedOptionIds: Record<string, string[]> | null,
   *     quantity: number
   *   },
   *   promotionDiscount?: number,
   *   promotionOriginalPrice?: number,
   *   deliveryMethod?: string,
   *   shippingCost?: number,
   *   estimatedDeliveryDate?: string,
   *   fulfillmentLocation?: string
   * }
   *
   * Returns: CheckoutValidationResult
   */
  router.post('/v1/checkout/validate', async (req: Request, res: Response) => {
    try {
      const { lineItem, promotionDiscount, promotionOriginalPrice,
             deliveryMethod, shippingCost, estimatedDeliveryDate, fulfillmentLocation } = req.body;

      if (!lineItem || !lineItem.productId || !lineItem.quantity || lineItem.quantity <= 0) {
        res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'lineItem with productId and valid quantity is required' },
        });
        return;
      }

      const { CheckoutTransactionBoundaryPolicy } = require('../../domain/policies/checkout-transaction-boundary.policy');

      // ── Resolve configuration definition ────────────────────────────────────
      let configurationDefinition: any = null;
      const definition = await (prisma as any).catalog_ConfigurationDefinition?.findFirst({
        where: { productId: lineItem.productId, status: 'active' },
      });

      if (definition) {
        const dimensions = typeof definition.dimensions === 'string' ? JSON.parse(definition.dimensions) : definition.dimensions;
        const options = typeof definition.options === 'string' ? JSON.parse(definition.options) : definition.options;
        const dependencies = typeof definition.dependencies === 'string' ? JSON.parse(definition.dependencies) : definition.dependencies;
        const constraints = typeof definition.constraints === 'string' ? JSON.parse(definition.constraints) : definition.constraints;
        const combinations = await (prisma as any).catalog_ConfigurationCombination?.findMany({
          where: { configurationDefinitionId: definition.id },
        }) ?? [];

        configurationDefinition = {
          id: definition.id,
          productId: definition.productId,
          version: definition.version,
          status: definition.status,
          dimensions,
          options,
          dependencies,
          constraints,
          combinations: combinations.map((c: any) => ({
            id: c.id,
            configurationDefinitionId: definition.id,
            optionSelections: typeof c.optionSelections === 'string' ? JSON.parse(c.optionSelections) : c.optionSelections,
            fingerprint: c.fingerprint,
            active: c.active,
          })),
          predecessorVersionId: definition.predecessorVersionId,
          createdAt: definition.createdAt?.toISOString?.() ?? definition.createdAt,
          updatedAt: definition.updatedAt?.toISOString?.() ?? definition.updatedAt,
        };
      }

      // ── Resolve seller offer ────────────────────────────────────────────────
      let sellerOffer: any = null;
      const offer = await (prisma as any).catalog_SellerOffer?.findFirst({
        where: { productId: lineItem.productId, status: 'active' },
        orderBy: { price: 'asc' },
      });

      if (offer) {
        sellerOffer = {
          offerId: offer.id,
          sellerId: offer.sellerId,
          price: Number(offer.price),
          currency: offer.currency,
          stockAvailable: offer.stockAvailable,
          fulfillmentPolicy: offer.fulfillmentPolicy,
          leadTimeDays: offer.leadTimeDays,
          condition: offer.condition,
          configurationCoverage: offer.configurationCoverage
            ? (typeof offer.configurationCoverage === 'string' ? JSON.parse(offer.configurationCoverage) : offer.configurationCoverage)
            : null,
        };
      }

      // ── Resolve catalog default price (fallback) ───────────────────────────
      let catalogDefaultPrice: number | null = null;
      let catalogDefaultCurrency = 'TZS';
      const product = await (prisma as any).product?.findUnique({
        where: { id: lineItem.productId },
        include: { variants: true },
      });

      if (product) {
        const variant = product.variants?.find((v: any) => v.id === lineItem.variantId);
        if (variant) {
          catalogDefaultPrice = Number(variant.price);
        }
        if (!lineItem.productName) lineItem.productName = product.title;
      }

      // ── Execute checkout validation ─────────────────────────────────────────
      const result = CheckoutTransactionBoundaryPolicy.validate({
        lineItem,
        configurationDefinition,
        sellerOffer,
        catalogDefaultPrice,
        catalogDefaultCurrency,
        promotionDiscount: promotionDiscount ?? null,
        promotionOriginalPrice: promotionOriginalPrice ?? null,
        deliveryMethod: deliveryMethod ?? null,
        shippingCost: shippingCost ?? null,
        estimatedDeliveryDate: estimatedDeliveryDate ?? null,
        fulfillmentLocation: fulfillmentLocation ?? null,
      });

      res.status(200).json({
        success: true,
        data: result,
        meta: { timestamp: new Date() },
      });
    } catch (error) {
      console.error('CheckoutValidationRoutes.validate error:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to validate checkout' },
      });
    }
  });

  return router;
}
