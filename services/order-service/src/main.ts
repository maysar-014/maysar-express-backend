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
    const { SelcomPesaAdapter } = await import('./infrastructure/providers/selcom-pesa.adapter');
    const { SettlementService } = await import('./domain/engines/settlement.engine');
    const { WalletServiceClient: WalletClientClass } = await import('./infrastructure/integrations/wallet-service.client');

    const selcomPesaAdapter = new SelcomPesaAdapter();
    const settlementRepository = new OrderSettlementRepository(databaseManager.getPrisma());
    const settlementService = new SettlementService(settlementRepository);

    const paymentRepository = new OrderPaymentRepository(databaseManager.getPrisma());
    const walletClientForSaga = new WalletClientClass();
    const paymentSaga = new PaymentSaga(selcomPesaAdapter, paymentRepository, walletClientForSaga);
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

    // ── StockReservation.Command.v1 → auto-complete (inventory not implemented) ─
    // For WALLET orders, stock reservation is not blocking. Auto-succeed so the
    // OrderFulfillmentSaga can advance to the Payment step.
    eventBus.subscribe('StockReservation.Command.v1', async (envelope: any) => {
      const data = envelope?.data || envelope?.payload || envelope;
      const { sagaId, orderId } = data;
      if (!sagaId) {
        logger.warn('[StockReservation.Command.v1] Missing sagaId, skipping');
        return;
      }
      try {
        await eventBus.publish('StockReservation.Success.v1', { sagaId, orderId });
        logger.info(`[StockReservation.Command.v1] Auto-completed for saga ${sagaId}, order ${orderId}`);
      } catch (err: any) {
        logger.error(`[StockReservation.Command.v1] Failed to publish success for saga ${sagaId}: ${err.message}`);
      }
    });

    // ── Delivery.Command.v1 → create delivery record in logistics service ─────
    // We handle it here (in-process) by calling the logistics service HTTP API,
    // then publish Delivery.Success.v1 to advance the saga to COMPLETED.
    const LOGISTICS_BASE_URL = process.env.LOGISTICS_BASE_URL || 'http://localhost:3000';
    const JWT_SECRET_FOR_DELIVERY = process.env.JWT_SECRET || '';

    function generateSystemTokenForDelivery(): string {
      const crypto = require('crypto');
      const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
      const payload = Buffer.from(JSON.stringify({
        userId: 'system',
        email: 'order-service@internal.maysar.co.tz',
        roles: ['admin', 'system'],
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 300
      })).toString('base64url');
      const sig = crypto.createHmac('sha256', JWT_SECRET_FOR_DELIVERY).update(`${header}.${payload}`).digest('base64url');
      return `${header}.${payload}.${sig}`;
    }

    eventBus.subscribe('Delivery.Command.v1', async (envelope: any) => {
      const data = envelope?.data || envelope?.payload || envelope;
      const { orderId, sellerId, sagaId: parentSagaId } = data;

      if (!orderId) {
        logger.warn('[Delivery.Command.v1] Missing orderId, skipping');
        await eventBus.publish('Delivery.Failure.v1', { sagaId: parentSagaId, orderId, reason: 'Missing orderId' });
        return;
      }

      try {
        // Look up the order to get full details for delivery creation
        const orderForDelivery = await orderRepository.findById(orderId);
        if (!orderForDelivery) {
          await eventBus.publish('Delivery.Failure.v1', { sagaId: parentSagaId, orderId, reason: 'Order not found' });
          return;
        }

        const deliveryAddr = (orderForDelivery as any).deliveryAddress || {};
        const token = generateSystemTokenForDelivery();

        // Call logistics API to create delivery record
        const deliveryRes = await fetch(`${LOGISTICS_BASE_URL}/api/logistics/api/v1/deliveries`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'idempotency-key': `delivery-create-${orderId}-${Date.now()}`,
          },
          body: JSON.stringify({
            orderId,
            pickupAddress: {
              coordinates: { lat: -6.7924, lng: 39.2083 }, // Dar es Salaam default (seller location)
              street: 'Seller Location',
              city: deliveryAddr.city || 'Dar es Salaam',
              country: deliveryAddr.country || 'Tanzania',
            },
            deliveryAddress: {
              coordinates: { lat: -6.7924, lng: 39.2083 }, // Buyer delivery coordinates
              street: deliveryAddr.street || 'Delivery Location',
              city: deliveryAddr.city || 'Dar es Salaam',
              country: deliveryAddr.country || 'Tanzania',
            },
            packageDetails: { weight: Number((orderForDelivery as any).totalWeight ?? 0.5) || 0.5 },
            priority: 'standard',
          }),
        });

        if (deliveryRes.ok) {
          logger.info(`[Delivery.Command.v1] Delivery created for order ${orderId}`);
          await eventBus.publish('Delivery.Success.v1', { sagaId: parentSagaId, orderId });
        } else {
          const errBody = await deliveryRes.text();
          logger.error(`[Delivery.Command.v1] Delivery creation returned ${deliveryRes.status} for order ${orderId}: ${errBody}`);
          await eventBus.publish('Delivery.Failure.v1', {
            sagaId: parentSagaId,
            orderId,
            reason: `Logistics API returned ${deliveryRes.status}: ${errBody.slice(0, 200)}`,
          });
        }
      } catch (err: any) {
        logger.error(`[Delivery.Command.v1] Failed for order ${orderId}: ${err.message}`);
        await eventBus.publish('Delivery.Failure.v1', {
          sagaId: parentSagaId,
          orderId,
          reason: err.message,
        });
      }
    });

    // ── Progressive COD Trust Signal Listeners ────────────────────────────────
    // Wire domain events to TrustSignalIngestionService so the COD Eligibility Score
    // is updated automatically as buyers complete orders, cancel, or trigger disputes.
    const { TrustSignalIngestionService } = await import('./application/services/trust-signal-ingestion.service');
    const { PrismaCODTrustScoreRepository: TrustScoreRepo } = await import('./infrastructure/repositories/prisma-cod-trust-score.repository');
    const { PrismaCODScoreEventRepository: ScoreEventRepo } = await import('./infrastructure/repositories/prisma-cod-score-event.repository');
    const { TrustSignalType } = await import('./domain/engines/cod-trust/trust-signal.types');

    const trustSignalIngestion = new TrustSignalIngestionService(
      new TrustScoreRepo(),
      new ScoreEventRepo(),
      eventPublisher
    );

    // SUCCESSFUL_DELIVERY — COD order confirmed delivered
    eventBus.subscribe('OrderDelivered', async (envelope: any) => {
      try {
        const data = envelope?.data || envelope?.payload || envelope;
        const { buyerId, orderId, paymentMethod, totalAmount } = data;
        if (!buyerId || !orderId) return;

        // Only record for COD orders (WALLET/CARD are handled at payment time)
        if (String(paymentMethod ?? '').toUpperCase() === 'COD') {
          await trustSignalIngestion.recordSignal({
            buyerId,
            signalType: TrustSignalType.SUCCESSFUL_DELIVERY,
            sourceService: 'order-service',
            sourceEntityId: orderId,
          });

          // HIGH_VALUE_COMPLETION — COD order > TZS 100,000 successfully delivered
          const amount = Number(totalAmount?.amount ?? totalAmount ?? 0);
          if (amount > 100_000) {
            await trustSignalIngestion.recordSignal({
              buyerId,
              signalType: TrustSignalType.HIGH_VALUE_COMPLETION,
              sourceService: 'order-service',
              sourceEntityId: orderId,
            });
          }
        }
      } catch (err: any) {
        logger.warn('[TrustSignal] OrderDelivered handler failed', { error: err.message });
      }
    });

    // POST_DISPATCH_CANCELLATION — buyer cancels after order dispatched
    eventBus.subscribe('OrderCancelled', async (envelope: any) => {
      try {
        const data = envelope?.data || envelope?.payload || envelope;
        const { buyerId, orderId, previousStatus } = data;
        if (!buyerId || !orderId) return;

        const dispatchedStatuses = ['ASSIGNED', 'SHIPPED', 'IN_TRANSIT', 'assigned', 'shipped', 'in_transit'];
        if (dispatchedStatuses.includes(previousStatus)) {
          await trustSignalIngestion.recordSignal({
            buyerId,
            signalType: TrustSignalType.POST_DISPATCH_CANCELLATION,
            sourceService: 'order-service',
            sourceEntityId: orderId,
          });
        }
      } catch (err: any) {
        logger.warn('[TrustSignal] OrderCancelled handler failed', { error: err.message });
      }
    });

    // DISPUTE_LOST — dispute resolved against buyer
    eventBus.subscribe('DisputeResolved', async (envelope: any) => {
      try {
        const data = envelope?.data || envelope?.payload || envelope;
        const { buyerId, orderId, resolution } = data;
        if (!buyerId || !orderId) return;

        if (String(resolution ?? '').toUpperCase() === 'BUYER_AT_FAULT') {
          await trustSignalIngestion.recordSignal({
            buyerId,
            signalType: TrustSignalType.DISPUTE_LOST,
            sourceService: 'order-service',
            sourceEntityId: orderId,
          });
        }
      } catch (err: any) {
        logger.warn('[TrustSignal] DisputeResolved handler failed', { error: err.message });
      }
    });

    // DELIVERY_REFUSED / COURIER_NEGATIVE_REPORT — from logistics service
    eventBus.subscribe('CourierReportSubmitted', async (envelope: any) => {
      try {
        const data = envelope?.data || envelope?.payload || envelope;
        const { buyerId, orderId, outcome } = data;
        if (!buyerId || !orderId) return;

        const outcomeUpper = String(outcome ?? '').toUpperCase();
        if (outcomeUpper === 'REFUSED_DELIVERY') {
          await trustSignalIngestion.recordSignal({
            buyerId,
            signalType: TrustSignalType.DELIVERY_REFUSED,
            sourceService: 'logistics-service',
            sourceEntityId: orderId,
          });

          // Forfeit the commitment hold as a penalty for refusing delivery
          const order = await orderRepository.findById(orderId);
          const holdId = (order as any)?.codCommitmentHoldId;
          if (holdId) {
            try {
              const { CODCommitmentService: CCS } = await import('./domain/services/cod-commitment.service');
              const { WalletServiceClient: WC } = await import('./infrastructure/integrations/wallet-service.client');
              const tempService = new CCS(new WC());
              await tempService.forfeitCommitment(holdId);
              logger.info(`[COD] Commitment hold forfeited (delivery refused) for order ${orderId}, holdId=${holdId}`);
            } catch (holdErr: any) {
              logger.warn(`[COD] Failed to forfeit commitment hold for refused delivery ${orderId}: ${holdErr.message}`);
            }
          }
        } else if (outcomeUpper === 'NEGATIVE') {
          await trustSignalIngestion.recordSignal({
            buyerId,
            signalType: TrustSignalType.COURIER_NEGATIVE_REPORT,
            sourceService: 'logistics-service',
            sourceEntityId: orderId,
          });
        }
      } catch (err: any) {
        logger.warn('[TrustSignal] CourierReportSubmitted handler failed', { error: err.message });
      }
    });

    // PHONE_VERIFIED — from auth service
    eventBus.subscribe('PhoneVerified', async (envelope: any) => {
      try {
        const data = envelope?.data || envelope?.payload || envelope;
        const { userId } = data;
        if (!userId) return;

        await trustSignalIngestion.recordSignal({
          buyerId: userId,
          signalType: TrustSignalType.PHONE_VERIFIED,
          sourceService: 'auth-service',
          sourceEntityId: userId,
        });
      } catch (err: any) {
        logger.warn('[TrustSignal] PhoneVerified handler failed', { error: err.message });
      }
    });

    // KYC_VERIFIED — buyer completes KYC verification (Phase 4 gate F4.5)
    // kyc-service publishes 'kyc.status_changed' with { userId, status: 'verified', kycLevel }
    // We map this to ACCOUNT_AGE_MILESTONE as the closest positive trust signal available.
    eventBus.subscribe('kyc.status_changed', async (envelope: any) => {
      try {
        const data = envelope?.data || envelope?.payload || envelope;
        const { userId, status, kycLevel } = data;
        if (!userId || String(status ?? '').toLowerCase() !== 'verified') return;

        await trustSignalIngestion.recordSignal({
          buyerId: userId,
          signalType: TrustSignalType.ACCOUNT_AGE_MILESTONE,
          sourceService: 'kyc-service',
          sourceEntityId: `kyc:${userId}:level${kycLevel ?? 1}`,
        });
        logger.info(`[TrustSignal] KYC verified for user ${userId} at level ${kycLevel ?? 1} — trust signal recorded`);
      } catch (err: any) {
        logger.warn('[TrustSignal] kyc.status_changed handler failed', { error: err.message });
      }
    });

    logger.info('✅ Progressive COD Trust Signal listeners registered (including KYC bridge)');

    // ── Account Age Milestone Job ─────────────────────────────────────────────
    // Runs once every 24 hours. Checks all buyers who reached 180 days of account
    // age since the last check and haven't yet received the ACCOUNT_AGE_MILESTONE signal.
    const runAccountAgeMilestoneCheck = async () => {
      try {
        const { TrustSignalType: TST } = await import('./domain/engines/cod-trust/trust-signal.types');
        const cutoff = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000); // 180 days ago

        // Find buyers whose account is >= 180 days old and haven't received the milestone signal
        const eligibleBuyers = await (databaseManager.getPrisma() as any).user_User.findMany({
          where: {
            role: 'BUYER',
            status: 'ACTIVE',
            createdAt: { lte: cutoff },
          },
          select: { id: true },
        });

        for (const buyer of eligibleBuyers) {
          // Check if they already received the milestone signal
          const alreadyReceived = await (databaseManager.getPrisma() as any).order_CODScoreEvent.findFirst({
            where: { buyerId: buyer.id, signalType: TST.ACCOUNT_AGE_MILESTONE },
          });
          if (!alreadyReceived) {
            await trustSignalIngestion.recordSignal({
              buyerId: buyer.id,
              signalType: TST.ACCOUNT_AGE_MILESTONE,
              sourceService: 'order-service:account-age-job',
              sourceEntityId: buyer.id,
            });
          }
        }

        if (eligibleBuyers.length > 0) {
          logger.info(`[AccountAgeMilestone] Processed ${eligibleBuyers.length} eligible buyers`);
        }
      } catch (err: any) {
        logger.warn('[AccountAgeMilestone] Job failed', { error: err.message });
      }
    };

    // Run once at startup (catches any missed milestones), then every 24 hours
    runAccountAgeMilestoneCheck();
    const accountAgeJobInterval = setInterval(runAccountAgeMilestoneCheck, 24 * 60 * 60 * 1000);
    // Ensure the interval doesn't prevent graceful shutdown
    accountAgeJobInterval.unref();

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
    const { PrismaCODTrustScoreRepository } = await import('./infrastructure/repositories/prisma-cod-trust-score.repository');
    const { PrismaCODRestrictionRepository } = await import('./infrastructure/repositories/prisma-cod-restriction.repository');

    const authServiceClient = new AuthServiceClient();
    const userServiceClient = new UserServiceClient();
    const logisticsServiceClient = new LogisticsServiceClient();
    const walletServiceClient = new WalletServiceClient();

    // Shared trust score repository (used by both engines)
    const codTrustScoreRepo = new PrismaCODTrustScoreRepository();
    const codRestrictionRepo = new PrismaCODRestrictionRepository();

    // ── EnhancedCODEligibilityEngine (permanent — progressive engine retired) ─
    const { EnhancedCODEligibilityEngine } = await import('./domain/engines/enhanced-cod-eligibility.engine');
    const { PerOrderRiskAssessor } = await import('./domain/engines/cod-trust/per-order-risk.assessor');
    const { SellerCODRiskService } = await import('./domain/engines/cod-trust/seller-cod-risk.service');
    const { loadWardCentroidResolver } = await import('./domain/engines/cod-trust/ward-centroid.resolver');
    const { PrismaCODRiskAssessmentRepository } = await import('./infrastructure/repositories/prisma-cod-risk-assessment.repository');
    const { PrismaSellerCODRiskRepository, PrismaSellerCODRiskEventRepository } = await import('./infrastructure/repositories/prisma-seller-cod-risk.repository');

    // Singleton ward centroid resolver (loaded once at startup, ~120 KB in memory)
    const wardCentroidResolver = loadWardCentroidResolver();
    logger.info(`✅ WardCentroidResolver loaded (${wardCentroidResolver.size} wards with coordinates)`);

    const riskAssessmentRepo = new PrismaCODRiskAssessmentRepository();
    const sellerCODRiskRepo = new PrismaSellerCODRiskRepository();
    const sellerCODRiskEventRepo = new PrismaSellerCODRiskEventRepository();

    const perOrderRiskAssessor = new PerOrderRiskAssessor(orderRepository, riskAssessmentRepo);
    const sellerCODRiskService = new SellerCODRiskService(sellerCODRiskRepo, sellerCODRiskEventRepo);

    const codEligibilityEngine = new EnhancedCODEligibilityEngine(
      codTrustScoreRepo,
      codRestrictionRepo,
      orderRepository,
      authServiceClient,
      logisticsServiceClient,
      perOrderRiskAssessor,
      sellerCODRiskService,
      wardCentroidResolver,
    );

    // Register OrderDeliveryConfirmedHandler
    const { OrderDeliveryConfirmedHandler } = await import('./infrastructure/messaging/order-delivery-confirmed.handler');
    const orderDeliveryConfirmedHandler = new OrderDeliveryConfirmedHandler(
      trustSignalIngestion,
      codTrustScoreRepo,
      orderRepository,
    );
    eventBus.subscribe('OrderDeliveryConfirmed.v1', async (envelope: any) => {
      try {
        const data = envelope?.data || envelope?.payload || envelope;
        await orderDeliveryConfirmedHandler.handle(data);
      } catch (err: any) {
        logger.warn('[OrderDeliveryConfirmed.v1] Handler failed', { error: err.message });
      }
    });

    // Register DisputeRaisedHandler
    const { DisputeRaisedHandler } = await import('./infrastructure/messaging/dispute-raised.handler');
    const disputeRaisedHandler = new DisputeRaisedHandler(trustSignalIngestion, codTrustScoreRepo);
    eventBus.subscribe('DisputeRaised.v1', async (envelope: any) => {
      try {
        const data = envelope?.data || envelope?.payload || envelope;
        await disputeRaisedHandler.handle(data);
      } catch (err: any) {
        logger.warn('[DisputeRaised.v1] Handler failed', { error: err.message });
      }
    });

    logger.info('✅ EnhancedCODEligibilityEngine active (5-tier dual-axis, ward-centroid geo, per-order risk)');

    const codCommitmentService = new CODCommitmentService(walletServiceClient);
    const checkCODEligibilityUseCase = new CheckCODEligibilityUseCase(codEligibilityEngine as any);

    const placeOrderUseCase = new PlaceOrderUseCase(
      orderRepository,
      eventPublisher,
      orderFulfillmentSaga,
      codEligibilityEngine as any,
      codCommitmentService,
      walletServiceClient,
      selcomPesaAdapter
    );
    const orderController = new OrderController(placeOrderUseCase, checkCODEligibilityUseCase, codCommitmentService, walletServiceClient);

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



