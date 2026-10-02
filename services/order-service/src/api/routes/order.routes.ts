import { NextFunction, Request, Response, Router } from 'express';
import Joi from 'joi';
import { OrderController } from '../controllers/order.controller';
import { CODDisputeController } from '../controllers/cod-dispute.controller';
import { VerificationController } from '../controllers/verification.controller';
import { IdempotencyMiddleware } from '@shared/middleware/idempotency';
import { requireAuth, requireRoleOrService } from '@shared/middleware/auth-context.middleware';
import { asyncHandler } from '@shared/middleware/async-handler';
import { cacheInvalidation, cacheResponse } from '../../middleware/caching.middleware';
import { cacheConfig } from '../../config/monitoring.config';
import { createMaintenanceRoutes } from './maintenance.routes';
import healthRoutes from './health.routes';
import { validateJoiRequest } from '@shared/middleware/joi-request-validation';
import { GLOBAL_MINIMUM_BASKET_VALUE_TZS } from '@shared/business/minimum-basket-value';
import { joiOrderNumber, joiTrackingLookupIdentifier } from '@shared/ids/human-readable-ids';

const SAFE_VISIBLE_STRING_PATTERN = /^(?=.*\S)[^\u0000-\u001F\u007F-\u009F]+$/u;
const safeVisibleString = Joi.string().min(1).pattern(SAFE_VISIBLE_STRING_PATTERN);
const currencyCodeSchema = Joi.string().pattern(/^[A-Z]{3}$/);
const contractAwareUserIdSchema = Joi.string().pattern(/^usr_/);

const orderItemPriceSchema = Joi.alternatives().try(
  Joi.number().min(0),
  Joi.object({
    amount: Joi.number().min(0).required(),
    currency: Joi.string().length(3).optional(),
  }).unknown(false)
);

const createOrderBodySchema = Joi.object({
  buyerId: contractAwareUserIdSchema.required(),
  sellerId: safeVisibleString.required(),
  currency: currencyCodeSchema.optional(),
  paymentMethod: Joi.string().valid('COD', 'WALLET', 'CARD', 'MOBILE_PAYMENT').required(),
  items: Joi.array().items(
    Joi.object({
      productId: safeVisibleString.required(),
      quantity: Joi.number().integer().min(1).required(),
      price: orderItemPriceSchema.required(),
      weight: Joi.number().min(0).required(),
    }).unknown(false)
  ).min(1).required(),
  deliveryAddress: Joi.object({
    street: safeVisibleString.required(),
    // Tanzania canonical hierarchy (preferred)
    ward: safeVisibleString.optional(),
    district: safeVisibleString.optional(),
    region: safeVisibleString.optional(),
    // Legacy / international
    city: safeVisibleString.optional(),
    state: Joi.string().allow('').optional(),
    postalCode: safeVisibleString.required(),
    country: safeVisibleString.required(),
  }).unknown(false).required(),
  deliveryFee: Joi.number().min(0).when('paymentMethod', {
    is: 'COD',
    then: Joi.number().greater(0).required(),
    otherwise: Joi.optional(),
  }),
}).unknown(false);

const codValidationBodySchema = Joi.object({
  buyerId: contractAwareUserIdSchema.required(),
  sellerId: safeVisibleString.required(),
  totalAmount: Joi.number().min(GLOBAL_MINIMUM_BASKET_VALUE_TZS).required(),
  deliveryFee: Joi.number().greater(0).required(),
  currency: currencyCodeSchema.optional(),
  deliveryAddress: Joi.object({
    street: safeVisibleString.required(),
    ward: safeVisibleString.optional(),
    district: safeVisibleString.optional(),
    region: safeVisibleString.optional(),
    city: safeVisibleString.optional(),
    state: Joi.string().allow('').optional(),
    postalCode: safeVisibleString.required(),
    country: safeVisibleString.required(),
  }).unknown(false).required(),
  sellerAddress: Joi.object({
    street: safeVisibleString.required(),
    ward: safeVisibleString.optional(),
    district: safeVisibleString.optional(),
    region: safeVisibleString.optional(),
    city: safeVisibleString.optional(),
    state: Joi.string().allow('').optional(),
    postalCode: safeVisibleString.required(),
    country: safeVisibleString.required(),
  }).unknown(false).required(),
  items: Joi.array().items(
    Joi.object({
      productId: safeVisibleString.required(),
      quantity: Joi.number().integer().min(1).required(),
      price: orderItemPriceSchema.required(),
    }).unknown(false)
  ).min(1).required(),
}).unknown(false);

const orderListQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(100).optional(),
  status: safeVisibleString.optional(),
  buyerId: safeVisibleString.optional(),
  sellerId: safeVisibleString.optional(),
}).unknown(false);

const disputeResolveParamsSchema = Joi.object({
  id: safeVisibleString.required(),
}).unknown(false);

