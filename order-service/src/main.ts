// Order Service Entry Point
import express from 'express';
import dotenv from 'dotenv';
import { PrismaOrderRepository } from './infrastructure/database/prisma-order.repository';
import { EventPublisherImpl } from './infrastructure/messaging/event-publisher';
import { PlaceOrderUseCase } from './application/use-cases/place-order.use-case';
import { OrderController } from './api/controllers/order.controller';
import { setupOrderRoutes } from './api/routes/order.routes';
import { securityStack } from './middleware/security.middleware';
import { loggingMiddlewareStack } from './middleware/logging.middleware';
import { errorHandler, gracefulDegradationHandler, recoveryHandler } from './middleware/error-handling.middleware';
import { appConfig, validateConfiguration, logConfigurationSummary } from './config/index';
import { logSecurityConfigSummary } from './config/security.config';
import { logMonitoringConfigSummary } from './config/monitoring.config';
import { databaseManager, loadDatabaseConfig } from './config/database.config';
import { logStartup, logShutdown, flushLogs } from './infrastructure/monitoring/logger';

// Load environment variables
dotenv.config();

const app = express();

// Security Middleware Stack (applied first for protection)
app.use(securityStack);

// Logging and Monitoring Middleware
app.use(loggingMiddlewareStack);
app.use(gracefulDegradationHandler);
app.use(recoveryHandler);

// Basic Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Initialize database connection
async function initializeService() {
  try {
    console.log('🚀 Initializing Order Service...');

    // Validate configuration
    const configValidation = validateConfiguration();
    if (!configValidation.valid) {
      console.error('❌ Configuration validation failed:', configValidation.errors);
      process.exit(1);
    }

    // Log configuration summary
    logConfigurationSummary();
    logSecurityConfigSummary();
    logMonitoringConfigSummary();

    // Load and validate database configuration
    const dbConfig = loadDatabaseConfig();

    // Initialize database connections
    await databaseManager.initialize(dbConfig);
    console.log('✅ Database connections established');

    // Dependency injection with database repository
    const orderRepository = new PrismaOrderRepository();
    const eventPublisher = new EventPublisherImpl();
    const placeOrderUseCase = new PlaceOrderUseCase(orderRepository, eventPublisher);
    const orderController = new OrderController(placeOrderUseCase);

    // Setup routes
    const orderRoutes = setupOrderRoutes(orderController);
    app.use('/api', orderRoutes);

    // Health check routes
    const healthRoutes = await import('./api/routes/health.routes');
    app.use('/health', healthRoutes.default);

    // Global error handler (must be last)
    app.use(errorHandler);

    // Health check endpoint (legacy - now handled by health routes)
    app.get('/health', async (req, res) => {
      try {
        const health = await databaseManager.healthCheck();
        const isHealthy = health.prisma && health.supabase;

        res.status(isHealthy ? 200 : 503).json({
          service: 'order-service',
          status: isHealthy ? 'healthy' : 'unhealthy',
          timestamp: new Date().toISOString(),
          database: health
        });
      } catch (error) {
        res.status(503).json({
          service: 'order-service',
          status: 'unhealthy',
          timestamp: new Date().toISOString(),
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    const PORT = process.env.PORT || 3002;

    app.listen(PORT, () => {
      console.log(`🎉 Order Service running on port ${PORT}`);
      console.log(`📊 Health check available at http://localhost:${PORT}/health`);
    });

  } catch (error) {
    console.error('❌ Failed to initialize Order Service:', error);
    process.exit(1);
  }
}

// Graceful shutdown handling
process.on('SIGTERM', async () => {
  console.log('🛑 SIGTERM received, shutting down gracefully...');
  await databaseManager.disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('🛑 SIGINT received, shutting down gracefully...');
  await databaseManager.disconnect();
  process.exit(0);
});

// Start the service
initializeService();
