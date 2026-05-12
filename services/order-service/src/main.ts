// Order Service Entry Point
import express from 'express';
import dotenv from 'dotenv';
import { PrismaOrderRepository } from './infrastructure/database/prisma-order.repository';
import { OrderPaymentRepository } from './infrastructure/repositories/order-payment.repository';
import { OrderSettlementRepository } from './infrastructure/repositories/order-settlement.repository';
import { EventPublisherImpl } from './infrastructure/messaging/event-publisher';
import { PlaceOrderUseCase } from './application/use-cases/place-order.use-case';
import { OrderController } from './api/controllers/order.controller';
import { CODDisputeController } from './api/controllers/cod-dispute.controller';
import { setupOrderRoutes } from './api/routes/order.routes';
import { securityStack } from './middleware/security.middleware';
import { loggingMiddlewareStack } from './middleware/logging.middleware';
import { errorHandler, gracefulDegradationHandler, recoveryHandler } from './middleware/error-handling.middleware';
import { validateConfiguration, logConfigurationSummary } from './config/index';
import { logSecurityConfigSummary } from './config/security.config';
import { logMonitoringConfigSummary, cacheConfig } from './config/monitoring.config';
import { databaseManager, loadDatabaseConfig } from './config/database.config';
import { logger } from './infrastructure/monitoring/logger';
import { RateLimitingMiddleware } from './middleware/rate-limiting.middleware';
import { OrderFulfillmentSaga } from './application/sagas/order-fulfillment.saga';
import { SagaReplyHandler } from './infrastructure/messaging/saga-reply-handler';
import { eventBus } from '@shared/events/eventBus';
import { OutboxProcessor } from '../../../shared/outbox/outbox.processor';
import { TransactionalOutbox } from '../../../shared/outbox/outboxPattern';
import { EventIdempotency } from '@shared/middleware/idempotency';
import { SagaRecoveryWorker } from '@shared/saga/saga-recovery.worker';
import { DistributedSagaOrchestrator } from '@shared/saga/saga.orchestrator';
import { redisCache } from './infrastructure/cache/redis-cache';
import { OrderOutboxRepository } from './infrastructure/messaging/order-outbox.repository';

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
    logger.info('🚀 Initializing Order Service...');

    // Validate configuration
    const configValidation = validateConfiguration();
    if (!configValidation.valid) {
      logger.error('❌ Configuration validation failed:', configValidation.errors);
      process.exit(1);
    }

    // Log configuration summary
    logConfigurationSummary();
    logSecurityConfigSummary();
    logMonitoringConfigSummary();

    // Initialize rate limiters (must be done before applying middleware)
    RateLimitingMiddleware.initializeRateLimiters();
    logger.info('✅ Rate limiters initialized');

    // Initialize database connection
    try {
      await databaseManager.initialize(loadDatabaseConfig());
      logger.info('✅ Database connection established');
      if (cacheConfig.enabled) {
        try {
          await redisCache.connect();
          logger.info('Redis cache connected');
        } catch (cacheError) {
          logger.warn('Redis cache connection failed, continuing without cache', {
            error: (cacheError as Error).message
          });
        }
      }
    } catch (dbError) {
      const error = dbError as Error;
      logger.error('❌ Database initialization failed:', error.message);

      // For development, provide helpful guidance instead of crashing
      if (process.env.NODE_ENV === 'development') {
        logger.info('\n💡 Development Setup Options:');
        logger.info('   � Check DATABASE_URL in .env.local');
        logger.info('   � Verify PostgreSQL is accessible');
        logger.info('   • Run unit tests only: npm run test:unit');
        logger.info('\n📖 See README.md for detailed setup instructions');
      }

      throw error; // Re-throw to maintain existing behavior
    }

    // Dependency injection with database repository
    const orderRepository = new PrismaOrderRepository();

    // Initialize Outbox Repository for EventPublisher
    const outboxRepository = new OrderOutboxRepository(databaseManager.getPrisma());
    const eventPublisher = new EventPublisherImpl(outboxRepository);

    // Start outbox processor after DB connection
    const outbox = new TransactionalOutbox(databaseManager.getPrisma(), 'order_OutboxEvent');
    const outboxProcessor = new OutboxProcessor(databaseManager.getPrisma(), outbox, eventBus);
    outboxProcessorRef = outboxProcessor;
    outboxProcessor.start();
    logger.info('✅ Outbox processor started');

    // SAGA INFRASTRUCTURE
    const eventIdempotency = new EventIdempotency(process.env.REDIS_URL!, databaseManager.getPrisma());
    const orderFulfillmentSaga = new OrderFulfillmentSaga(eventIdempotency);
    const sagaReplyHandler = new SagaReplyHandler(orderFulfillmentSaga);

    // Import and instantiate additional sagas
    const { PaymentSaga } = await import('./application/sagas/payment.saga');
    const { SettlementSaga } = await import('./application/sagas/settlement.saga');
    const { TrainingSaga } = await import('./application/sagas/training.saga');
    const { sagaLogRepository } = await import('./infrastructure/repositories/saga.repository');
    const { PesapalAdapter } = await import('./infrastructure/providers/pesapal.adapter');
    const { SettlementService } = await import('./domain/engines/settlement.engine');
    const { WalletServiceClient: WalletClientClass } = await import('./infrastructure/integrations/wallet-service.client');

    const pesapalAdapter = new PesapalAdapter();
    const settlementRepository = new OrderSettlementRepository(databaseManager.getPrisma());
    const settlementService = new SettlementService(settlementRepository);

    const paymentRepository = new OrderPaymentRepository(databaseManager.getPrisma());
    const walletClientForSaga = new WalletClientClass();
    const paymentSaga = new PaymentSaga(pesapalAdapter, paymentRepository, walletClientForSaga);
    const settlementSaga = new SettlementSaga(settlementService);
    const trainingSaga = new TrainingSaga(
      sagaLogRepository,
      'order-service',
      {} as import('./application/sagas/training.saga').ITrainingRecordRepository,
      {} as import('./application/sagas/training.saga').ICourierEligibilityPort,
      eventIdempotency
    );

    // Saga Recovery Worker
    const orchestratorRegistry = new Map<string, DistributedSagaOrchestrator<unknown>>();
    orchestratorRegistry.set('OrderFulfillmentSaga', orderFulfillmentSaga as DistributedSagaOrchestrator<unknown>);
    orchestratorRegistry.set('PaymentSaga', paymentSaga as DistributedSagaOrchestrator<unknown>);
    orchestratorRegistry.set('SettlementSaga', settlementSaga as DistributedSagaOrchestrator<unknown>);
    orchestratorRegistry.set('TrainingSaga', trainingSaga as DistributedSagaOrchestrator<unknown>);
    
    const sagaRecoveryWorker = new SagaRecoveryWorker(sagaLogRepository, orchestratorRegistry, {
      stuckThresholdMs: 5 * 60 * 1000,
      pollIntervalMs: 60 * 1000
    });
    sagaRecoveryWorkerRef = sagaRecoveryWorker;
    sagaRecoveryWorker.start();
    logger.info('✅ Saga recovery worker started with 4 registered saga types');

    // Initializing Saga Subscriptions
    // Note: eventBus is already connected or doesn't need explicit connect()
    eventBus.subscribe('StockReservation.Success.v1', async (e: any) => sagaReplyHandler.handleStockReserved(e));
    eventBus.subscribe('StockReservation.Failure.v1', async (e: any) => sagaReplyHandler.handleStockFailed(e));
    eventBus.subscribe('Payment.Success.v1', async (e: any) => sagaReplyHandler.handlePaymentSuccess(e));
    eventBus.subscribe('Payment.Failure.v1', async (e: any) => sagaReplyHandler.handlePaymentFailed(e));
    eventBus.subscribe('Delivery.Success.v1', async (e: any) => sagaReplyHandler.handleDeliverySuccess(e));
    eventBus.subscribe('Delivery.Failure.v1', async (e: any) => sagaReplyHandler.handleDeliveryFailed(e));

    // Subscribe to Payment.Command.v1 to trigger PaymentSaga
    // This bridges OrderFulfillmentSaga → PaymentSaga
    eventBus.subscribe('Payment.Command.v1', async (envelope: any) => {
      try {
        const data = envelope?.data || envelope?.payload || envelope;
        const { orderId, buyerId, amount, sagaId: parentSagaId } = data;

        if (!orderId || !buyerId) {
          logger.warn('Payment.Command.v1 missing orderId or buyerId', { data });
          return;
        }

        // Fetch the order to get payment method and currency
        const order = await orderRepository.findById(orderId);
        if (!order) {
          logger.warn('Payment.Command.v1: order not found', { orderId });
          await eventBus.publish('Payment.Failure.v1', { sagaId: parentSagaId, orderId, reason: 'Order not found' });
          return;
        }

        const { Payment, PaymentMethod, PaymentStatus } = await import('./domain/entities/payment.entity');
        const { makeId, getModelPrefix } = await import('@shared/ids/id');

        const payment = new Payment({
          id: makeId(getModelPrefix('Order_Payment')),
          orderId,
          buyerId,
          amount: Number((order as any).totalAmount?.amount ?? amount ?? 0),
          currency: (order as any).totalAmount?.currency ?? 'TZS',
          method: String((order as any).paymentMethod ?? '').toUpperCase() === 'WALLET' ? PaymentMethod.WALLET
                : String((order as any).paymentMethod ?? '').toUpperCase() === 'COD'    ? PaymentMethod.COD
                : String((order as any).paymentMethod ?? '').toUpperCase() === 'MOBILE_PAYMENT' ? PaymentMethod.MOBILE_MONEY
                : PaymentMethod.CARD,
          status: PaymentStatus.PENDING
        });

        // Await saga completion before publishing success.
        // paymentSaga.start() fires executeNextStep as fire-and-forget, so we must
        // subscribe to SagaCompleted / SagaFailed events for this specific sagaId
        // and resolve/reject only after the ProcessPayment step actually finishes.
        const paymentSagaId = await paymentSaga.start({ payment }, payment.id);

        await new Promise<void>((resolve, reject) => {
          const TIMEOUT_MS = 30_000;
          let settled = false;

          const cleanup = (unsubscribeCompleted: () => void, unsubscribeFailed: () => void, timer: ReturnType<typeof setTimeout>) => {
            if (!settled) {
              settled = true;
              clearTimeout(timer);
              unsubscribeCompleted();
              unsubscribeFailed();
            }
          };

          // One-shot helpers: subscribe, then remove the handler after first match
          const completedHandlerName = `PaymentSaga.${paymentSagaId}.Completed`;
          const failedHandlerName = `PaymentSaga.${paymentSagaId}.Failed`;

          const unsubscribeCompleted = () => {
            const handlers = (eventBus as any).handlers?.get('SagaCompleted') as Array<{ name: string; handler: Function }> | undefined;
            if (handlers) {
              const idx = handlers.findIndex((h: { name: string }) => h.name === completedHandlerName);
              if (idx !== -1) handlers.splice(idx, 1);
            }
          };

          const unsubscribeFailed = () => {
            const handlers = (eventBus as any).handlers?.get('SagaFailed') as Array<{ name: string; handler: Function }> | undefined;
            if (handlers) {
              const idx = handlers.findIndex((h: { name: string }) => h.name === failedHandlerName);
              if (idx !== -1) handlers.splice(idx, 1);
            }
          };

          const timer = setTimeout(() => {
            cleanup(unsubscribeCompleted, unsubscribeFailed, timer);
            reject(new Error(`PaymentSaga ${paymentSagaId} timed out after ${TIMEOUT_MS}ms`));
          }, TIMEOUT_MS);

          eventBus.subscribe('SagaCompleted', {
            name: completedHandlerName,
            handler: async (env: any) => {
              const evtData = env?.data || env;
              if (evtData?.sagaId === paymentSagaId) {
                cleanup(unsubscribeCompleted, unsubscribeFailed, timer);
                resolve();
              }
            }
          });

          eventBus.subscribe('SagaFailed', {
            name: failedHandlerName,
            handler: async (env: any) => {
              const evtData = env?.data || env;
              if (evtData?.sagaId === paymentSagaId) {
                cleanup(unsubscribeCompleted, unsubscribeFailed, timer);
                reject(new Error(evtData?.lastError || 'PaymentSaga failed'));
              }
            }
          });
        });

        // Payment saga completed successfully — notify OrderFulfillmentSaga
        await eventBus.publish('Payment.Success.v1', { sagaId: parentSagaId, orderId, paymentId: payment.id });
      } catch (err: any) {
        logger.error('Payment.Command.v1 handler failed', { error: err.message });
        const data = envelope?.data || envelope?.payload || envelope;
        await eventBus.publish('Payment.Failure.v1', { sagaId: data?.sagaId, orderId: data?.orderId, reason: err.message });
      }
    });

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
      codCommitmentService,
      walletServiceClient
    );
    const orderController = new OrderController(placeOrderUseCase, checkCODEligibilityUseCase);

    const { PrismaCODDisputeRepository } = await import('./infrastructure/database/prisma-cod-dispute.repository');
    const { ResolveCODDisputeUseCase } = await import('./application/use-cases/resolve-cod-dispute.use-case');

    const codDisputeRepository = new PrismaCODDisputeRepository();
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
        const dbHealth = await databaseManager.healthCheck();
        const isHealthy = dbHealth.prisma;

        res.status(isHealthy ? 200 : 503).json({
          service: 'order-service',
          status: isHealthy ? 'healthy' : 'unhealthy',
          timestamp: new Date().toISOString(),
          version: '1.0.0',
          environment: process.env.NODE_ENV || 'development',
          uptime: process.uptime(),
          database: {
            prisma: isHealthy,
            details: dbHealth.details
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
            prisma: false,
            details: {
              error: error instanceof Error ? error.message : 'Unknown error'
            }
          }
        });
      }
    });

    const PORT = process.env.PORT || 3002;

    app.listen(PORT, () => {
      logger.info(`🎉 Order Service running on port ${PORT}`);
      logger.info(`📊 Health check available at http://localhost:${PORT}/health`);
    });

  } catch (error) {
    logger.error('❌ Failed to initialize Order Service:', error);
    process.exit(1);
  }
}

// Graceful shutdown handling
let outboxProcessorRef: OutboxProcessor | null = null;
let sagaRecoveryWorkerRef: SagaRecoveryWorker | null = null;

export function setOutboxProcessor(processor: OutboxProcessor) {
  outboxProcessorRef = processor;
}

process.on('SIGTERM', async () => {
  logger.info('🛑 SIGTERM received, shutting down gracefully...');
  sagaRecoveryWorkerRef?.stop();
  outboxProcessorRef?.stop();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('🛑 SIGINT received, shutting down gracefully...');
  sagaRecoveryWorkerRef?.stop();
  outboxProcessorRef?.stop();
  process.exit(0);
});

// Start the service
initializeService();



