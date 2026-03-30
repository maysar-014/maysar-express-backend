import express from 'express';
import request from 'supertest';
import { createAnalyticsRoutes } from '../../api/routes/analyticsRoutes';

describe('Analytics Service Routes Integration', () => {
  it('serves seller dashboard endpoint through mounted analytics routes', async () => {
    const authHeaders = {
      'x-contract-test': 'true',
      'x-user-id': 'usr_analytics-integration',
      'x-user-roles': 'seller'
    };

    const controller = {
      getSellerDashboardHandler: (_req: express.Request, res: express.Response) =>
        res.status(200).json({ section: 'dashboard' }),
      getSalesAnalyticsHandler: (_req: express.Request, res: express.Response) =>
        res.status(200).json({ section: 'sales' }),
      getSupplierAnalyticsHandler: (_req: express.Request, res: express.Response) =>
        res.status(200).json({ section: 'supplier' }),
      getCourierAnalyticsHandler: (_req: express.Request, res: express.Response) =>
        res.status(200).json({ section: 'courier' })
    } as any;

    const app = express();
    app.use('/api', createAnalyticsRoutes(controller));

    const response = await request(app)
      .get('/api/analytics/dashboard/seller-1')
      .set(authHeaders);

    expect(response.status).toBe(200);
    expect(response.body.section).toBe('dashboard');
  });
});

