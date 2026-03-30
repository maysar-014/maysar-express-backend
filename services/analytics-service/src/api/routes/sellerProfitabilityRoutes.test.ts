import express from 'express';
import request from 'supertest';
import type { Router, Request, Response } from 'express';

const mockGetSellerProfitabilityDashboard = jest.fn(async (_req: Request, res: Response) => {
  res.status(200).json({ section: 'dashboard' });
});
const mockGetRevenueHealth = jest.fn(async (_req: Request, res: Response) => {
  res.status(200).json({ section: 'revenue-health' });
});
const mockGetGrowthIndicators = jest.fn(async (_req: Request, res: Response) => {
  res.status(200).json({ section: 'growth-indicators' });
});
const mockGetRetentionMetrics = jest.fn(async (_req: Request, res: Response) => {
  res.status(200).json({ section: 'retention' });
});
const mockGetFinancialMetrics = jest.fn(async (_req: Request, res: Response) => {
  res.status(200).json({ section: 'financial' });
});
const mockGetHappinessSignals = jest.fn(async (_req: Request, res: Response) => {
  res.status(200).json({ section: 'happiness' });
});
const mockGetRedFlags = jest.fn(async (_req: Request, res: Response) => {
  res.status(200).json({ section: 'red-flags' });
});

jest.mock('../controllers/AnalyticsControllerEnhanced', () => ({
  AnalyticsController: jest.fn().mockImplementation(() => ({
    getSellerProfitabilityDashboard: mockGetSellerProfitabilityDashboard,
    getRevenueHealth: mockGetRevenueHealth,
    getGrowthIndicators: mockGetGrowthIndicators,
    getRetentionMetrics: mockGetRetentionMetrics,
    getFinancialMetrics: mockGetFinancialMetrics,
    getHappinessSignals: mockGetHappinessSignals,
    getRedFlags: mockGetRedFlags
  }))
}));

import router from './sellerProfitabilityRoutes';

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

describe('sellerProfitabilityRoutes', () => {
  const authHeaders = {
    'x-contract-test': 'true',
    'x-user-id': 'usr_profitability-test',
    'x-user-roles': 'seller'
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('registers seller profitability and admin red-flag endpoints', () => {
    const signatures = getRouteSignatures(router);
    expect(signatures).toEqual(
      expect.arrayContaining([
        'GET /seller-profitability/dashboard',
        'GET /seller-profitability/dashboard/:sellerId',
        'GET /seller-profitability/revenue-health',
        'GET /seller-profitability/growth-indicators',
        'GET /seller-profitability/retention',
        'GET /seller-profitability/financial',
        'GET /seller-profitability/happiness',
        'GET /admin/dashboard/red-flags'
      ])
    );
  });

  it('delegates route handlers to the enhanced analytics controller instance', async () => {
    const app = express();
    app.use('/api', router);

    const response = await request(app)
      .get('/api/seller-profitability/financial')
      .set(authHeaders);
    expect(response.status).toBe(200);
    expect(response.body.section).toBe('financial');
    expect(mockGetFinancialMetrics).toHaveBeenCalledTimes(1);
  });
});
