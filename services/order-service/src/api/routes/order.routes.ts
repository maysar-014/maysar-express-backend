import { Router } from 'express';
import { OrderController } from '../controllers/order.controller';
import { CODDisputeController } from '../controllers/cod-dispute.controller';
import { IdempotencyMiddleware } from '@shared/middleware/idempotency';
import { cacheInvalidation, cacheResponse } from '../../middleware/caching.middleware';
import { cacheConfig } from '../../config/monitoring.config';
import { createMaintenanceRoutes } from './maintenance.routes';

const router = Router();

const ORDER_CACHE_TAGS = [
  'orders',
  'orders:list',
  'orders:detail',
  'orders:search',
  'orders:analytics'
];

const noCache = (_req: any, _res: any, next: any) => next();
const orderListCache = cacheConfig.enabled ? cacheResponse({ ttl: 60, tags: ['orders', 'orders:list'] }) : noCache;
const orderDetailCache = cacheConfig.enabled ? cacheResponse({ ttl: 60, tags: ['orders', 'orders:detail'] }) : noCache;
const orderSearchCache = cacheConfig.enabled ? cacheResponse({ ttl: 60, tags: ['orders', 'orders:search'] }) : noCache;
const orderAnalyticsCache = cacheConfig.enabled ? cacheResponse({ ttl: 30, tags: ['orders', 'orders:analytics'] }) : noCache;

export const setupOrderRoutes = (orderController: OrderController, codDisputeController: CODDisputeController) => {
  router.use('/system/maintenance', createMaintenanceRoutes());

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
        { method: 'DELETE', path: /^\/orders\/[^/]+$/, tags: ORDER_CACHE_TAGS },
        { method: 'POST', path: /^\/orders\/disputes\/[^/]+\/resolve$/, tags: ORDER_CACHE_TAGS }
      ]
    }));
  }

  // Create new order
  router.post('/orders', (req, res) => orderController.placeOrder(req, res));

  // COD Pre-validation
  router.post('/orders/cod/validate', (req, res) => orderController.validateCODELigibility(req, res));

  // Get all orders (with pagination and filtering)
  router.get('/orders', orderListCache, (req, res) => orderController.getOrders(req, res));

  // Search orders
  router.get('/orders/search', orderSearchCache, (req, res) => orderController.searchOrders(req, res));

  // Order analytics
  router.get('/orders/analytics/stats', orderAnalyticsCache, (req, res) => orderController.getOrderAnalytics(req, res));

  // Get single order by tracking number
  router.get('/orders/tracking/:trackingNumber', orderDetailCache, (req, res) => orderController.getOrderByTrackingNumber(req, res));

  // Get single order by ID
  router.get('/orders/:id', orderDetailCache, (req, res) => orderController.getOrder(req, res));

  // Update order
  router.put('/orders/:id', (req, res) => orderController.updateOrder(req, res));

  // Update order status
  router.post('/orders/:id/status', (req, res) => orderController.updateOrderStatus(req, res));

  // Cancel/delete order
  router.delete('/orders/:id', (req, res) => orderController.deleteOrder(req, res));

  // COD Dispute routes
  router.post('/orders/disputes/:id/resolve', (req, res) => codDisputeController.resolveDispute(req, res));

  return router;
};
