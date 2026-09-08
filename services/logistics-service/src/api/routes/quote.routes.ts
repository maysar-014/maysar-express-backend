/**
 * Quote Routes
 *
 * The logistics module is mounted at /api/logistics by app.ts.
 * These sub-routers are then mounted within the module:
 *
 * Public (authenticated):
 *   POST /api/logistics/v1/quote                          — request a delivery quote
 *
 * Internal (service-to-service, no JWT required):
 *   GET  /api/logistics/internal/quotes/:quoteId          — validate a quote (called by checkout-service)
 *   PATCH /api/logistics/internal/quotes/:quoteId/consume — mark quote consumed after checkout
 */

import { Router } from 'express';
import { requireAuth } from '@shared/middleware/auth-context.middleware';
import { QuotePricingController } from '../controllers/quote-pricing.controller';
import { RequestDeliveryQuoteUseCase } from '../../application/use-cases/request-delivery-quote.use-case';
import { DeliveryPricingEngine } from '../../domain/engines/delivery-pricing.engine';
import { CourierCostCalculator } from '../../domain/engines/courier-cost-calculator';
import { ZoneClassifier } from '../../domain/services/zone-classifier';
import { MapsRoutingBridge } from '../../infrastructure/providers/maps-routing.bridge';
import { MapsRoutingAdapter } from '../../infrastructure/providers/maps-routing-adapter';
import { RoutingCacheDecorator } from '../../infrastructure/providers/routing-cache.decorator';
import { PrismaQuoteRepository } from '../../infrastructure/repositories/prisma-quote.repository';
import { PrismaPricingConfigRepository } from '../../infrastructure/repositories/prisma-pricing-config.repository';
import { PrismaPricingAuditRecordRepository } from '../../infrastructure/repositories/prisma-pricing-audit-record.repository';
import { GenerateFulfillmentOptionsUseCase } from '../../application/use-cases/generate-fulfillment-options.use-case';
import { FulfillmentOptionsController } from '../controllers/fulfillment-options.controller';

let quoteController: QuotePricingController | null = null;

function getController(): QuotePricingController {
  if (!quoteController) {
    const engine = new DeliveryPricingEngine();
    const courierCalc = new CourierCostCalculator();
    const zoneClassifier = new ZoneClassifier();

    const bridge = new MapsRoutingBridge();
    const adapter = new MapsRoutingAdapter(bridge);
    const routingProvider = new RoutingCacheDecorator(adapter, 5 * 60 * 1000);

    const quoteRepo = new PrismaQuoteRepository();
    const configRepo = new PrismaPricingConfigRepository();
    const auditRepo = new PrismaPricingAuditRecordRepository();

    const useCase = new RequestDeliveryQuoteUseCase(
      engine,
      courierCalc,
      zoneClassifier,
      routingProvider,
      quoteRepo,
      configRepo,
      auditRepo,
    );

    quoteController = new QuotePricingController(useCase, quoteRepo);
  }
  return quoteController;
}

// ── Public quote router (mounted at /logistics/v1) ─────────────────────────
export const publicQuoteRouter = Router();

publicQuoteRouter.post(
  '/quote',
  requireAuth,
  (req, res) => getController().requestQuote(req, res),
);

// ── Fulfillment options (Phase 4 §4.1) ──────────────────────────────────────
// POST /api/logistics/v1/fulfillment-options — ranked fulfillment options for
// a buyer's shipments. Backward-compatible: /quote remains for single-seller.
let fulfillmentOptionsController: FulfillmentOptionsController | null = null;
function getFulfillmentOptionsController(): FulfillmentOptionsController {
  if (!fulfillmentOptionsController) {
    fulfillmentOptionsController = new FulfillmentOptionsController(
      new GenerateFulfillmentOptionsUseCase(),
    );
  }
  return fulfillmentOptionsController;
}

publicQuoteRouter.post(
  '/fulfillment-options',
  requireAuth,
  (req, res) => getFulfillmentOptionsController().generateOptions(req, res),
);

// ── Internal quote router (mounted at /internal) ───────────────────────────
// These endpoints are service-to-service only — protected at network level, not JWT
export const internalQuoteRouter = Router();

internalQuoteRouter.get(
  '/quotes/:quoteId',
  (req, res) => getController().getQuote(req, res),
);

internalQuoteRouter.patch(
  '/quotes/:quoteId/consume',
  (req, res) => getController().consumeQuote(req, res),
);
