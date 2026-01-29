import { Router } from 'express';
import { CartController } from '../controllers/cart.controller';
import { CheckoutController } from '../controllers/checkout.controller';
import { ICartRepository } from '../../infrastructure/repositories/cart.repository';
import { ICheckoutRepository } from '../../infrastructure/repositories/checkout.repository';
import { IEventBus } from '../../infrastructure/messaging/event-bus.adapter';

export function createCheckoutRoutes(
  cartRepository: ICartRepository,
  checkoutRepository: ICheckoutRepository,
  eventBus: IEventBus
): Router {
  const router = Router();
  const cartController = new CartController(cartRepository);
  const checkoutController = new CheckoutController(
    checkoutRepository,
    cartRepository,
    eventBus
  );

  // Cart routes
  router.post('/carts/add', (req, res) => cartController.addToCart(req, res));
  router.post('/carts/remove', (req, res) => cartController.removeFromCart(req, res));
  router.post('/carts/update-quantity', (req, res) => cartController.updateQuantity(req, res));
  router.get('/carts/:cartId/:userId', (req, res) => cartController.getCart(req, res));
  router.post('/carts/clear', (req, res) => cartController.clearCart(req, res));

  // Checkout routes
  router.post('/checkout/initiate', (req, res) => checkoutController.initiateCheckout(req, res));
  router.get('/checkout/sessions/:sessionId', (req, res) => checkoutController.getCheckoutSession(req, res));
  router.post('/checkout/confirm', (req, res) => checkoutController.confirmCheckout(req, res));

  return router;
}
