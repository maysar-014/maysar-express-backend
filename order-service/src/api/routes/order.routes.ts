import { Router } from 'express';
import { OrderController } from '../controllers/order.controller';

const router = Router();

export const setupOrderRoutes = (orderController: OrderController) => {
  router.post('/orders', (req, res) => orderController.placeOrder(req, res));
  router.get('/orders/:id', (req, res) => orderController.getOrder(req, res));

  return router;
};
