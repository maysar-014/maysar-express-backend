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
  deleteOrder: jest.fn(async (_req: Request, res: Response) => res.status(200).json({ action: 'deleteOrder' })),
  searchOrders: jest.fn(async (_req: Request, res: Response) => res.status(200).json({ action: 'searchOrders' })),
  getOrderAnalytics: jest.fn(async (_req: Request, res: Response) => res.status(200).json({ action: 'getOrderAnalytics' }))
});

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

    const createRes = await request(app).post('/api/orders').send({});
    const resolveRes = await request(app).post('/api/orders/disputes/dispute-1/resolve');

    expect(createRes.status).toBe(201);
    expect(createRes.body.action).toBe('placeOrder');
    expect(resolveRes.status).toBe(200);
    expect(resolveRes.body.action).toBe('resolveDispute');
  });
});
