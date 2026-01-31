import { Router } from 'express';
import { AnalyticsController } from '../controllers/AnalyticsController';

export function createAnalyticsRoutes(controller: AnalyticsController): Router {
    const router = Router();

    router.get('/analytics/dashboard/:sellerId', controller.getSellerDashboardHandler.bind(controller));
    router.get('/analytics/sales/:sellerId', controller.getSalesAnalyticsHandler.bind(controller));
    router.get('/supplier/analytics/:supplierId', controller.getSupplierAnalyticsHandler.bind(controller));
    router.get('/courier/analytics/:courierId', controller.getCourierAnalyticsHandler.bind(controller));

    return router;
}
