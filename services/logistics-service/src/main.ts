// @ts-nocheck
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { correlationMiddleware } from '../../../shared/tracing/openTelemetry';
import { compositionRoot } from './bootstrap';
import courierRoutes from './api/routes/courier.routes';
import logisticsRoutes from './api/routes/logistics.routes';
import { healthRoutes } from './api/routes/health.routes';
import { errorHandler } from './api/middleware/error.middleware';
import { requestLogger } from './api/middleware/request-logger.middleware';
import { OptimizationMiddleware } from './middleware/optimization.middleware';
import { eventBus } from '@shared/events/eventBus';
import { createMaintenanceRoutes } from './api/routes/maintenance.routes';

// Infrastructure components (still needed for health checks)
import { RedisClientManager } from './infrastructure/cache/redis.client';
import { Logger } from './utils/logger';
import { AppConfiguration } from './config/app.config';
import { infrastructureMonitor } from './infrastructure/monitoring';
import { SagaRecoveryWorker } from '@shared/saga/saga-recovery.worker';
import { DistributedSagaOrchestrator } from '@shared/saga/saga.orchestrator';
import { tracingService } from '../../../shared/tracing/openTelemetry';
import { PrismaSagaLogRepository } from '@shared/saga/saga-log.repository';
import { metricsRegistry } from './infrastructure/monitoring/metrics';
import { SagaFactory } from '@shared/saga/saga-factory';

class LogisticsService {
  private app: express.Application;
  private logger: Logger;
  private appConfig: AppConfiguration;

  constructor() {
    this.app = express();
    this.logger = Logger.getInstance();
    this.appConfig = AppConfiguration.getInstance();

    this.setupMiddleware();
    this.setupRoutes();
    this.setupHealthChecks();
    this.setupErrorHandling();
  }

