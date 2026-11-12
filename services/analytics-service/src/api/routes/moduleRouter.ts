import { Router } from 'express';
import { AnalyticsController } from '../controllers/AnalyticsController';
import { createAnalyticsRoutes } from './analyticsRoutes';
import sellerDashboardRoutes from './sellerDashboardRoutes';
import sellerProfitabilityRoutes from './sellerProfitabilityRoutes';
import sellerSlaRoutes from './sellerSlaRoutes';
import { register as metricsRegistry } from '../../infrastructure/monitoring/metrics';

/**
 * Builds the analytics module router exactly as mounted at `/api/analytics`.
 *
 * ORDER MATTERS: `/health` and `/metrics` are registered BEFORE the
 * auth-guarded routers. The guarded routers start with `router.use(requireAuth)`
 * (no path prefix), so if they are mounted first they intercept every path —
 * which is why these two operational endpoints used to answer 401 without a
 * token even though they were written as public. Never move them below the
 * `router.use(...)` mounts without updating moduleRouter.test.ts.
 */
export function buildAnalyticsModuleRouter(controller: AnalyticsController): Router {
    const router = Router();

    // Public operational endpoints — no auth (verified by moduleRouter.test.ts).
    router.get('/health', (_req, res) => {
        res.json({ status: 'healthy', service: 'analytics-service', timestamp: new Date().toISOString() });
    });
    router.get('/metrics', async (_req, res) => {
        res.set('Content-Type', metricsRegistry.contentType);
        res.end(await metricsRegistry.metrics());
    });

    // Auth-guarded feature routers (mounted after the public endpoints).
    router.use(createAnalyticsRoutes(controller));
    router.use(sellerDashboardRoutes);
    router.use(sellerProfitabilityRoutes);
    router.use(sellerSlaRoutes);

    return router;
}