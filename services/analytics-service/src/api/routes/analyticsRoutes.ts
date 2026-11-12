import { Router } from 'express';
import { AnalyticsController } from '../controllers/AnalyticsController';
import { requireAuth, requireRole } from '@shared/middleware/auth-context.middleware';
import { asyncHandler } from '@shared/middleware/async-handler';
import { GetPlatformKpis } from '../../application/use-cases/GetPlatformKpis';
import { SellerAnalyticsRepository } from '../../infrastructure/repositories/SellerAnalyticsRepository';

export function createAnalyticsRoutes(controller: AnalyticsController): Router {
    const router = Router();

    router.use(requireAuth);

    router.get('/analytics/dashboard/:sellerId', asyncHandler(controller.getSellerDashboardHandler.bind(controller)));
    router.get('/analytics/sales/:sellerId', asyncHandler(controller.getSalesAnalyticsHandler.bind(controller)));
    router.get('/supplier/analytics/:supplierId', asyncHandler(controller.getSupplierAnalyticsHandler.bind(controller)));
    router.get('/courier/analytics/:courierId', asyncHandler(controller.getCourierAnalyticsHandler.bind(controller)));

    // Platform KPIs (admin guide Flow 1). `/platform/stats` is kept as an alias
    // of `/platform/kpis` so both documented paths resolve to the same payload.
    const platformKpis = new GetPlatformKpis(new SellerAnalyticsRepository());
    const platformKpisHandler = asyncHandler(async (_req, res) => {
        res.json(await platformKpis.execute());
    });
    router.get('/platform/kpis', requireRole(['admin']), platformKpisHandler);
    router.get('/platform/stats', requireRole(['admin']), platformKpisHandler);

    return router;
}
