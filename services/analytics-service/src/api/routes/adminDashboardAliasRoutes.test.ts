import express from 'express';
import request from 'supertest';
import type { Router, Request, Response } from 'express';

const mockGetRedFlags = jest.fn(async (_req: Request, res: Response) => {
  res.status(200).json({ section: 'red-flags' });
});
const mockGetFounderOperatingSystem = jest.fn(async (_req: Request, res: Response) => {
  res.status(200).json({ section: 'founder-operating-system' });
});

jest.mock('../controllers/AnalyticsControllerEnhanced', () => ({
  AnalyticsController: jest.fn().mockImplementation(() => ({
    getRedFlags: mockGetRedFlags,
    getFounderOperatingSystem: mockGetFounderOperatingSystem
  }))
}));

import router from './adminDashboardAliasRoutes';

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

describe('adminDashboardAliasRoutes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('registers the admin dashboard alias endpoints', () => {
    const signatures = getRouteSignatures(router);
    expect(signatures).toEqual(
      expect.arrayContaining([
        'GET /dashboard/red-flags',
        'GET /dashboard/founder-operating-system'
      ])
    );
  });

  it('serves founder operating system through the /api/admin alias mount', async () => {
    const app = express();
    app.use('/api/admin', router);

    const response = await request(app)
      .get('/api/admin/dashboard/founder-operating-system')
      .set({
        'x-contract-test': 'true',
        'x-user-id': 'usr_admin-test',
        'x-user-roles': 'admin'
      });

    expect(response.status).toBe(200);
    expect(response.body.section).toBe('founder-operating-system');
    expect(mockGetFounderOperatingSystem).toHaveBeenCalledTimes(1);
  });
});
