import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { compositionRoot } from './bootstrap';
import courierRoutes from './api/routes/courier.routes';
import logisticsRoutes from './api/routes/logistics.routes';
import { OptimizationMiddleware } from './middleware/optimization.middleware';

// Infrastructure components (still needed for health checks)
import { SupabaseClientManager } from './infrastructure/database/supabase.client';
import { RedisClientManager } from './infrastructure/cache/redis.client';
import { Logger } from './utils/logger';
import { AppConfiguration } from './config/app.config';

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
    this.app.use(OptimizationMiddleware.monitor());
    
    this.app.use((req, res, next) => {
      const start = Date.now();
      res.on('finish', () => {
        const duration = Date.now() - start;
        this.logger.logRequest(req.method, req.url, res.statusCode, duration);
      });
      next();
    });
  }

  private setupRoutes(): void {
    // Use the comprehensive logistics API
    this.app.use('/api/v1', logisticsRoutes);

    // Legacy courier routes
    this.app.use('/api/courier', courierRoutes);
  }

  private getEngineStatus(): Array<{name: string, status: string, version: string}> {
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
    this.app.get('/health', async (req, res) => {
      try {
        const supabaseHealth = await SupabaseClientManager.getInstance().healthCheck();
        const redisHealth = await RedisClientManager.getInstance().healthCheck();
        const serviceInfo = this.appConfig.getServiceInfo();
        const engines = this.getEngineStatus();
        
        const health = {
          success: true,
          service: serviceInfo.name,
          version: serviceInfo.version,
          timestamp: new Date().toISOString(),
          uptime: process.uptime(),
          engines: engines.map(e => e.name),
          engineDetails: engines,
          dependencies: {
            supabase: supabaseHealth,
            redis: redisHealth
          }
        };
        
        const isHealthy = supabaseHealth.status === 'healthy' && redisHealth.status === 'healthy';
        res.status(isHealthy ? 200 : 503).json(health);
      } catch (error) {
        res.status(503).json({
          success: false,
          service: 'logistics-service',
          version: '1.0.0',
          timestamp: new Date().toISOString(),
          error: 'Health check failed'
        });
      }
    });

    this.app.get('/ready', async (req, res) => {
      try {
        const supabaseManager = SupabaseClientManager.getInstance();
        const redisManager = RedisClientManager.getInstance();

        const ready = supabaseManager.isHealthy() && redisManager.isHealthy();
        res.status(ready ? 200 : 503).json({
          status: ready ? 'ready' : 'not ready',
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        res.status(503).json({
          status: 'not ready',
          timestamp: new Date().toISOString(),
          error: 'Readiness check failed'
        });
      }
    });

    // Also add v1 version for consistency
    this.app.get('/api/v1/ready', async (req, res) => {
      try {
        const supabaseManager = SupabaseClientManager.getInstance();
        const redisManager = RedisClientManager.getInstance();

        const ready = supabaseManager.isHealthy() && redisManager.isHealthy();
        res.status(ready ? 200 : 503).json({
          status: ready ? 'ready' : 'not ready',
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        res.status(503).json({
          status: 'not ready',
          timestamp: new Date().toISOString(),
          error: 'Readiness check failed'
        });
      }
    });

    // Performance stats endpoint - must be before error handler
    this.app.get('/api/stats/performance', (req, res) => {
      console.log('Performance stats endpoint called');
      res.json({
        success: true,
        data: {
          service: 'logistics-service',
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          timestamp: new Date().toISOString()
        }
      });
    });

    // Also add the v1 version for consistency
    this.app.get('/api/v1/stats/performance', (req, res) => {
      console.log('V1 Performance stats endpoint called');
      res.json({
        success: true,
        data: {
          service: 'logistics-service',
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          timestamp: new Date().toISOString()
        }
      });
    });
  }

  private setupErrorHandling(): void {
    this.app.use('*', (req, res) => {
      res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: `Route ${req.method} ${req.originalUrl} not found`
        }
      });
    });

    this.app.use((error: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
      this.logger.error('Unhandled error', error, {
        requestId: req.headers['x-request-id'] as string,
        method: req.method,
        url: req.url
      });

      const status = (error as any).status || 500;
      const code = (error as any).code || 'INTERNAL_ERROR';
      
      res.status(status).json({
        success: false,
        error: {
          code,
          message: error.message || 'Internal server error'
        }
      });
    });
  }

  async start(): Promise<void> {
    try {
      // Try to connect to dependencies, but don't fail if they're unavailable
      try {
        await SupabaseClientManager.getInstance().connect();
        console.log('✓ Supabase connected');

        // Initialize database connections in the container
        const { container } = await import('./infrastructure/container');
        await container.initializeDatabaseConnections();
        console.log('✓ Database repositories initialized');
      } catch (error) {
        console.warn('⚠ Database connection failed, continuing without it:', (error as Error).message);
      }
      
      try {
        await RedisClientManager.getInstance().connect();
        console.log('✓ Redis connected');
      } catch (error) {
        console.warn('⚠ Redis connection failed, continuing without it:', (error as Error).message);
      }
      
      const port = this.appConfig.getConfig().port;
      
      this.app.listen(port, () => {
        console.log(`Logistics Service running on port ${port}`);
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
      
    } catch (error) {
      this.logger.error('Failed to start service', error as Error);
      process.exit(1);
    }
  }

  async shutdown(): Promise<void> {
    this.logger.info('Shutting down Logistics Service...');
    await RedisClientManager.getInstance().disconnect();
    this.logger.info('Logistics Service shutdown complete');
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
