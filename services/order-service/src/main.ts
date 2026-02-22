// Order Service Entry Point
import express from 'express';
import dotenv from 'dotenv';
import { SupabaseOrderRepository } from './infrastructure/database/supabase-order.repository';
import { SupabaseClientManager } from './infrastructure/database/supabase.client';
import { EventPublisherImpl } from './infrastructure/messaging/event-publisher';
import { PlaceOrderUseCase } from './application/use-cases/place-order.use-case';
import { OrderController } from './api/controllers/order.controller';
import { CODDisputeController } from './api/controllers/cod-dispute.controller';
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
import { OrderFulfillmentSaga } from './application/sagas/order-fulfillment.saga';
import { SagaReplyHandler } from './infrastructure/messaging/saga-reply-handler';
import { eventBus } from '@shared/events/eventBus';

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

    // Initialize Outbox Repository for EventPublisher
    const { PrismaOutboxRepository } = await import('@shared/outbox/outbox.repository');
    const outboxRepository = new PrismaOutboxRepository(databaseManager.getPrisma());
    const eventPublisher = new EventPublisherImpl(outboxRepository);

    // SAGA INFRASTRUCTURE
    const orderFulfillmentSaga = new OrderFulfillmentSaga();
    const sagaReplyHandler = new SagaReplyHandler(orderFulfillmentSaga);

    // Initializing Saga Subscriptions
    // Note: eventBus is already connected or doesn't need explicit connect()
    eventBus.subscribe('StockReservation.Success', async (e: any) => sagaReplyHandler.handleStockReserved(e));
    eventBus.subscribe('StockReservation.Failure', async (e: any) => sagaReplyHandler.handleStockFailed(e));
    eventBus.subscribe('Payment.Success', async (e: any) => sagaReplyHandler.handlePaymentSuccess(e));
    eventBus.subscribe('Payment.Failure', async (e: any) => sagaReplyHandler.handlePaymentFailed(e));
    eventBus.subscribe('Delivery.Success', async (e: any) => sagaReplyHandler.handleDeliverySuccess(e));
    eventBus.subscribe('Delivery.Failure', async (e: any) => sagaReplyHandler.handleDeliveryFailed(e));

    const { CODEligibilityEngine } = await import('./domain/engines/cod-eligibility.engine');
    const { CheckCODEligibilityUseCase } = await import('./application/use-cases/check-cod-eligibility.use-case');
    const { CODCommitmentService } = await import('./domain/services/cod-commitment.service');

    const { AuthServiceClient } = await import('./infrastructure/integrations/auth-service.client');
    const { UserServiceClient } = await import('./infrastructure/integrations/user-service.client');
    const { LogisticsServiceClient } = await import('./infrastructure/integrations/logistics-service.client');
    const { WalletServiceClient } = await import('./infrastructure/integrations/wallet-service.client');

    const authServiceClient = new AuthServiceClient();
    const userServiceClient = new UserServiceClient();
    const logisticsServiceClient = new LogisticsServiceClient();
    const walletServiceClient = new WalletServiceClient();

    // Instantiate COD components
    const codEligibilityEngine = new CODEligibilityEngine(authServiceClient, userServiceClient, logisticsServiceClient);
    const codCommitmentService = new CODCommitmentService(walletServiceClient);
    const checkCODEligibilityUseCase = new CheckCODEligibilityUseCase(codEligibilityEngine);

    const placeOrderUseCase = new PlaceOrderUseCase(
      orderRepository,
      eventPublisher,
      orderFulfillmentSaga,
      codEligibilityEngine,
      codCommitmentService
    );
    const orderController = new OrderController(placeOrderUseCase, checkCODEligibilityUseCase);

    const { SupabaseCODDisputeRepository } = await import('./infrastructure/database/supabase-cod-dispute.repository');
    const { ResolveCODDisputeUseCase } = await import('./application/use-cases/resolve-cod-dispute.use-case');

    const codDisputeRepository = new SupabaseCODDisputeRepository();
    const resolveCODDisputeUseCase = new ResolveCODDisputeUseCase(codDisputeRepository, eventPublisher);
    const codDisputeController = new CODDisputeController(resolveCODDisputeUseCase);

    // Setup routes
    const orderRoutes = setupOrderRoutes(orderController, codDisputeController);
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