const disputeResolveBodySchema = Joi.object({
  resolution: safeVisibleString.optional(),
  decision: safeVisibleString.optional(),  // required by use case but may come as 'notes' or 'resolvedBy'
  notes: Joi.string().optional(),           // alias for resolution
  resolvedBy: safeVisibleString.optional(), // audit field; accepted but not required by use case
}).unknown(true);

const cancelOrderParamsSchema = Joi.object({
  id: joiOrderNumber().required(),
}).unknown(false);

const cancelOrderBodySchema = Joi.object({
  reason: safeVisibleString.optional(),
}).unknown(false);

// Tracking lookup accepts either an order number (ORD-YYYYMMDD-NLNL) or a shipment
// tracking number (TRK-NLNLNL) - the two namespaces are deliberately separate.
const trackingLookupParamsSchema = Joi.object({
  identifier: joiTrackingLookupIdentifier().required(),
}).unknown(false);

// Every order-scoped path parameter is exactly an order number (ORD-YYYYMMDD-NLNL).
const orderIdParamsSchema = Joi.object({
  id: joiOrderNumber().required(),
}).unknown(false);

const router = Router();

const ORDER_CACHE_TAGS = [
  'orders',
  'orders:list',
  'orders:detail',
  'orders:search',
  'orders:analytics'
];

const noCache = (_req: Request, _res: Response, next: NextFunction) => next();
const orderListCache = noCache;
const orderDetailCache = cacheConfig.enabled ? cacheResponse({ ttl: 60, tags: ['orders', 'orders:detail'] }) : noCache;
const orderSearchCache = cacheConfig.enabled ? cacheResponse({ ttl: 60, tags: ['orders', 'orders:search'] }) : noCache;
const orderAnalyticsCache = cacheConfig.enabled ? cacheResponse({ ttl: 30, tags: ['orders', 'orders:analytics'] }) : noCache;

