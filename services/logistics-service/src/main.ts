import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { compositionRoot } from './bootstrap';
import courierRoutes from './api/routes/courier.routes';
import logisticsRoutes from './api/routes/logistics.routes';
import { healthRoutes } from './api/routes/health.routes';
import { errorHandler } from './api/middleware/error.middleware';
import { requestLogger } from './api/middleware/request-logger.middleware';
import { OptimizationMiddleware } from './middleware/optimization.middleware';

// Infrastructure components (still needed for health checks)
import { SupabaseClientManager } from './infrastructure/database/supabase.client';
import { RedisClientManager } from './infrastructure/cache/redis.client';
import { Logger } from './utils/logger';
import { AppConfiguration } from './config/app.config';
import { infrastructureMonitor } from './infrastructure/monitoring';

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
    // Use the comprehensive logistics API
    this.app.use('/api/v1', logisticsRoutes);

    // Legacy courier routes
    this.app.use('/api/courier', courierRoutes);
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
    // CRITICAL: Establish database connections BEFORE starting the server
    // This prevents the race condition where API requests arrive before DB is ready

    console.log('🔄 Initializing database connections...');

    try {
      await SupabaseClientManager.getInstance().connect();
      console.log('✅ Supabase connected successfully');

      // Initialize database connections in the container with the connected client
      const { container } = await import('./infrastructure/container');
      await container.initializeDatabaseConnections();
      console.log('✅ Database repositories initialized successfully');
    } catch(error) {
      console.error('❌ Database connection failed:', (error as Error).message);
      throw new Error('Cannot start service without database connection');
    }

      try {
      await RedisClientManager.getInstance().connect();
      console.log('✅ Redis connected successfully');
    } catch(error) {
      console.warn('⚠️ Redis connection failed, continuing without caching:', (error as Error).message);
    }

      // Now that all dependencies are ready, start the server
      const port = this.appConfig.getConfig().port;

    this.app.listen(port, () => {
      console.log(`🚀 Logistics Service running on port ${port}`);
      console.log(`Health check: http://localhost:${port}/health`);
      console.log(`Readiness check: http://localhost:${port}/ready`);
      console.log(`Performance stats: http://localhost:${port}/api/stats/performance`);
      console.log(`Delivery API: http://localhost:${port}/api/v1/deliveries/*`);
      console.log(`Route API: http://localhost:${port}/api/v1/routes/*`);
      console.log(`Courier API: http://localhost:${port}/api/v1/couriers/*`);
      console.log(`Tracking API: http://localhost:${port}/api/v1/tracking/*`);
      console.log(`Analytics API: http://localhost:${port}/api/v1/analytics/*`);
      console.log(`Earnings API: http://localhost:${port}/api/v1/earnings/*`);
      console.log(`Engine Status API: http://localhost:${port}/api/v1/engines/status`);
      console.log(`Test API: http://localhost:${port}/api/v1/test/all-engines`);
      console.log(`Legacy Courier API: http://localhost:${port}/api/courier/*`);

      this.logger.info(`Logistics Service started on port ${port}`, {
        service: this.appConfig.getServiceInfo()
      });
    });

  } catch(error) {
    this.logger.error('Failed to start service', error as Error);
    process.exit(1);
  }
}

  async shutdown(): Promise<void> {
  this.logger.info('Shutting down Logistics Service...');

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
  } catch(error) {
    this.logger.error('Error during shutdown cleanup', error as Error);
  }
}
}

const service = new LogisticsService();

process.on('SIGTERM', async () => {
  await service.shutdown();
  process.exit(0);
});

process.on('SIGINT', async () => {
  await service.shutdown();
  process.exit(0);
});

service.start().catch((error) => {
  console.error('Failed to start service:', error);
  process.exit(1);
});

export default service;
