/**
 * Checkout Routes
 * Express routes for checkout endpoints
 */

import { Router } from 'express';

export const checkoutRoutes = Router();

export function createCartRoutes(cartController: any) {
  const router = Router();

  router.post('/merge', (req, res) => cartController.mergeCarts(req, res));
  router.get('/current', (req, res) => cartController.getCurrentCart(req, res));
  router.get('/:cartId', (req, res) => cartController.getCart(req, res));
  router.post('/items', (req, res) => cartController.addToCart(req, res));
  router.patch('/items', (req, res) => cartController.updateCartItem(req, res));
  router.delete('/items', (req, res) => cartController.removeFromCart(req, res));
  router.delete('/:cartId', (req, res) => cartController.clearCart(req, res));

  return router;
}

export function createCheckoutRoutes(cartController: any, checkoutController: any) {
  const router = Router();

  router.use('/cart', createCartRoutes(cartController));

  router.post('/initiate', (req, res) => checkoutController.initiateCheckout(req, res));
  router.get('/:id', (req, res) => checkoutController.getCheckoutSession(req, res));
  router.post('/:id/confirm', (req, res) => checkoutController.confirmCheckout(req, res));

  return router;
}

