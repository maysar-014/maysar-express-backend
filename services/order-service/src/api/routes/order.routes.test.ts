jest.mock('@shared/middleware/idempotency', () => ({
  IdempotencyMiddleware: jest.fn().mockImplementation(() => ({
    middleware: () => (_req: unknown, _res: unknown, next: () => void) => next()
  }))
}));

import express from 'express';
import request from 'supertest';
import type { Router, Request, Response } from 'express';
import { setupOrderRoutes } from './order.routes';

interface Layer {
  route?: {
    path: string;
    methods: Record<string, boolean>;
  };
}

const getRouteSignatures = (router: Router): string[] => {
  const layers = (router as unknown as { stack: Layer[] }).stack;
  return layers
    .filter(layer => layer.route)
    .map(layer => {
      const route = layer.route as NonNullable<Layer['route']>;
      const method = Object.keys(route.methods)[0].toUpperCase();
      return `${method} ${route.path}`;
    });
};

const buildOrderController = () => ({
  placeOrder: jest.fn(async (_req: Request, res: Response) => res.status(201).json({ action: 'placeOrder' })),
  validateCODELigibility: jest.fn(async (_req: Request, res: Response) => res.status(200).json({ action: 'validateCOD' })),
  getOrders: jest.fn(async (_req: Request, res: Response) => res.status(200).json({ action: 'getOrders' })),
  getOrder: jest.fn(async (_req: Request, res: Response) => res.status(200).json({ action: 'getOrder' })),
  updateOrder: jest.fn(async (_req: Request, res: Response) => res.status(200).json({ action: 'updateOrder' })),
  updateOrderStatus: jest.fn(async (_req: Request, res: Response) => res.status(200).json({ action: 'updateOrderStatus' })),
  cancelOrder: jest.fn(async (_req: Request, res: Response) => res.status(200).json({ action: 'cancelOrder' })),
  deleteOrder: jest.fn(async (_req: Request, res: Response) => res.status(200).json({ action: 'deleteOrder' })),
  searchOrders: jest.fn(async (_req: Request, res: Response) => res.status(200).json({ action: 'searchOrders' })),
  getOrderAnalytics: jest.fn(async (_req: Request, res: Response) => res.status(200).json({ action: 'getOrderAnalytics' }))
});

const contractHeaders = {
  'x-contract-test': '1',
  'x-user-id': 'usr_test_0001',
  'x-user-roles': 'admin'
};

const validOrderPayload = {
  buyerId: 'usr_test_0001',
  sellerId: 'usr_01ARZ3NDEKTSV4RRFFQ69G5FAV',
  currency: 'TZS',
  paymentMethod: 'WALLET',
  items: [
    {
      productId: 'cat_prd_01ARZ3NDEKTSV4RRFFQ69G5FAV',
      quantity: 1,
      price: 1000,
      weight: 1
    }
  ],
  deliveryAddress: {
    street: 'Uhuru Street',
    city: 'Dar es Salaam',
    postalCode: '11101',
    country: 'TZ'
  }
};

