import { Router } from 'express';
import { Module } from '../../src/core/module.interface';
import { createAnalyticsRoutes } from './src/api/routes/analyticsRoutes';
import adminDashboardAliasRoutes from './src/api/routes/adminDashboardAliasRoutes';
import sellerDashboardRoutes from './src/api/routes/sellerDashboardRoutes';
import sellerProfitabilityRoutes from './src/api/routes/sellerProfitabilityRoutes';
import sellerSlaRoutes from './src/api/routes/sellerSlaRoutes';
import { register as metricsRegistry } from './src/infrastructure/monitoring/metrics';
import { EventBusAdapter } from './src/infrastructure/messaging/EventBusAdapter';
import { EventSubscriber } from './src/infrastructure/messaging/EventSubscriber';
import { SellerAnalyticsRepository } from './src/infrastructure/repositories/SellerAnalyticsRepository';
import { CourierAnalyticsRepository } from './src/infrastructure/repositories/CourierAnalyticsRepository';
import { SupplierAnalyticsRepository } from './src/infrastructure/repositories/SupplierAnalyticsRepository';
import { EnablerAnalyticsRepository } from './src/infrastructure/repositories/EnablerAnalyticsRepository';
import { MetricRepository } from './src/infrastructure/repositories/MetricRepository';
import { AnalyticsEventRepository } from './src/infrastructure/repositories/AnalyticsEventRepository';
import { SellerAnalyticsEngine } from './src/domain/engines/SellerAnalyticsEngine';
import { CourierAnalyticsEngine } from './src/domain/engines/CourierAnalyticsEngine';
import { EnablerAnalyticsEngine } from './src/domain/engines/EnablerAnalyticsEngine';
import { AnalyticsProcessingEngine } from './src/domain/engines/AnalyticsProcessingEngine';
import { MetricCalculationService } from './src/domain/services/MetricCalculationService';
import { StatisticalAlgorithm } from './src/domain/algorithms/StatisticalAlgorithm';
import { GetSellerDashboard } from './src/application/use-cases/GetSellerDashboard';
import { GetSalesAnalytics } from './src/application/use-cases/GetSalesAnalytics';
import { GetSupplierAnalytics } from './src/application/use-cases/GetSupplierAnalytics';
import { GetCourierAnalytics } from './src/application/use-cases/GetCourierAnalytics';
import { ProcessAnalyticsEventUseCase } from './src/application/use-cases/ProcessAnalyticsEventUseCase';
import { SellerAnalyticsSaga } from './src/application/sagas/SellerAnalyticsSaga';
import { CourierAnalyticsSaga } from './src/application/sagas/CourierAnalyticsSaga';
import { SupplierAnalyticsSaga } from './src/application/sagas/SupplierAnalyticsSaga';
import { EnablerAnalyticsSaga } from './src/application/sagas/EnablerAnalyticsSaga';
import { AnalyticsController } from './src/api/controllers/AnalyticsController';

export const AnalyticsModule: Module = {
    name: 'analytics-service',
    initialize: async () => {
        console.log('Initializing analytics-service module');

        const eventBus = new EventBusAdapter();

        const sellerRepo = new SellerAnalyticsRepository();
        const courierRepo = new CourierAnalyticsRepository();
        const supplierRepo = new SupplierAnalyticsRepository();
        const enablerRepo = new EnablerAnalyticsRepository();
        const metricRepo = new MetricRepository();
        const eventRepo = new AnalyticsEventRepository();

        const sellerEngine = new SellerAnalyticsEngine();
        const courierEngine = new CourierAnalyticsEngine();
        const enablerEngine = new EnablerAnalyticsEngine();
        const metricService = new MetricCalculationService();
        const statsAlgorithm = new StatisticalAlgorithm();
        const generalEngine = new AnalyticsProcessingEngine(metricService, statsAlgorithm);

        const getSellerDashboard = new GetSellerDashboard(sellerRepo);
        const getSalesAnalytics = new GetSalesAnalytics(sellerRepo);
        const getSupplierAnalytics = new GetSupplierAnalytics(supplierRepo);
        const getCourierAnalytics = new GetCourierAnalytics(courierRepo);
        const processAnalyticsEvent = new ProcessAnalyticsEventUseCase(
            generalEngine,
            eventRepo,
            metricRepo,
            eventBus
        );

        const subscriber = new EventSubscriber(eventBus, processAnalyticsEvent);

        const _sagas = {
            seller: new SellerAnalyticsSaga(eventBus, sellerEngine, sellerRepo),
            courier: new CourierAnalyticsSaga(eventBus, courierEngine, courierRepo),
            supplier: new SupplierAnalyticsSaga(eventBus, supplierRepo),
            enabler: new EnablerAnalyticsSaga(eventBus, enablerEngine, enablerRepo)
        };

        const controller = new AnalyticsController(
            getSellerDashboard,
            getSalesAnalytics,
            getSupplierAnalytics,
            getCourierAnalytics
        );

        subscriber.initialize();

        const router = Router();
        router.use(createAnalyticsRoutes(controller));
        router.use(sellerDashboardRoutes);
        router.use(sellerProfitabilityRoutes);
        router.use(sellerSlaRoutes);
        router.get('/health', (_req, res) => {
            res.json({ status: 'healthy', service: 'analytics-service', timestamp: new Date().toISOString() });
        });
        router.get('/metrics', async (_req, res) => {
            res.set('Content-Type', metricsRegistry.contentType);
            res.end(await metricsRegistry.metrics());
        });

        AnalyticsModule.routes = router;
        AnalyticsModule.routeAliases = [{ path: '/api/admin', router: adminDashboardAliasRoutes }];
    },
    routes: Router(),
    routeAliases: [],
    shutdown: async () => {
        console.log('Shutting down analytics-service module');
    }
};
