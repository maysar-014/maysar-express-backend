/**
 * Checkout Routes
 * Express routes for checkout endpoints
 */

import { Router } from 'express';

export const checkoutRoutes = Router();

export function createCheckoutRoutes(_cartController: any, checkoutController: any) {
  const router = Router();

  router.post('/initiate', (req, res) => checkoutController.initiateCheckout(req, res));
  router.get('/:id', (req, res) => checkoutController.getCheckoutSession(req, res));
  router.post('/:id/confirm', (req, res) => checkoutController.confirmCheckout(req, res));

  return router;
}

