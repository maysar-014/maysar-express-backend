import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

import { tracingService, correlationMiddleware } from '../../../shared/tracing/openTelemetry';
import { register as metricsRegistry } from './infrastructure/monitoring/metrics';

// Infrastructure
import { EventBusAdapter } from './infrastructure/messaging/EventBusAdapter';
import { SellerAnalyticsRepository } from './infrastructure/repositories/SellerAnalyticsRepository';
import { CourierAnalyticsRepository } from './infrastructure/repositories/CourierAnalyticsRepository';
import { SupplierAnalyticsRepository } from './infrastructure/repositories/SupplierAnalyticsRepository';
import { EnablerAnalyticsRepository } from './infrastructure/repositories/EnablerAnalyticsRepository';
import { MetricRepository } from './infrastructure/repositories/MetricRepository';
import { AnalyticsEventRepository } from './infrastructure/repositories/AnalyticsEventRepository';
import { EventSubscriber } from './infrastructure/messaging/EventSubscriber';

// Domain Engines
import { SellerAnalyticsEngine } from './domain/engines/SellerAnalyticsEngine';
import { CourierAnalyticsEngine } from './domain/engines/CourierAnalyticsEngine';
import { EnablerAnalyticsEngine } from './domain/engines/EnablerAnalyticsEngine';
import { AnalyticsProcessingEngine } from './domain/engines/AnalyticsProcessingEngine';
import { MetricCalculationService } from './domain/services/MetricCalculationService';
import { StatisticalAlgorithm } from './domain/algorithms/StatisticalAlgorithm';

// Application Use Cases
import { GetSellerDashboard } from './application/use-cases/GetSellerDashboard';
import { GetSalesAnalytics } from './application/use-cases/GetSalesAnalytics';
import { GetSupplierAnalytics } from './application/use-cases/GetSupplierAnalytics';
import { GetCourierAnalytics } from './application/use-cases/GetCourierAnalytics';
import { ProcessAnalyticsEventUseCase } from './application/use-cases/ProcessAnalyticsEventUseCase';

// Application Sagas
import { SellerAnalyticsSaga } from './application/sagas/SellerAnalyticsSaga';
import { CourierAnalyticsSaga } from './application/sagas/CourierAnalyticsSaga';
import { SupplierAnalyticsSaga } from './application/sagas/SupplierAnalyticsSaga';
import { EnablerAnalyticsSaga } from './application/sagas/EnablerAnalyticsSaga';

// API
import { AnalyticsController } from './api/controllers/AnalyticsController';
import { createAnalyticsRoutes } from './api/routes/analyticsRoutes';
import sellerProfitabilityRoutes from './api/routes/sellerProfitabilityRoutes';
import sellerSlaRoutes from './api/routes/sellerSlaRoutes';

async function bootstrap() {
  const app = express();
  const PORT = process.env.PORT || 3011;

  // Middleware
  app.use(helmet());
  app.use(cors());
  app.use(express.json());
  app.use(correlationMiddleware());

  // Prometheus metrics
  app.get('/metrics', async (req, res) => {
    res.set('Content-Type', metricsRegistry.contentType);
    res.end(await metricsRegistry.metrics());
  });

  // --- Dependency Injection ---

  // 1. Infrastructure
  const eventBus = new EventBusAdapter();
  const sellerRepo = new SellerAnalyticsRepository();
  const courierRepo = new CourierAnalyticsRepository();
  const supplierRepo = new SupplierAnalyticsRepository();
  const enablerRepo = new EnablerAnalyticsRepository();
  const metricRepo = new MetricRepository();
  const eventRepo = new AnalyticsEventRepository();

  // 2. Domain Engines
  const sellerEngine = new SellerAnalyticsEngine();
  const courierEngine = new CourierAnalyticsEngine();
  const enablerEngine = new EnablerAnalyticsEngine();

  const metricService = new MetricCalculationService();
  const statsAlgorithm = new StatisticalAlgorithm();
  const generalEngine = new AnalyticsProcessingEngine(metricService, statsAlgorithm);

  // 3. Application Use Cases
  const getSellerDashboard = new GetSellerDashboard(sellerRepo);
  const getSalesAnalytics = new GetSalesAnalytics(sellerRepo);
  const getSupplierAnalytics = new GetSupplierAnalytics(supplierRepo);
  const getCourierAnalytics = new GetCourierAnalytics(courierRepo);
  const processAnalyticsEvent = new ProcessAnalyticsEventUseCase(generalEngine, eventRepo, metricRepo, eventBus);

  // 4. Infrastructure Subscribers
  const subscriber = new EventSubscriber(eventBus, processAnalyticsEvent);
  subscriber.initialize();

  // 5. Application Sagas (Initialize listeners)
  new SellerAnalyticsSaga(eventBus, sellerEngine, sellerRepo);
  new CourierAnalyticsSaga(eventBus, courierEngine, courierRepo);
  new SupplierAnalyticsSaga(eventBus, supplierRepo);
  new EnablerAnalyticsSaga(eventBus, enablerEngine, enablerRepo);

  // 6. API Controllers & Routes
  const analyticsController = new AnalyticsController(
    getSellerDashboard,
    getSalesAnalytics,
    getSupplierAnalytics,
    getCourierAnalytics
  );

  const analyticsRoutes = createAnalyticsRoutes(analyticsController);

  // Mount Routes
  app.use('/api', analyticsRoutes);
  app.use('/api', sellerProfitabilityRoutes);
  app.use('/api', sellerSlaRoutes);

  // Health Check
  app.get('/health', (req, res) => {
    res.json({ status: 'healthy', service: 'analytics-service', port: PORT });
  });

  // Start Server
  app.listen(PORT, () => {
    console.log(`Analytics Service running on port ${PORT}`);
    console.log('Clean Architecture layers initialized with General Analytics foundation');
  });
}

// Initialize Tracing
tracingService.start();

bootstrap().catch(err => {
  console.error('Failed to start application:', err);
  process.exit(1);
});
