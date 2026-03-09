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
  it('registers production plan, dashboard, quality, and capacity endpoints', () => {
    const controller = {
      createPlan: jest.fn(),
      getDashboard: jest.fn(),
      updateStatus: jest.fn(),
      recordQuality: jest.fn(),
      getCapacity: jest.fn()
    };
    const signatures = getRouteSignatures(createProductionRoutes(controller as never));

    expect(signatures).toEqual(
      expect.arrayContaining([
        'POST /plans',
        'GET /dashboard',
        'PUT /plans/:id/status',
        'POST /quality/checkpoints',
        'GET /capacity'
      ])
    );
  });

  it('delegates requests to controller handlers', async () => {
    const controller = {
      createPlan: jest.fn(async (_req: Request, res: Response) => res.status(201).json({ action: 'createPlan' })),
      getDashboard: jest.fn(async (_req: Request, res: Response) => res.status(200).json({ action: 'getDashboard' })),
      updateStatus: jest.fn(async (_req: Request, res: Response) => res.status(200).json({ action: 'updateStatus' })),
      recordQuality: jest.fn(async (_req: Request, res: Response) => res.status(201).json({ action: 'recordQuality' })),
      getCapacity: jest.fn(async (_req: Request, res: Response) => res.status(200).json({ action: 'getCapacity' }))
    };

    const app = express();
    app.use(express.json());
    app.use('/production', createProductionRoutes(controller as never));

    const createRes = await request(app).post('/production/plans').send({});
    const capacityRes = await request(app).get('/production/capacity');

    expect(createRes.status).toBe(201);
    expect(capacityRes.status).toBe(200);
    expect(controller.createPlan).toHaveBeenCalledTimes(1);
    expect(controller.getCapacity).toHaveBeenCalledTimes(1);
  });
});
