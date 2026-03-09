import express from 'express';
import request from 'supertest';
import type { Router, Request, Response } from 'express';
import { createAnalyticsRoutes } from './analyticsRoutes';
import type { AnalyticsController } from '../controllers/AnalyticsController';

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

describe('createAnalyticsRoutes', () => {
  it('registers analytics endpoints for seller, supplier, and courier', () => {
    const controller = {
      getSellerDashboardHandler: jest.fn(),
      getSalesAnalyticsHandler: jest.fn(),
      getSupplierAnalyticsHandler: jest.fn(),
      getCourierAnalyticsHandler: jest.fn()
    } as unknown as AnalyticsController;

    const signatures = getRouteSignatures(createAnalyticsRoutes(controller));
    expect(signatures).toEqual(
      expect.arrayContaining([
        'GET /analytics/dashboard/:sellerId',
        'GET /analytics/sales/:sellerId',
        'GET /supplier/analytics/:supplierId',
        'GET /courier/analytics/:courierId'
      ])
    );
  });

  it('delegates requests to provided controller handlers', async () => {
    const getSellerDashboardHandler = jest.fn(async (_req: Request, res: Response) => {
      res.status(200).json({ handler: 'dashboard' });
    });
    const controller = {
      getSellerDashboardHandler,
      getSalesAnalyticsHandler: jest.fn(async (_req: Request, res: Response) => res.status(200).json({ handler: 'sales' })),
      getSupplierAnalyticsHandler: jest.fn(async (_req: Request, res: Response) => res.status(200).json({ handler: 'supplier' })),
      getCourierAnalyticsHandler: jest.fn(async (_req: Request, res: Response) => res.status(200).json({ handler: 'courier' }))
    } as unknown as AnalyticsController;

    const app = express();
    app.use('/api', createAnalyticsRoutes(controller));

    const response = await request(app).get('/api/analytics/dashboard/seller-1');
    expect(response.status).toBe(200);
    expect(response.body.handler).toBe('dashboard');
    expect(getSellerDashboardHandler).toHaveBeenCalledTimes(1);
  });
});
