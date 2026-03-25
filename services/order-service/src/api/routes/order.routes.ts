import { NextFunction, Request, Response, Router } from 'express';
import Joi from 'joi';
import { OrderController } from '../controllers/order.controller';
import { CODDisputeController } from '../controllers/cod-dispute.controller';
import { IdempotencyMiddleware } from '@shared/middleware/idempotency';
import { requireAuth, requireRoleOrService } from '@shared/middleware/auth-context.middleware';
import { asyncHandler } from '@shared/middleware/async-handler';
import { cacheInvalidation, cacheResponse } from '../../middleware/caching.middleware';
import { cacheConfig } from '../../config/monitoring.config';
import { createMaintenanceRoutes } from './maintenance.routes';
import { validateJoiRequest } from '@shared/middleware/joi-request-validation';

const NON_BLANK_PATTERN = /^(?=.*\S).+$/;
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
  sellerId: Joi.string().min(1).required(),
  currency: Joi.string().length(3).optional(),
  paymentMethod: Joi.string().valid('COD', 'WALLET', 'CARD', 'MOBILE_PAYMENT').required(),
  items: Joi.array().items(
    Joi.object({
      productId: Joi.string().min(1).required(),
      quantity: Joi.number().integer().min(1).required(),
      price: orderItemPriceSchema.required(),
      weight: Joi.number().min(0).required(),
    }).unknown(false)
  ).min(1).required(),
  deliveryAddress: Joi.object({
    street: Joi.string().trim().pattern(NON_BLANK_PATTERN).required(),
    city: Joi.string().trim().pattern(NON_BLANK_PATTERN).required(),
    postalCode: Joi.string().trim().pattern(NON_BLANK_PATTERN).required(),
    country: Joi.string().trim().pattern(NON_BLANK_PATTERN).required(),
  }).unknown(false).required(),
}).unknown(false);

const codValidationBodySchema = Joi.object({
  buyerId: contractAwareUserIdSchema.optional(),
}).unknown(false);

const orderListQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(100).optional(),
  status: Joi.string().trim().pattern(NON_BLANK_PATTERN).optional(),
  buyerId: Joi.string().trim().pattern(NON_BLANK_PATTERN).optional(),
}).unknown(false);

const disputeResolveParamsSchema = Joi.object({
  id: Joi.string().min(1).required(),
}).unknown(false);

const disputeResolveBodySchema = Joi.object({
  resolution: Joi.string().trim().pattern(NON_BLANK_PATTERN).required(),
  decision: Joi.string().trim().pattern(NON_BLANK_PATTERN).required(),
}).unknown(false);

const cancelOrderParamsSchema = Joi.object({
  id: Joi.string().min(1).required(),
}).unknown(false);

const cancelOrderBodySchema = Joi.object({
  reason: Joi.string().trim().pattern(NON_BLANK_PATTERN).optional(),
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
const orderListCache = cacheConfig.enabled ? cacheResponse({ ttl: 60, tags: ['orders', 'orders:list'] }) : noCache;
const orderDetailCache = cacheConfig.enabled ? cacheResponse({ ttl: 60, tags: ['orders', 'orders:detail'] }) : noCache;
const orderSearchCache = cacheConfig.enabled ? cacheResponse({ ttl: 60, tags: ['orders', 'orders:search'] }) : noCache;
const orderAnalyticsCache = cacheConfig.enabled ? cacheResponse({ ttl: 30, tags: ['orders', 'orders:analytics'] }) : noCache;

export const setupOrderRoutes = (orderController: OrderController, codDisputeController: CODDisputeController) => {
  router.use('/system/maintenance', requireRoleOrService(['admin', 'system']), createMaintenanceRoutes());
  router.use(requireAuth);

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
  router.get('/orders/tracking/:trackingNumber', orderDetailCache, asyncHandler((req, res) => orderController.getOrderByTrackingNumber(req, res)));

  // Get single order by ID
  router.get('/orders/:id', orderDetailCache, asyncHandler((req, res) => orderController.getOrder(req, res)));

  // Update order
  router.put('/orders/:id', asyncHandler((req, res) => orderController.updateOrder(req, res)));

  // Update order status
  router.post('/orders/:id/status', asyncHandler((req, res) => orderController.updateOrderStatus(req, res)));

  // Cancel order as an explicit business action
  router.post(
    '/orders/:id/cancel',
    validateJoiRequest({ params: cancelOrderParamsSchema, body: cancelOrderBodySchema }),
    asyncHandler((req, res) => orderController.cancelOrder(req, res))
  );

  // Cancel/delete order
  router.delete('/orders/:id', asyncHandler((req, res) => orderController.deleteOrder(req, res)));

  // COD Dispute routes
  router.post(
    '/orders/disputes/:id/resolve',
    validateJoiRequest({ params: disputeResolveParamsSchema, body: disputeResolveBodySchema }),
    asyncHandler((req, res) => codDisputeController.resolveDispute(req, res))
  );

  return router;
};