describe('setupOrderRoutes', () => {
  it('registers order and COD dispute endpoints', () => {
    const orderController = buildOrderController();
    const codDisputeController = {
      resolveDispute: jest.fn(async (_req: Request, res: Response) => res.status(200).json({ action: 'resolveDispute' }))
    };

    const router = setupOrderRoutes(orderController as never, codDisputeController as never);
    const signatures = getRouteSignatures(router);

    expect(signatures).toEqual(
      expect.arrayContaining([
        'POST /orders',
        'POST /orders/cod/validate',
        'GET /orders',
        'GET /orders/:id',
        'PUT /orders/:id',
        'POST /orders/:id/status',
        'POST /orders/:id/cancel',
        'DELETE /orders/:id',
        'GET /orders/search',
        'GET /orders/analytics/stats',
        'POST /orders/disputes/:id/resolve'
      ])
    );
  });

  it('delegates requests to order and dispute controllers', async () => {
    const orderController = buildOrderController();
    const codDisputeController = {
      resolveDispute: jest.fn(async (_req: Request, res: Response) => res.status(200).json({ action: 'resolveDispute' }))
    };

    const app = express();
    app.use(express.json());
    app.use('/api', setupOrderRoutes(orderController as never, codDisputeController as never));

    const createRes = await request(app).post('/api/orders').set(contractHeaders).send(validOrderPayload);
    const resolveRes = await request(app)
      .post('/api/orders/disputes/dispute-1/resolve')
      .set(contractHeaders)
      .send({ resolution: 'Approved refund', decision: 'approved' });
    const cancelRes = await request(app)
      .post('/api/orders/ORD-20260927-3C8B/cancel')
      .set(contractHeaders)
      .send({ reason: 'Changed my mind' });

    expect(createRes.status).toBe(201);
    expect(createRes.body.action).toBe('placeOrder');
    expect(resolveRes.status).toBe(200);
    expect(resolveRes.body.action).toBe('resolveDispute');
    expect(cancelRes.status).toBe(200);
    expect(cancelRes.body.action).toBe('cancelOrder');
  });

  it('rejects order creation requests with control characters in address fields', async () => {
    const orderController = buildOrderController();
    const codDisputeController = {
      resolveDispute: jest.fn(async (_req: Request, res: Response) => res.status(200).json({ action: 'resolveDispute' }))
    };

    const app = express();
    app.use(express.json());
    app.use('/api', setupOrderRoutes(orderController as never, codDisputeController as never));

    const invalidOrderPayload = {
      ...validOrderPayload,
      deliveryAddress: {
        ...validOrderPayload.deliveryAddress,
        postalCode: '\u001d'
      }
    };

    const response = await request(app).post('/api/orders').set(contractHeaders).send(invalidOrderPayload);

    expect(response.status).toBe(400);
    expect(orderController.placeOrder).not.toHaveBeenCalled();
  });

  it('rejects COD validation requests with invalid product IDs', async () => {
    const orderController = buildOrderController();
    const codDisputeController = {
      resolveDispute: jest.fn(async (_req: Request, res: Response) => res.status(200).json({ action: 'resolveDispute' }))
    };

    const app = express();
    app.use(express.json());
    app.use('/api', setupOrderRoutes(orderController as never, codDisputeController as never));

    const invalidCodPayload = {
      buyerId: 'usr_test_0001',
      sellerId: 'usr_01ARZ3NDEKTSV4RRFFQ69G5FAV',
      totalAmount: 125000,
      deliveryFee: 5000,
      currency: 'TZS',
      deliveryAddress: {
        street: 'Uhuru Street',
        city: 'Dar es Salaam',
        postalCode: '11101',
        country: 'TZ'
      },
      sellerAddress: {
        street: 'Nyerere Road',
        city: 'Dar es Salaam',
        postalCode: '11102',
        country: 'TZ'
      },
      items: [
        {
          productId: '\n',
          quantity: 1,
          price: 120000
        }
      ]
    };

    const response = await request(app)
      .post('/api/orders/cod/validate')
      .set(contractHeaders)
      .send(invalidCodPayload);

    expect(response.status).toBe(400);
    expect(orderController.validateCODELigibility).not.toHaveBeenCalled();
  });

  it('rejects COD validation requests with invalid currency codes', async () => {
    const orderController = buildOrderController();
    const codDisputeController = {
      resolveDispute: jest.fn(async (_req: Request, res: Response) => res.status(200).json({ action: 'resolveDispute' }))
    };

    const app = express();
    app.use(express.json());
    app.use('/api', setupOrderRoutes(orderController as never, codDisputeController as never));

    const invalidCodPayload = {
      buyerId: 'usr_test_0001',
      sellerId: 'usr_01ARZ3NDEKTSV4RRFFQ69G5FAV',
      totalAmount: 125000,
      deliveryFee: 5000,
      currency: '000',
      deliveryAddress: {
        street: 'Uhuru Street',
        city: 'Dar es Salaam',
        postalCode: '11101',
        country: 'TZ'
      },
      sellerAddress: {
        street: 'Nyerere Road',
        city: 'Dar es Salaam',
        postalCode: '11102',
        country: 'TZ'
      },
      items: [
        {
          productId: 'cat_prd_01ARZ3NDEKTSV4RRFFQ69G5FAV',
          quantity: 1,
          price: 120000
        }
      ]
    };

    const response = await request(app)
      .post('/api/orders/cod/validate')
      .set(contractHeaders)
      .send(invalidCodPayload);

    expect(response.status).toBe(400);
    expect(orderController.validateCODELigibility).not.toHaveBeenCalled();
  });

  it('rejects COD validation requests with control characters in address fields', async () => {
    const orderController = buildOrderController();
    const codDisputeController = {
      resolveDispute: jest.fn(async (_req: Request, res: Response) => res.status(200).json({ action: 'resolveDispute' }))
    };

    const app = express();
    app.use(express.json());
    app.use('/api', setupOrderRoutes(orderController as never, codDisputeController as never));

    const invalidCodPayload = {
      buyerId: 'usr_test_0001',
      sellerId: 'usr_01ARZ3NDEKTSV4RRFFQ69G5FAV',
      totalAmount: 125000,
      deliveryFee: 5000,
      currency: 'TZS',
      deliveryAddress: {
        street: 'Uhuru Street',
        city: 'Dar es Salaam',
        postalCode: '\u001d',
        country: 'TZ'
      },
      sellerAddress: {
        street: 'Nyerere Road',
        city: 'Dar es Salaam',
        postalCode: '11102',
        country: 'TZ'
      },
      items: [
        {
          productId: 'cat_prd_01ARZ3NDEKTSV4RRFFQ69G5FAV',
          quantity: 1,
          price: 120000
        }
      ]
    };

    const response = await request(app)
      .post('/api/orders/cod/validate')
      .set(contractHeaders)
      .send(invalidCodPayload);

    expect(response.status).toBe(400);
    expect(orderController.validateCODELigibility).not.toHaveBeenCalled();
  });
});
