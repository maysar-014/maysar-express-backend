import { Router } from 'express';
import { Module } from '../../src/core/module.interface';
import adminDashboardAliasRoutes from './src/api/routes/adminDashboardAliasRoutes';
import { buildAnalyticsModuleRouter } from './src/api/routes/moduleRouter';
import { EventBusAdapter } from './src/infrastructure/messaging/EventBusAdapter';
import { EventSubscriber } from './src/infrastructure/messaging/EventSubscriber';
import { InventoryUpdatedHandler } from './src/infrastructure/messaging/InventoryUpdatedHandler';
import { appLogger } from '../../shared/logger/logger';
import { AnalyticsScheduler } from './src/infrastructure/AnalyticsScheduler';
import { SellerAnalyticsRepository } from './src/infrastructure/repositories/SellerAnalyticsRepository';
import { CourierAnalyticsRepository } from './src/infrastructure/repositories/CourierAnalyticsRepository';
import { SupplierAnalyticsRepository } from './src/infrastructure/repositories/SupplierAnalyticsRepository';
import { EnablerAnalyticsRepository } from './src/infrastructure/repositories/EnablerAnalyticsRepository';
import { MetricRepository } from './src/infrastructure/repositories/MetricRepository';
import { AnalyticsEventRepository } from './src/infrastructure/repositories/AnalyticsEventRepository';
import { AnalyticsProcessingEngine } from './src/domain/engines/AnalyticsProcessingEngine';
import { MetricCalculationService } from './src/domain/services/MetricCalculationService';
import { StatisticalAlgorithm } from './src/domain/algorithms/StatisticalAlgorithm';
import { GetSellerDashboard } from './src/application/use-cases/GetSellerDashboard';
import { GetSalesAnalytics } from './src/application/use-cases/GetSalesAnalytics';
import { GetSupplierAnalytics } from './src/application/use-cases/GetSupplierAnalytics';
import { GetCourierAnalytics } from './src/application/use-cases/GetCourierAnalytics';
import { ProcessAnalyticsEventUseCase } from './src/application/use-cases/ProcessAnalyticsEventUseCase';
import { AnalyticsController } from './src/api/controllers/AnalyticsController';

// Module-scoped so shutdown() can stop the background analytics jobs.
let analyticsScheduler: AnalyticsScheduler | null = null;

export const AnalyticsModule: Module = {
    name: 'analytics-service',
    initialize: async () => {
        appLogger.info('Initializing analytics-service module');

        const router = AnalyticsModule.routes!;

        const eventBus = new EventBusAdapter();
        const sellerRepo = new SellerAnalyticsRepository();
        const courierRepo = new CourierAnalyticsRepository();
        const supplierRepo = new SupplierAnalyticsRepository();
        const enablerRepo = new EnablerAnalyticsRepository();
        const metricRepo = new MetricRepository();
        const eventRepo = new AnalyticsEventRepository();

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

        const controller = new AnalyticsController(
            getSellerDashboard,
            getSalesAnalytics,
            getSupplierAnalytics,
            getCourierAnalytics
        );

        subscriber.initialize();

        // RC-4 fix: subscribe to InventoryUpdated.v1 for near-real-time analytics refresh
        const inventoryHandler = new InventoryUpdatedHandler(eventBus);
        inventoryHandler.initialize();

        // Start the background analytics jobs (metrics, action center, and the
        // courier/enabler/sales syncs). Previously these jobs were never started,
        // so the Analytics_* tables were only written on-demand by dashboard calls.
        analyticsScheduler = new AnalyticsScheduler();
        analyticsScheduler.start();

        // Add routes to the pre-declared router that app.ts already mounted.
        // buildAnalyticsModuleRouter returns a fully-configured Router; mount it
        // as a sub-router so all its routes are registered on AnalyticsModule.routes.
        const analyticsRouter = buildAnalyticsModuleRouter(controller);
        router.use('/', analyticsRouter);
        AnalyticsModule.routeAliases = [{ path: '/api/admin', router: adminDashboardAliasRoutes }];
    },
    routes: Router(),
    routeAliases: [],
    shutdown: async () => {
        analyticsScheduler?.stop();
        analyticsScheduler = null;
        appLogger.info('Shutting down analytics-service module');
    }
};
