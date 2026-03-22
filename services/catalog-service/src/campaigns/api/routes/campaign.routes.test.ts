import express from 'express';
import request from 'supertest';
import type { Router, Request, Response } from 'express';
import { TYPES } from '../../types';

const mockController = {
  create: jest.fn(async (_body: unknown, _req: Request, res: Response) => res.status(201).json({ action: 'create' })),
  list: jest.fn(async (_req: Request, res: Response) => res.status(200).json({ action: 'list' })),
  get: jest.fn(async (_id: string, res: Response) => res.status(200).json({ action: 'get' })),
  update: jest.fn(async (_req: Request, res: Response) => res.status(200).json({ action: 'update' })),
  launch: jest.fn(async (_req: Request, res: Response) => res.status(200).json({ action: 'launch' })),
  pause: jest.fn(async (_req: Request, res: Response) => res.status(200).json({ action: 'pause' })),
  resume: jest.fn(async (_req: Request, res: Response) => res.status(200).json({ action: 'resume' })),
  cancel: jest.fn(async (_id: string, res: Response) => res.status(200).json({ action: 'cancel' })),
  complete: jest.fn(async (_req: Request, res: Response) => res.status(200).json({ action: 'complete' }))
};
const mockContainerGet = jest.fn().mockReturnValue(mockController);

jest.mock('../../container', () => ({
  container: {
    get: (...args: unknown[]) => mockContainerGet(...args)
  }
}));

jest.mock('@shared/middleware/auth-context.middleware', () => ({
  requireAuth: (_req: Request, _res: Response, next: () => void) => next(),
  requireRole: () => (_req: Request, _res: Response, next: () => void) => next()
}));

jest.mock('../middleware/validation.middleware', () => ({
  validateRequest: () => (_req: Request, _res: Response, next: () => void) => next()
}));

import { createCampaignRoutes } from './campaign.routes';

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

describe('createCampaignRoutes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('registers campaign lifecycle endpoints', () => {
    const router = createCampaignRoutes();
    const signatures = getRouteSignatures(router);

    expect(mockContainerGet).toHaveBeenCalledWith(TYPES.CampaignController);
    expect(signatures).toEqual(
      expect.arrayContaining([
        'POST /',
        'GET /',
        'GET /:id',
        'PUT /:id',
        'POST /:id/launch',
        'POST /:id/pause',
        'POST /:id/resume',
        'POST /:id/cancel',
        'POST /:id/complete'
      ])
    );
  });

  it('delegates route handlers to campaign controller', async () => {
    const app = express();
    app.use(express.json());
    app.use('/campaigns', createCampaignRoutes());

    const createRes = await request(app).post('/campaigns').send({
      name: 'Ramadan Promo',
      type: 'DISCOUNT',
      startDate: '2026-03-22T09:00:00.000Z',
      endDate: '2026-03-29T09:00:00.000Z',
      pricingRules: [{ type: 'FIXED_DISCOUNT', value: 1000, priority: 1 }]
    });
    const launchRes = await request(app).post('/campaigns/c-1/launch').send({});

    expect(createRes.status).toBe(201);
    expect(launchRes.status).toBe(200);
    expect(mockController.create).toHaveBeenCalledTimes(1);
    expect(mockController.launch).toHaveBeenCalledTimes(1);
  });
});