  private setupMiddleware(): void {
    const config = this.appConfig.getConfig();

    this.app.use(correlationMiddleware());
    this.app.use(helmet());
    this.app.use(cors({
      origin: process.env.NODE_ENV === 'production'
        ? config.cors.origin
        : ['http://localhost:3000', 'http://localhost:3100', 'http://localhost:3200', 'http://localhost:3018', 'http://localhost:3500'],
      credentials: config.cors.credentials,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
    }));

    this.app.use(compression());
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));
    this.app.use(requestLogger);
    this.app.use(OptimizationMiddleware.monitor());

    // Standard request logging middleware handles this now
  }

  private setupRoutes(): void {
    // Maintenance routes (service-key protected)
    this.app.use('/api/v1/system/maintenance', createMaintenanceRoutes());

    // Use the comprehensive logistics API
    this.app.use('/api/v1', logisticsRoutes);

    // Legacy courier routes
    this.app.use('/api/courier', courierRoutes);

    // Prometheus metrics
    this.app.get('/metrics', async (req, res) => {
      res.set('Content-Type', metricsRegistry.contentType);
      res.end(await metricsRegistry.metrics());
    });
  }

  private getEngineStatus(): Array<{ name: string, status: string, version: string }> {
    const engines = [
      'logistics', 'route-optimization', 'real-time-tracking', 'delivery-history',
      'earnings-calculation', 'earnings-management', 'performance-analytics',
      'performance-monitoring', 'super-efficiency-optimizer', 'vehicle-compliance',
      'integration-testing'
    ];

    return engines.map(name => ({
      name,
      status: 'healthy',
      version: this.appConfig.getServiceInfo().version
    }));
  }

  private setupHealthChecks(): void {
    // Use the comprehensive health routes
    this.app.use('/health', healthRoutes);
  }

  private setupErrorHandling(): void {
    this.app.use(errorHandler);
  }

  async start(): Promise<void> {
    try {
      // Initialize tracing
      tracingService.start();

      // CRITICAL: Establish database connections BEFORE starting the server
      // This prevents the race condition where API requests arrive before DB is ready

      this.logger.info('🔄 Initializing database connections...');

      try {
        // Initialize database connections in the container with the connected client
        const { container } = await import('./infrastructure/container');
        await container.initializeDatabaseConnections();
        this.logger.info('✅ Database repositories initialized successfully');
      } catch (error) {
        this.logger.error('❌ Database connection failed:', (error as Error).message);
        throw new Error('Cannot start service without database connection');
      }

      try {
        await RedisClientManager.getInstance().connect();
        this.logger.info('✅ Redis connected successfully');
      } catch (error) {
        console.warn('⚠️ Redis connection failed, continuing without caching:', (error as Error).message);
      }

      // Saga Recovery Worker
      const { container: logisticsContainer } = await import('./infrastructure/container');
      const logisticsSagaLogRepo = logisticsContainer.getSagaLogRepository();
      const logisticsOrchestratorRegistry = SagaFactory.getRegistry();
      const logisticsRecoveryWorker = new SagaRecoveryWorker(logisticsSagaLogRepo, logisticsOrchestratorRegistry, {
        stuckThresholdMs: 5 * 60 * 1000,
        pollIntervalMs: 60 * 1000
      });
      logisticsRecoveryWorker.start();
      (this as any)._sagaRecoveryWorker = logisticsRecoveryWorker;
      this.logger.info('✅ Saga recovery worker started');

      const deliveryEventsSubscriber = logisticsContainer.getDeliveryEventsSubscriber();
      await deliveryEventsSubscriber.start();
      (this as any)._deliveryEventsSubscriber = deliveryEventsSubscriber;
      this.logger.info('✅ Delivery event subscribers registered');

      const trackingStreamWorker = logisticsContainer.getTrackingStreamWorker();
      trackingStreamWorker.start();
      (this as any)._trackingStreamWorker = trackingStreamWorker;
      this.logger.info('✅ Tracking stream worker started');

      // Now that all dependencies are ready, start the server
      const port = this.appConfig.getConfig().port;

      this.app.listen(port, () => {
        this.logger.info(`🚀 Logistics Service running on port ${port}`);
        this.logger.info(`Health check: http://localhost:${port}/health`);
        this.logger.info(`Readiness check: http://localhost:${port}/ready`);
        this.logger.info(`Performance stats: http://localhost:${port}/api/stats/performance`);
        this.logger.info(`Delivery API: http://localhost:${port}/api/v1/deliveries/*`);
        this.logger.info(`Route API: http://localhost:${port}/api/v1/routes/*`);
        this.logger.info(`Courier API: http://localhost:${port}/api/v1/couriers/*`);
        this.logger.info(`Tracking API: http://localhost:${port}/api/v1/tracking/*`);
        this.logger.info(`Analytics API: http://localhost:${port}/api/v1/analytics/*`);
        this.logger.info(`Earnings API: http://localhost:${port}/api/v1/earnings/*`);
        this.logger.info(`Engine Status API: http://localhost:${port}/api/v1/engines/status`);
        this.logger.info(`Test API: http://localhost:${port}/api/v1/test/all-engines`);
        this.logger.info(`Legacy Courier API: http://localhost:${port}/api/courier/*`);

        this.logger.info(`Logistics Service started on port ${port}`, {
          service: this.appConfig.getServiceInfo()
        });
      });

    } catch (error) {
      this.logger.error('Failed to start service', error as Error);
      process.exit(1);
    }
  }

  async shutdown(): Promise<void> {
    this.logger.info('Shutting down Logistics Service...');

    // Stop saga recovery worker
    if ((this as any)._sagaRecoveryWorker) {
      (this as any)._sagaRecoveryWorker.stop();
    }

    if ((this as any)._trackingStreamWorker) {
      (this as any)._trackingStreamWorker.stop();
    }

    if ((this as any)._deliveryEventsSubscriber) {
      (this as any)._deliveryEventsSubscriber.stop();
    }

    // Clean up all resources to prevent memory leaks
    try {
      // Clean up cache managers and optimizers
      const { CacheManager } = await import('./domain/engines/super-efficiency-optimizer.engine');
      const cacheManager = CacheManager.getInstance();
      cacheManager.destroy();

      // Clean up query optimizer
      QueryOptimizer.destroy();

      // Clean up infrastructure monitor
      infrastructureMonitor.destroy();

      // Disconnect Redis
      await RedisClientManager.getInstance().disconnect();

      this.logger.info('Logistics Service shutdown complete');
    } catch (error) {
      this.logger.error('Error during shutdown cleanup', error as Error);
    }
  }
}

const service = new LogisticsService();

process.on('SIGINT', async () => {
  await service.shutdown();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await service.shutdown();
  process.exit(0);
});

service.start().catch((error) => {
  service['logger'].error('Failed to start service:', error);
  process.exit(1);
});

export default service;

