import { Router } from 'express';
import { AnalyticsController } from '../controllers/AnalyticsController';
import { requireAuth } from '@shared/middleware/auth-context.middleware';
import { asyncHandler } from '@shared/middleware/async-handler';

export function createAnalyticsRoutes(controller: AnalyticsController): Router {
    const router = Router();

    router.use(requireAuth);

    router.get('/analytics/dashboard/:sellerId', asyncHandler(controller.getSellerDashboardHandler.bind(controller)));
    router.get('/analytics/sales/:sellerId', asyncHandler(controller.getSalesAnalyticsHandler.bind(controller)));
    router.get('/supplier/analytics/:supplierId', asyncHandler(controller.getSupplierAnalyticsHandler.bind(controller)));
    router.get('/courier/analytics/:courierId', asyncHandler(controller.getCourierAnalyticsHandler.bind(controller)));

    return router;
}
