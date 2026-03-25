import express from 'express';
import request from 'supertest';
import type { Router, Request, Response } from 'express';
import { createProductionRoutes } from './productionRoutes';

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

describe('createProductionRoutes', () => {
  const authHeaders = {
    'x-user-id': 'usr_01ARZ3NDEKTSV4RRFFQ69G5FAV'
  };

  beforeEach(() => {
    process.env.ALLOW_GATEWAY_AUTH = 'true';
  });

  it('registers production bulk-order, plan, dashboard, quality, and capacity endpoints', () => {
    const controller = {
      createBulkOrder: jest.fn(),
      listBulkOrders: jest.fn(),
      getBulkOrder: jest.fn(),
      submitBulkOrderQuote: jest.fn(),
      createPlan: jest.fn(),
      getDashboard: jest.fn(),
      updateStatus: jest.fn(),
      recordQuality: jest.fn(),
      getCapacity: jest.fn(),
      updateCapacity: jest.fn()
    };
    const signatures = getRouteSignatures(createProductionRoutes(controller as never));

    expect(signatures).toEqual(
      expect.arrayContaining([
        'POST /bulk-orders',
        'GET /bulk-orders',
        'GET /bulk-orders/:id',
        'POST /bulk-orders/:id/quotes',
        'POST /plans',
        'GET /dashboard',
        'PUT /plans/:id/status',
        'POST /quality/checkpoints',
        'GET /capacity',
        'PUT /capacity'
      ])
    );
  });

  it('delegates requests to controller handlers', async () => {
    const controller = {
      createBulkOrder: jest.fn(async (_req: Request, res: Response) => res.status(201).json({ action: 'createBulkOrder' })),
      listBulkOrders: jest.fn(async (_req: Request, res: Response) => res.status(200).json({ action: 'listBulkOrders' })),
      getBulkOrder: jest.fn(async (_req: Request, res: Response) => res.status(200).json({ action: 'getBulkOrder' })),
      submitBulkOrderQuote: jest.fn(async (_req: Request, res: Response) => res.status(201).json({ action: 'submitBulkOrderQuote' })),
      createPlan: jest.fn(async (_req: Request, res: Response) => res.status(201).json({ action: 'createPlan' })),
      getDashboard: jest.fn(async (_req: Request, res: Response) => res.status(200).json({ action: 'getDashboard' })),
      updateStatus: jest.fn(async (_req: Request, res: Response) => res.status(200).json({ action: 'updateStatus' })),
      recordQuality: jest.fn(async (_req: Request, res: Response) => res.status(201).json({ action: 'recordQuality' })),
      getCapacity: jest.fn(async (_req: Request, res: Response) => res.status(200).json({ action: 'getCapacity' })),
      updateCapacity: jest.fn(async (_req: Request, res: Response) => res.status(200).json({ action: 'updateCapacity' }))
    };

    const app = express();
    app.use(express.json());
    app.use('/production', createProductionRoutes(controller as never));

    const createBulkOrderRes = await request(app)
      .post('/production/bulk-orders')
      .set(authHeaders)
      .send({
        supplierId: 'usr_01ARZ3NDEKTSV4RRFFQ69G5FAV',
        title: 'Bulk order for 5,000 woven bags',
        description: 'Buyer is sourcing 5,000 branded woven bags for an April campaign rollout.',
        quantity: 5000,
        unit: 'bags',
        currency: 'TZS',
        requiredBy: '2026-04-15T09:00:00.000Z'
      });
    const quoteRes = await request(app)
      .post('/production/bulk-orders/prd_bulord_01ARZ3NDEKTSV4RRFFQ69G5FAV/quotes')
      .set(authHeaders)
      .send({
        unitPrice: 3900,
        currency: 'TZS',
        leadTimeDays: 12,
        validUntil: '2026-04-01T09:00:00.000Z'
      });
    const createRes = await request(app)
      .post('/production/plans')
      .set(authHeaders)
      .send({
        supplierId: 'usr_01ARZ3NDEKTSV4RRFFQ69G5FAV',
        name: 'Plan Alpha',
        targetQuantity: 100,
        startDate: '2026-03-23T09:00:00.000Z',
        endDate: '2026-03-24T09:00:00.000Z'
      });
    const capacityRes = await request(app)
      .get('/production/capacity')
      .set(authHeaders)
      .query({ supplierId: 'usr_01ARZ3NDEKTSV4RRFFQ69G5FAV' });
    const updateCapacityRes = await request(app)
      .put('/production/capacity')
      .set(authHeaders)
      .send({
        maxCapacity: 12000,
        usedCapacity: 3500,
        reservedCapacity: 1500,
        unit: 'units',
        reason: 'Planner override'
      });

    expect(createBulkOrderRes.status).toBe(201);
    expect(quoteRes.status).toBe(201);
    expect(createRes.status).toBe(201);
    expect(capacityRes.status).toBe(200);
    expect(updateCapacityRes.status).toBe(200);
    expect(controller.createBulkOrder).toHaveBeenCalledTimes(1);
    expect(controller.submitBulkOrderQuote).toHaveBeenCalledTimes(1);
    expect(controller.createPlan).toHaveBeenCalledTimes(1);
    expect(controller.getCapacity).toHaveBeenCalledTimes(1);
    expect(controller.updateCapacity).toHaveBeenCalledTimes(1);
  });
});