export const setupOrderRoutes = (orderController: OrderController, codDisputeController: CODDisputeController, verificationController?: VerificationController) => {
  router.use('/health', healthRoutes);
  router.use('/system/maintenance', requireRoleOrService(['admin', 'system']), createMaintenanceRoutes());
  router.use(requireAuth);

  // Register confirm-delivery BEFORE idempotency middleware — it's a one-time action gated by the code itself
  router.post(
    '/orders/:id/confirm-delivery',
    asyncHandler((req, res) => orderController.confirmDelivery(req, res))
  );

  const redisUrl = process.env.REDIS_URL;
  if (redisUrl) {
    const idempotencyMiddleware = new IdempotencyMiddleware(redisUrl);
    router.use(idempotencyMiddleware.middleware());
  }

  if (cacheConfig.enabled) {
    router.use(cacheInvalidation({
      patterns: [
        { method: 'POST', path: /^\/orders$/, tags: ORDER_CACHE_TAGS },
        { method: 'PUT', path: /^\/orders\/[^/]+$/, tags: ORDER_CACHE_TAGS },
        { method: 'POST', path: /^\/orders\/[^/]+\/status$/, tags: ORDER_CACHE_TAGS },
        { method: 'POST', path: /^\/orders\/[^/]+\/cancel$/, tags: ORDER_CACHE_TAGS },
        { method: 'DELETE', path: /^\/orders\/[^/]+$/, tags: ORDER_CACHE_TAGS },
        { method: 'POST', path: /^\/orders\/disputes\/[^/]+\/resolve$/, tags: ORDER_CACHE_TAGS }
      ]
    }));
  }

  // Create new order
  // No KYC gate here — order placement is risk-based, not KYC-gated.
  // Risk is managed by:
  //   - COD trust score + tier limits (ProgressiveCODEligibilityEngine)
  //   - Order value caps per trust tier
  //   - Wallet balance checks for WALLET payment
  //   - PaymentGateway fraud checks for CARD/MOBILE_PAYMENT
  // KYC is only required for financial operations (withdrawals, large balances).
  router.post(
    '/orders',
    validateJoiRequest({ body: createOrderBodySchema }),
    asyncHandler((req, res) => orderController.placeOrder(req, res))
  );

  // COD Pre-validation
  router.post(
    '/orders/cod/validate',
    validateJoiRequest({ body: codValidationBodySchema }),
    asyncHandler((req, res) => orderController.validateCODELigibility(req, res))
  );

  // ── Verification workflow routes (MUST come before /orders/:id to avoid capture) ──

  if (verificationController) {
    // Admin dashboard endpoints
    router.get(
      '/orders/admin/pending-verification',
      requireRoleOrService(['admin']),
      asyncHandler((req, res) => verificationController.getPendingVerification(req, res))
    );
    router.get(
      '/orders/admin/overdue',
      requireRoleOrService(['admin']),
      asyncHandler((req, res) => verificationController.getOverdue(req, res))
    );

    // Per-order history
    router.get(
      '/orders/:id/history',
      requireRoleOrService(['admin']),
      asyncHandler((req, res) => verificationController.getOrderHistory(req, res))
    );

    // Seller actions
    router.post(
      '/orders/:id/verify',
      asyncHandler((req, res) => verificationController.sellerVerify(req, res))
    );
    router.post(
      '/orders/:id/decline',
      asyncHandler((req, res) => verificationController.sellerDecline(req, res))
    );

    // Buyer checkout after verification
    router.post(
      '/orders/:id/buyer/confirm-checkout',
      asyncHandler((req, res) => verificationController.buyerConfirmCheckout(req, res))
    );

    // Admin actions
    router.post(
      '/orders/:id/admin/approve',
      requireRoleOrService(['admin']),
      asyncHandler((req, res) => verificationController.adminApprove(req, res))
    );
    router.post(
      '/orders/:id/admin/cancel',
      requireRoleOrService(['admin']),
      asyncHandler((req, res) => verificationController.adminCancel(req, res))
    );
    router.post(
      '/orders/:id/admin/review',
      requireRoleOrService(['admin']),
      asyncHandler((req, res) => verificationController.adminPlaceUnderReview(req, res))
    );
    router.post(
      '/orders/:id/admin/override',
      requireRoleOrService(['admin']),
      asyncHandler((req, res) => verificationController.adminOverride(req, res))
    );
  }

  // ── End verification routes ──

  // Get all orders (with pagination and filtering)
  router.get(
    '/orders',
    validateJoiRequest({ query: orderListQuerySchema }),
    orderListCache,
    asyncHandler((req, res) => orderController.getOrders(req, res))
  );

  // Search orders
  router.get('/orders/search', orderSearchCache, asyncHandler((req, res) => orderController.searchOrders(req, res)));

  // Order analytics
  router.get('/orders/analytics/stats', orderAnalyticsCache, asyncHandler((req, res) => orderController.getOrderAnalytics(req, res)));

  // Get single order by tracking number
  // Tracking lookup - order number OR shipment tracking number (dual-mode).
  router.get(
    '/orders/tracking/:identifier',
    orderDetailCache,
    validateJoiRequest({ params: trackingLookupParamsSchema }),
    asyncHandler((req, res) => orderController.getTrackingLookup(req, res))
  );

  // Get single order by order number
  router.get(
    '/orders/:id',
    orderDetailCache,
    validateJoiRequest({ params: orderIdParamsSchema }),
    asyncHandler((req, res) => orderController.getOrder(req, res))
  );

  // Update order
  router.put(
    '/orders/:id',
    validateJoiRequest({ params: orderIdParamsSchema }),
    asyncHandler((req, res) => orderController.updateOrder(req, res))
  );

  // Update order status
  router.post(
    '/orders/:id/status',
    validateJoiRequest({ params: orderIdParamsSchema }),
    asyncHandler((req, res) => orderController.updateOrderStatus(req, res))
  );

  // Cancel order as an explicit business action
  router.post(
    '/orders/:id/cancel',
    validateJoiRequest({ params: cancelOrderParamsSchema, body: cancelOrderBodySchema }),
    asyncHandler((req, res) => orderController.cancelOrder(req, res))
  );

  // ── Seller-consent cancellation workflow ───────────────────────────────────
  // CancellationPolicy requires seller consent to cancel an already-PAID order.
  // These endpoints implement that consent; without them the policy's
  // `requiresSellerConsent` was unreachable. Mounted before `/orders/:id` so the
  // literal paths are not captured as an order id.
  router.post(
    '/orders/:id/cancel-request',
    validateJoiRequest({ params: cancelOrderParamsSchema }),
    asyncHandler((req, res) => orderController.requestOrderCancellation(req, res))
  );
  router.post(
    '/orders/:id/cancel-request/approve',
    validateJoiRequest({ params: cancelOrderParamsSchema, body: cancelOrderBodySchema }),
    asyncHandler((req, res) => orderController.approveOrderCancellation(req, res))
  );
  router.post(
    '/orders/:id/cancel-request/decline',
    validateJoiRequest({ params: cancelOrderParamsSchema, body: cancelOrderBodySchema }),
    asyncHandler((req, res) => orderController.declineOrderCancellation(req, res))
  );

  // Cancel/delete order
  router.delete(
    '/orders/:id',
    validateJoiRequest({ params: orderIdParamsSchema }),
    asyncHandler((req, res) => orderController.deleteOrder(req, res))
  );

  // COD Dispute routes
  router.post(
    '/orders/disputes/:id/resolve',
    validateJoiRequest({ params: disputeResolveParamsSchema, body: disputeResolveBodySchema }),
    asyncHandler((req, res) => codDisputeController.resolveDispute(req, res))
  );

  return router;
};



