import express from 'express';
import request from 'supertest';
import type { Router, Request, Response } from 'express';

const mockGetCouriers = jest.fn(async (_req: Request, res: Response) => {
  res.status(200).json({ action: 'getCouriers' });
});
const mockGetCourier = jest.fn(async (_req: Request, res: Response) => {
  res.status(200).json({ action: 'getCourier' });
});
const mockUpdateCourierStatus = jest.fn(async (_req: Request, res: Response) => {
  res.status(200).json({ action: 'updateCourierStatus' });
});

jest.mock('../controllers/courier.controller', () => ({
  CourierController: jest.fn().mockImplementation(() => ({
    getCouriers: mockGetCouriers,
    getCourier: mockGetCourier,
    updateCourierStatus: mockUpdateCourierStatus
  }))
}));

jest.mock('@shared/middleware/idempotency', () => ({
  IdempotencyMiddleware: jest.fn().mockImplementation(() => ({
    middleware: () => (_req: Request, _res: Response, next: () => void) => next()
  }))
}));

import router from './courier.routes';

interface Layer {
  route?: {
    path: string;
    methods: Record<string, boolean>;
  };
}

const getRouteSignatures = (routes: Router): string[] => {
  const layers = (routes as unknown as { stack: Layer[] }).stack;
  return layers
    .filter(layer => layer.route)
    .map(layer => {
      const route = layer.route as NonNullable<Layer['route']>;
      const method = Object.keys(route.methods)[0].toUpperCase();
      return `${method} ${route.path}`;
    });
};

describe('courier.routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('registers courier listing, detail, and status update endpoints', () => {
    const signatures = getRouteSignatures(router);
    expect(signatures).toEqual(
      expect.arrayContaining(['GET /', 'GET /:courierId', 'PUT /:courierId/status'])
    );
  });

  it('delegates requests to courier controller handlers', async () => {
    const app = express();
    app.use(express.json());
    app.use('/couriers', router);

    const listRes = await request(app).get('/couriers');
    const detailRes = await request(app).get('/couriers/courier-1');
    const updateRes = await request(app).put('/couriers/courier-1/status').send({ status: 'active' });

    expect(listRes.status).toBe(200);
    expect(detailRes.status).toBe(200);
    expect(updateRes.status).toBe(200);
    expect(mockGetCouriers).toHaveBeenCalledTimes(1);
    expect(mockGetCourier).toHaveBeenCalledTimes(1);
    expect(mockUpdateCourierStatus).toHaveBeenCalledTimes(1);
  });
});
