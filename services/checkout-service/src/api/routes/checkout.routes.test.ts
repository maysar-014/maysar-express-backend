import express from 'express';
import request from 'supertest';
import { createCartRoutes, createCheckoutRoutes, checkoutRoutes } from './checkout.routes';

describe('Checkout Routes', () => {
  it('should define routes', () => {
    expect(checkoutRoutes).toBeDefined();
  });

  it('mounts cart endpoints under /cart inside checkout routes', async () => {
    const cartController = {
      mergeCarts: jest.fn((_req, res) => res.status(200).json({ route: 'mergeCarts' })),
      getCurrentCart: jest.fn((_req, res) => res.status(200).json({ route: 'getCurrentCart' })),
      getCart: jest.fn((_req, res) => res.status(200).json({ route: 'getCart' })),
      addToCart: jest.fn((_req, res) => res.status(200).json({ route: 'addToCart' })),
      updateCartItem: jest.fn((_req, res) => res.status(200).json({ route: 'updateCartItem' })),
      removeFromCart: jest.fn((_req, res) => res.status(200).json({ route: 'removeFromCart' })),
      clearCart: jest.fn((_req, res) => res.status(200).json({ route: 'clearCart' }))
    };
    const checkoutController = {
      initiateCheckout: jest.fn((_req, res) => res.status(200).json({ route: 'initiateCheckout' })),
      getCheckoutSession: jest.fn((_req, res) => res.status(200).json({ route: 'getCheckoutSession' })),
      confirmCheckout: jest.fn((_req, res) => res.status(200).json({ route: 'confirmCheckout' }))
    };
    const app = express();
    app.use(express.json());
    app.use(createCheckoutRoutes(cartController, checkoutController));

    await request(app).post('/cart/merge').send({}).expect(200);
    await request(app).get('/cart/current').expect(200);
    await request(app).get('/cart/cart-1').expect(200);
    await request(app).post('/cart/items').send({}).expect(200);
    await request(app).patch('/cart/items').send({}).expect(200);
    await request(app).delete('/cart/items').send({}).expect(200);
    await request(app).delete('/cart/cart-1').expect(200);
    await request(app).post('/initiate').send({}).expect(200);
    await request(app).get('/checkout-1').expect(200);
    await request(app).post('/checkout-1/confirm').send({}).expect(200);
  });

  it('exposes cart-only routes for /api/cart alias mounting', async () => {
    const cartController = {
      mergeCarts: jest.fn((_req, res) => res.status(200).json({ route: 'mergeCarts' })),
      getCurrentCart: jest.fn((_req, res) => res.status(200).json({ route: 'getCurrentCart' })),
      getCart: jest.fn((_req, res) => res.status(200).json({ route: 'getCart' })),
      addToCart: jest.fn((_req, res) => res.status(200).json({ route: 'addToCart' })),
      updateCartItem: jest.fn((_req, res) => res.status(200).json({ route: 'updateCartItem' })),
      removeFromCart: jest.fn((_req, res) => res.status(200).json({ route: 'removeFromCart' })),
      clearCart: jest.fn((_req, res) => res.status(200).json({ route: 'clearCart' }))
    };
    const app = express();
    app.use(express.json());
    app.use(createCartRoutes(cartController));

    await request(app).post('/merge').send({}).expect(200);
    await request(app).get('/current').expect(200);
    await request(app).get('/cart-1').expect(200);
    await request(app).post('/items').send({}).expect(200);
    await request(app).patch('/items').send({}).expect(200);
    await request(app).delete('/items').send({}).expect(200);
    await request(app).delete('/cart-1').expect(200);
  });
});
