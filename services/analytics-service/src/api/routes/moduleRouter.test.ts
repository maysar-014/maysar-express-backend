import express from 'express';
import request from 'supertest';
import { buildAnalyticsModuleRouter } from './moduleRouter';
import type { AnalyticsController } from '../controllers/AnalyticsController';

/**
 * Regression tests for the mount-order contract documented in moduleRouter.ts:
 * `/health` and `/metrics` must stay public (they were previously shadowed by
 * the auth-guarded routers mounted in front of them and answered 401), while
 * every feature route must remain behind requireAuth.
 */
describe('buildAnalyticsModuleRouter', () => {
    const buildController = (): AnalyticsController =>
        ({
            getSellerDashboardHandler: jest.fn((_req, res) => res.status(200).json({ handler: 'dashboard' })),
            getSalesAnalyticsHandler: jest.fn((_req, res) => res.status(200).json({ handler: 'sales' })),
            getSupplierAnalyticsHandler: jest.fn((_req, res) => res.status(200).json({ handler: 'supplier' })),
            getCourierAnalyticsHandler: jest.fn((_req, res) => res.status(200).json({ handler: 'courier' }))
        }) as unknown as AnalyticsController;

    const buildApp = () => {
        const app = express();
        app.use(express.json());
        app.use('/api/analytics', buildAnalyticsModuleRouter(buildController()));
        return app;
    };

    it('serves GET /api/analytics/health without authentication', async () => {
        const response = await request(buildApp()).get('/api/analytics/health');

        expect(response.status).toBe(200);
        expect(response.body).toEqual(
            expect.objectContaining({ status: 'healthy', service: 'analytics-service' })
        );
    });

    it('serves GET /api/analytics/metrics without authentication', async () => {
        const response = await request(buildApp()).get('/api/analytics/metrics');

        expect(response.status).toBe(200);
        expect(String(response.headers['content-type'])).toContain('text/plain');
    });

    it('still guards feature routes with authentication', async () => {
        const response = await request(buildApp()).get('/api/analytics/analytics/dashboard/seller-1');

        expect(response.status).toBe(401);
    });
});