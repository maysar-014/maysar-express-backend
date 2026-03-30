import express from 'express';
import request from 'supertest';
import type { Router } from 'express';

const mockController = {
  getSellerSla: jest.fn(),
  getSellerSlaBreaches: jest.fn(),
  getSellerSlaReadiness: jest.fn(),
  evaluateSellerSla: jest.fn()
};

jest.mock('../controllers/SellerSlaController', () => ({
  SellerSlaController: jest.fn().mockImplementation(() => mockController)
}));

import router from './sellerSlaRoutes';

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

describe('sellerSlaRoutes', () => {
  const authHeaders = {
    'x-contract-test': 'true',
    'x-user-id': 'usr_seller-1',
    'x-user-roles': 'seller'
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('registers the SLA tracking endpoints', () => {
    const signatures = getRouteSignatures(router);
    expect(signatures).toEqual(
      expect.arrayContaining([
        'GET /sellers/:sellerId/sla',
        'GET /sellers/:sellerId/sla/breaches',
        'GET /sellers/:sellerId/sla/readiness',
        'POST /sellers/:sellerId/sla/evaluate'
      ])
    );
  });

  it('allows a seller to access their own SLA report', async () => {
    mockController.getSellerSla.mockImplementation((_req, res) => {
      res.status(200).json({ success: true });
    });

    const app = express();
    app.use('/analytics', router);

    const response = await request(app)
      .get('/analytics/sellers/usr_seller-1/sla')
      .set(authHeaders);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(mockController.getSellerSla).toHaveBeenCalledTimes(1);
  });

  it('blocks cross-seller access for seller accounts', async () => {
    const app = express();
    app.use('/analytics', router);

    const response = await request(app)
      .get('/analytics/sellers/usr_other-seller/sla')
      .set(authHeaders);

    expect(response.status).toBe(403);
    expect(response.body.error.message).toContain('Unauthorized seller SLA access');
  });

  it('delegates evaluation requests', async () => {
    mockController.evaluateSellerSla.mockImplementation((_req, res) => {
      res.status(200).json({ evaluated: true });
    });

    const app = express();
    app.use('/analytics', router);

    const response = await request(app)
      .post('/analytics/sellers/usr_seller-1/sla/evaluate')
      .set(authHeaders);

    expect(response.status).toBe(200);
    expect(response.body.evaluated).toBe(true);
    expect(mockController.evaluateSellerSla).toHaveBeenCalledTimes(1);
  });
});
