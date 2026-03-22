import express from 'express';
import request from 'supertest';
import type { Router } from 'express';

const mockController = {
  getSellerDashboard: jest.fn(),
  getMoneySnapshot: jest.fn(),
  getActionCenter: jest.fn(),
  getSalesTrend: jest.fn(),
  getProfitabilityScore: jest.fn(),
  resolveActionItem: jest.fn()
};

jest.mock('../controllers/SellerDashboardController', () => ({
  SellerDashboardController: jest.fn().mockImplementation(() => mockController)
}));

import router from './sellerDashboardRoutes';

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

describe('sellerDashboardRoutes', () => {
  it('registers seller dashboard and action routes', () => {
    const signatures = getRouteSignatures(router);
    expect(signatures).toEqual(
      expect.arrayContaining([
        'GET /sellers/:sellerId/dashboard',
        'GET /sellers/:sellerId/dashboard/money-snapshot',
        'GET /sellers/:sellerId/dashboard/action-center',
        'GET /sellers/:sellerId/dashboard/sales-trend',
        'GET /sellers/:sellerId/dashboard/profitability-score',
        'PATCH /action-items/:actionId/resolve'
      ])
    );
  });

  it('returns auth error when token is missing', async () => {
    const app = express();
    app.use('/analytics', router);

    const response = await request(app).get('/analytics/sellers/seller-1/dashboard');
    expect(response.status).toBe(401);
    expect(response.body.error).toBe('Missing authentication token');
  });

  it('accepts requests that already have shared auth context attached', async () => {
    mockController.getSellerDashboard.mockImplementation((_req, res) => {
      res.status(200).json({ success: true });
    });

    const app = express();
    app.use((req, _res, next) => {
      (req as any).user = { userId: 'seller-1', roles: ['seller'] };
      next();
    });
    app.use('/analytics', router);

    const response = await request(app).get('/analytics/sellers/seller-1/dashboard');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(mockController.getSellerDashboard).toHaveBeenCalled();
  });
});
