import { Router } from 'express';
import { OrderController } from '../controllers/order.controller';
import { CODDisputeController } from '../controllers/cod-dispute.controller';
import { IdempotencyMiddleware } from '@shared/middleware/idempotency';

const router = Router();

const idempotencyMiddleware = new IdempotencyMiddleware(process.env.REDIS_URL!);

export const setupOrderRoutes = (orderController: OrderController, codDisputeController: CODDisputeController) => {
  router.use(idempotencyMiddleware.middleware());

  // Create new order
  router.post('/orders', (req, res) => orderController.placeOrder(req, res));

  // COD Pre-validation
  router.post('/orders/cod/validate', (req, res) => orderController.validateCODELigibility(req, res));

  // Get all orders (with pagination and filtering)
  router.get('/orders', (req, res) => orderController.getOrders(req, res));

  // Get single order by ID
  router.get('/orders/:id', (req, res) => orderController.getOrder(req, res));

  // Update order
  router.put('/orders/:id', (req, res) => orderController.updateOrder(req, res));

  // Update order status
  router.post('/orders/:id/status', (req, res) => orderController.updateOrderStatus(req, res));

  // Cancel/delete order
  router.delete('/orders/:id', (req, res) => orderController.deleteOrder(req, res));

  // Search orders
  router.get('/orders/search', (req, res) => orderController.searchOrders(req, res));

  // Order analytics
  router.get('/orders/analytics/stats', (req, res) => orderController.getOrderAnalytics(req, res));

  // COD Dispute routes
  router.post('/orders/disputes/:id/resolve', (req, res) => codDisputeController.resolveDispute(req, res));

  return router;
};
