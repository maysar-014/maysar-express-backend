// Order Service Entry Point
import express from 'express';
import dotenv from 'dotenv';
import { SupabaseOrderRepository } from './infrastructure/database/supabase-order.repository';
import { SupabaseClientManager } from './infrastructure/database/supabase.client';
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
import { RateLimitingMiddleware } from './middleware/rate-limiting.middleware';
import { PrismaClient } from '@prisma/client';
import { PrismaSagaLogRepository } from '../../shared/saga/prisma.saga-log.repository';
import { OrderFulfillmentSaga } from './application/sagas/order-fulfillment.saga';
import { SagaReplyHandler } from './infrastructure/messaging/saga-reply-handler';
import { eventBus } from '../../shared/events/eventBus';

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

    // Initialize rate limiters (must be done before applying middleware)
    RateLimitingMiddleware.initializeRateLimiters();
    console.log('✅ Rate limiters initialized');

    // Initialize Supabase connection
    try {
      await SupabaseClientManager.getInstance().connect();
      console.log('✅ Database connection established');
    } catch (dbError) {
      const error = dbError as Error;
      console.error('❌ Database initialization failed:', error.message);

      // For development, provide helpful guidance instead of crashing
      if (process.env.NODE_ENV === 'development') {
        console.log('\n💡 Development Setup Options:');
        console.log('   • Check SUPABASE_URL and SUPABASE_KEY in .env.local');
        console.log('   • Verify Supabase project is accessible');
        console.log('   • Run unit tests only: npm run test:unit');
        console.log('\n📖 See README.md for detailed setup instructions');
      }

      throw error; // Re-throw to maintain existing behavior
    }

    // Dependency injection with database repository
    const orderRepository = new SupabaseOrderRepository();
    const eventPublisher = new EventPublisherImpl();

    // SAGA INFRASTRUCTURE
    const prisma = new PrismaClient();
    const sagaLogRepo = new PrismaSagaLogRepository(prisma);
    const orderFulfillmentSaga = new OrderFulfillmentSaga(sagaLogRepo);
    const sagaReplyHandler = new SagaReplyHandler(orderFulfillmentSaga);

    // Initializing Saga Subscriptions
    await eventBus.connect();
    eventBus.subscribe('StockReservation.Success', { name: 'order-saga-stock', handler: (e) => sagaReplyHandler.handleStockReserved(e) });
    eventBus.subscribe('StockReservation.Failure', { name: 'order-saga-stock-fail', handler: (e) => sagaReplyHandler.handleStockFailed(e) });
    eventBus.subscribe('Payment.Success', { name: 'order-saga-payment', handler: (e) => sagaReplyHandler.handlePaymentSuccess(e) });
    eventBus.subscribe('Payment.Failure', { name: 'order-saga-payment-fail', handler: (e) => sagaReplyHandler.handlePaymentFailed(e) });
    eventBus.subscribe('Delivery.Success', { name: 'order-saga-delivery', handler: (e) => sagaReplyHandler.handleDeliverySuccess(e) });
    eventBus.subscribe('Delivery.Failure', { name: 'order-saga-delivery-fail', handler: (e) => sagaReplyHandler.handleDeliveryFailed(e) });

    const placeOrderUseCase = new PlaceOrderUseCase(orderRepository, eventPublisher, orderFulfillmentSaga);
    const orderController = new OrderController(placeOrderUseCase);

    // Setup routes
    const orderRoutes = setupOrderRoutes(orderController);
    app.use('/api/v1', orderRoutes);

    // Health check routes
    const healthRoutes = await import('./api/routes/health.routes');
    app.use('/health', healthRoutes.default);

    // Global error handler (must be last)
    app.use(errorHandler);

    // Health check endpoint (legacy - now handled by health routes)
    app.get('/health', async (req, res) => {
      try {
        // Check Supabase connection
        const supabaseHealth = await SupabaseClientManager.getInstance().healthCheck();
        const isHealthy = supabaseHealth.status === 'healthy';

        res.status(isHealthy ? 200 : 503).json({
          service: 'order-service',
          status: isHealthy ? 'healthy' : 'unhealthy',
          timestamp: new Date().toISOString(),
          version: '1.0.0',
          environment: process.env.NODE_ENV || 'development',
          uptime: process.uptime(),
          database: {
            supabase: isHealthy,
            details: {
              connection: supabaseHealth.status,
              latency: supabaseHealth.latency
            }
          }
        });
      } catch (error) {
        res.status(503).json({
          service: 'order-service',
          status: 'unhealthy',
          timestamp: new Date().toISOString(),
          version: '1.0.0',
          environment: process.env.NODE_ENV || 'development',
          uptime: process.uptime(),
          database: {
            supabase: false,
            details: {
              error: error instanceof Error ? error.message : 'Unknown error'
            }
          }
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
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('🛑 SIGINT received, shutting down gracefully...');
  process.exit(0);
});

// Start the service
initializeService();
