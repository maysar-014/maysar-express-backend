import { Router } from 'express';
import { Module } from '../../src/core/module.interface';
import { PlaceOrderUseCase } from './src/application/use-cases/place-order.use-case';
import { OrderController } from './src/api/controllers/order.controller';
import { setupOrderRoutes } from './src/api/routes/order.routes';
import { PrismaOrderRepository } from './src/infrastructure/database/prisma-order.repository';
import { OrderFulfillmentSaga } from './src/application/sagas/order-fulfillment.saga';
import { PaymentSaga } from './src/application/sagas/payment.saga';
import { ProgressiveCODEligibilityEngine } from './src/domain/engines/progressive-cod-eligibility.engine';
import { CODCommitmentService } from './src/domain/services/cod-commitment.service';
import { CheckCODEligibilityUseCase } from './src/application/use-cases/check-cod-eligibility.use-case';
import { CODDisputeController } from './src/api/controllers/cod-dispute.controller';
import { ResolveCODDisputeUseCase } from './src/application/use-cases/resolve-cod-dispute.use-case';
import { PrismaCODDisputeRepository } from './src/infrastructure/database/prisma-cod-dispute.repository';
import { AuthServiceClient } from './src/infrastructure/integrations/auth-service.client';
import { UserServiceClient } from './src/infrastructure/integrations/user-service.client';
import { LogisticsServiceClient } from './src/infrastructure/integrations/logistics-service.client';
import { WalletServiceClient } from './src/infrastructure/integrations/wallet-service.client';
import { SelcomPesaAdapter } from './src/infrastructure/providers/selcom-pesa.adapter';
import { OrderPaymentRepository } from './src/infrastructure/repositories/order-payment.repository';
import { PrismaCODTrustScoreRepository } from './src/infrastructure/repositories/prisma-cod-trust-score.repository';
import { PrismaCODRestrictionRepository } from './src/infrastructure/repositories/prisma-cod-restriction.repository';
import { Payment, PaymentMethod, PaymentStatus } from './src/domain/entities/payment.entity';
import { eventBus } from '../../shared/events/eventBus';
import { EventIdempotency } from '../../shared/middleware/idempotency';
import { logger } from './src/infrastructure/monitoring/logger';
import { TransactionalOutbox } from '../../shared/outbox/outboxPattern';
import { OutboxProcessor } from '../../shared/outbox/outbox.processor';
import { databaseManager, loadDatabaseConfig } from './src/config/database.config';
import { makeId, getModelPrefix } from '@shared/ids/id';
import healthRoutes from './src/api/routes/health.routes';
import { createMaintenanceRoutes } from './src/api/routes/maintenance.routes';
import { requireRoleOrService } from '@shared/middleware/auth-context.middleware';

let outboxProcessor: OutboxProcessor | null = null;

function createDegradedOrderRouter(reason: string): Router {
    const degradedRouter = Router();

    degradedRouter.use('/health', healthRoutes);

    degradedRouter.get('/orders', (_req, res) => {
        res.status(503).json({
            success: false,
            error: 'Order service is in degraded mode',
            reason
        });
    });

    degradedRouter.all('*', (_req, res) => {
        res.status(503).json({
            success: false,
            error: 'Order service is in degraded mode',
            reason
        });
    });

    return degradedRouter;
}

export const OrderModule: Module = {
    name: 'order-service',
    initialize: async () => {
        logger.info('Initializing order-service module');
        // Ensure the module never mounts as an empty router.
        OrderModule.routes = createDegradedOrderRouter('Initialization in progress');

        try {
            await databaseManager.initialize(loadDatabaseConfig());
            const prisma = databaseManager.getPrisma();

            // Initialize dependencies
            // Note: OrderRepository is instantiated inside controller currently (legacy pattern)
            // Ideally we should inject it here. For now we assume controller handles its deps or we improve it.
            // But Controller constructor takes PlaceOrderUseCase.

            const orderRepository = new PrismaOrderRepository();
            const eventPublisher = {
                publish: async (e: any) => {
                    const eventType = e?.type ?? e?.constructor?.name ?? 'UnknownEvent';
                    await eventBus.publish(eventType, e);
                }
            };

            const eventIdempotency = new EventIdempotency(process.env.REDIS_URL!, prisma);
            const sagaOrchestrator = new OrderFulfillmentSaga(eventIdempotency);

            const authServiceClient = new AuthServiceClient();
            const userServiceClient = new UserServiceClient();
            const logisticsServiceClient = new LogisticsServiceClient();
            const walletServiceClient = new WalletServiceClient();

            // Wire up PaymentSaga with wallet client so WALLET payments are processed correctly
            const selcomPesaAdapter = new SelcomPesaAdapter();
            const paymentRepository = new OrderPaymentRepository(prisma);
            const paymentSaga = new PaymentSaga(selcomPesaAdapter, paymentRepository, walletServiceClient);

            const codTrustScoreRepo = new PrismaCODTrustScoreRepository();
            const codRestrictionRepo = new PrismaCODRestrictionRepository();
            const codEligibilityEngine = new ProgressiveCODEligibilityEngine(
                codTrustScoreRepo,
                codRestrictionRepo,
                orderRepository,
                authServiceClient,
                logisticsServiceClient
            );
            const codCommitmentService = new CODCommitmentService(walletServiceClient);

            const placeOrderUseCase = new PlaceOrderUseCase(
                orderRepository,
                eventPublisher,
                sagaOrchestrator,
                codEligibilityEngine as any,
                codCommitmentService,
                walletServiceClient,
                selcomPesaAdapter
            );

            const checkCODEligibilityUseCase = new CheckCODEligibilityUseCase(codEligibilityEngine as any);
            const orderController = new OrderController(placeOrderUseCase, checkCODEligibilityUseCase, codCommitmentService, walletServiceClient);

            const codDisputeRepository = new PrismaCODDisputeRepository();
            const resolveCODDisputeUseCase = new ResolveCODDisputeUseCase(codDisputeRepository, eventPublisher);
            const codDisputeController = new CODDisputeController(resolveCODDisputeUseCase);

            const orderRouter = setupOrderRoutes(orderController, codDisputeController);
            orderRouter.use('/health', healthRoutes);
            orderRouter.use('/system/maintenance', requireRoleOrService(['admin', 'system']), createMaintenanceRoutes());
            OrderModule.routes = orderRouter;
            logger.info('Order-service routes mounted successfully');

            // Subscribe to saga reply events so OrderFulfillmentSaga can advance its steps
            const { SagaReplyHandler } = await import('./src/infrastructure/messaging/saga-reply-handler');
            const sagaReplyHandler = new SagaReplyHandler(sagaOrchestrator);
            eventBus.subscribe('StockReservation.Success.v1', async (e: any) => sagaReplyHandler.handleStockReserved(e));
            eventBus.subscribe('StockReservation.Failure.v1', async (e: any) => sagaReplyHandler.handleStockFailed(e));
            eventBus.subscribe('Payment.Success.v1', async (e: any) => sagaReplyHandler.handlePaymentSuccess(e));
            eventBus.subscribe('Payment.Failure.v1', async (e: any) => sagaReplyHandler.handlePaymentFailed(e));
            eventBus.subscribe('Delivery.Success.v1', async (e: any) => sagaReplyHandler.handleDeliverySuccess(e));
            eventBus.subscribe('Delivery.Failure.v1', async (e: any) => sagaReplyHandler.handleDeliveryFailed(e));
            logger.info('Order-service saga reply handlers registered');

            // Bridge: Payment.Command.v1 → PaymentSaga
            // For WALLET orders, PlaceOrderUseCase already debited the wallet synchronously,
            // so we just acknowledge success. For other methods, run the full PaymentSaga.
            eventBus.subscribe('Payment.Command.v1', async (envelope: any) => {
                try {
                    const data = envelope?.data || envelope?.payload || envelope;
                    const { orderId, buyerId, amount, sagaId: parentSagaId } = data;

                    if (!orderId || !buyerId) {
                        logger.warn('[OrderModule] Payment.Command.v1 missing orderId or buyerId', { data });
                        return;
                    }

                    const order = await orderRepository.findById(orderId);
                    if (!order) {
                        logger.warn('[OrderModule] Payment.Command.v1: order not found', { orderId });
                        await eventBus.publish('Payment.Failure.v1', { sagaId: parentSagaId, orderId, reason: 'Order not found' });
                        return;
                    }

                    const paymentMethodRaw = String((order as any).paymentMethod ?? '').toUpperCase();

                    // WALLET was already debited synchronously in PlaceOrderUseCase — just ack success
                    if (paymentMethodRaw === 'WALLET') {
                        logger.info('[OrderModule] Payment.Command.v1: WALLET already debited synchronously, acknowledging success', { orderId });
                        await eventBus.publish('Payment.Success.v1', { sagaId: parentSagaId, orderId });
                        return;
                    }

                    // For COD / CARD / MOBILE_PAYMENT — run PaymentSaga
                    const method = paymentMethodRaw === 'COD'            ? PaymentMethod.COD
                                 : paymentMethodRaw === 'MOBILE_PAYMENT' ? PaymentMethod.MOBILE_MONEY
                                 : PaymentMethod.CARD;

                    const payment = new Payment({
                        id: makeId(getModelPrefix('Order_Payment')),
                        orderId,
                        buyerId,
                        amount: Number((order as any).totalAmount?.amount ?? amount ?? 0),
                        currency: (order as any).totalAmount?.currency ?? 'TZS',
                        method,
                        status: PaymentStatus.PENDING
                    });

                    await paymentSaga.start(payment.id, { payment });
                    await eventBus.publish('Payment.Success.v1', { sagaId: parentSagaId, orderId, paymentId: payment.id });
                } catch (err: any) {
                    logger.error('[OrderModule] Payment.Command.v1 handler failed', { error: err.message });
                    const data = envelope?.data || envelope?.payload || envelope;
                    await eventBus.publish('Payment.Failure.v1', { sagaId: data?.sagaId, orderId: data?.orderId, reason: err.message });
                }
            });
            logger.info('Order-service Payment.Command.v1 bridge registered');

            // Initialize and start OutboxProcessor
            const outbox = new TransactionalOutbox(prisma, 'order_OutboxEvent');
            outboxProcessor = new OutboxProcessor(prisma, outbox, eventBus, 'order-service');
            outboxProcessor.start();
            logger.info('Order-service outbox processor started');

            // ── Progressive COD Trust Signal Listeners ────────────────────────
            const { TrustSignalIngestionService } = await import('./src/application/services/trust-signal-ingestion.service');
            const { PrismaCODScoreEventRepository: ScoreEventRepoClass } = await import('./src/infrastructure/repositories/prisma-cod-score-event.repository');
            const { TrustSignalType } = await import('./src/domain/engines/cod-trust/trust-signal.types');

            const trustSignalIngestion = new TrustSignalIngestionService(
                codTrustScoreRepo,
                new ScoreEventRepoClass(),
                eventPublisher
            );

            eventBus.subscribe('OrderDelivered', async (envelope: any) => {
                try {
                    const data = envelope?.data || envelope?.payload || envelope;
                    const { buyerId, orderId, paymentMethod, totalAmount } = data;
                    if (!buyerId || !orderId) return;
                    if (String(paymentMethod ?? '').toUpperCase() === 'COD') {
                        await trustSignalIngestion.recordSignal({ buyerId, signalType: TrustSignalType.SUCCESSFUL_DELIVERY, sourceService: 'order-service', sourceEntityId: orderId });
                        const amount = Number(totalAmount?.amount ?? totalAmount ?? 0);
                        if (amount > 100_000) {
                            await trustSignalIngestion.recordSignal({ buyerId, signalType: TrustSignalType.HIGH_VALUE_COMPLETION, sourceService: 'order-service', sourceEntityId: orderId });
                        }
                    }
                } catch (err: any) { logger.warn('[TrustSignal] OrderDelivered handler failed', { error: err.message }); }
            });

            eventBus.subscribe('OrderCancelled', async (envelope: any) => {
                try {
                    const data = envelope?.data || envelope?.payload || envelope;
                    const { buyerId, orderId, previousStatus } = data;
                    if (!buyerId || !orderId) return;
                    const dispatched = ['ASSIGNED', 'SHIPPED', 'IN_TRANSIT', 'assigned', 'shipped', 'in_transit'];
                    if (dispatched.includes(previousStatus)) {
                        await trustSignalIngestion.recordSignal({ buyerId, signalType: TrustSignalType.POST_DISPATCH_CANCELLATION, sourceService: 'order-service', sourceEntityId: orderId });
                    }
                } catch (err: any) { logger.warn('[TrustSignal] OrderCancelled handler failed', { error: err.message }); }
            });

            eventBus.subscribe('DisputeResolved', async (envelope: any) => {
                try {
                    const data = envelope?.data || envelope?.payload || envelope;
                    const { buyerId, orderId, resolution } = data;
                    if (!buyerId || !orderId) return;
                    if (String(resolution ?? '').toUpperCase() === 'BUYER_AT_FAULT') {
                        await trustSignalIngestion.recordSignal({ buyerId, signalType: TrustSignalType.DISPUTE_LOST, sourceService: 'order-service', sourceEntityId: orderId });
                    }
                } catch (err: any) { logger.warn('[TrustSignal] DisputeResolved handler failed', { error: err.message }); }
            });

            eventBus.subscribe('CourierReportSubmitted', async (envelope: any) => {
                try {
                    const data = envelope?.data || envelope?.payload || envelope;
                    const { buyerId, orderId, outcome } = data;
                    if (!buyerId || !orderId) return;
                    const outcomeUpper = String(outcome ?? '').toUpperCase();
                    if (outcomeUpper === 'REFUSED_DELIVERY') {
                        await trustSignalIngestion.recordSignal({ buyerId, signalType: TrustSignalType.DELIVERY_REFUSED, sourceService: 'logistics-service', sourceEntityId: orderId });
                    } else if (outcomeUpper === 'NEGATIVE') {
                        await trustSignalIngestion.recordSignal({ buyerId, signalType: TrustSignalType.COURIER_NEGATIVE_REPORT, sourceService: 'logistics-service', sourceEntityId: orderId });
                    }
                } catch (err: any) { logger.warn('[TrustSignal] CourierReportSubmitted handler failed', { error: err.message }); }
            });

            eventBus.subscribe('PhoneVerified', async (envelope: any) => {
                try {
                    const data = envelope?.data || envelope?.payload || envelope;
                    const { userId } = data;
                    if (!userId) return;
                    await trustSignalIngestion.recordSignal({ buyerId: userId, signalType: TrustSignalType.PHONE_VERIFIED, sourceService: 'auth-service', sourceEntityId: userId });
                } catch (err: any) { logger.warn('[TrustSignal] PhoneVerified handler failed', { error: err.message }); }
            });

            // KYC_VERIFIED — buyer completes KYC verification (Phase 4 gate F4.5)
            // When admin approves KYC, kyc-service publishes 'kyc.status_changed' with status=VERIFIED.
            // We map this to ACCOUNT_AGE_MILESTONE as the closest positive trust signal available,
            // since KYC verification is a strong identity signal equivalent to account maturity.
            eventBus.subscribe('kyc.status_changed', async (envelope: any) => {
                try {
                    const data = envelope?.data || envelope?.payload || envelope;
                    const { userId, status, kycLevel } = data;
                    if (!userId || String(status ?? '').toLowerCase() !== 'verified') return;

                    // KYC level 1+ = identity verified = strong positive trust signal
                    await trustSignalIngestion.recordSignal({
                        buyerId: userId,
                        signalType: TrustSignalType.ACCOUNT_AGE_MILESTONE,
                        sourceService: 'kyc-service',
                        sourceEntityId: `kyc:${userId}:level${kycLevel ?? 1}`,
                    });
                    logger.info(`[TrustSignal] KYC verified for user ${userId} at level ${kycLevel ?? 1} — trust signal recorded`);
                } catch (err: any) { logger.warn('[TrustSignal] kyc.status_changed handler failed', { error: err.message }); }
            });

            logger.info('Order-service Progressive COD Trust Signal listeners registered (including KYC bridge)');
        } catch (error) {
            logger.error('Failed init order-service', error);
            const reason = error instanceof Error ? error.message : 'Unknown initialization error';
            OrderModule.routes = createDegradedOrderRouter(reason);
        }
    },
    routes: Router(),
    shutdown: async () => {
        logger.info('Shutting down order-service module');
        if (outboxProcessor) {
            outboxProcessor.stop();
        }
        await databaseManager.disconnect();
    }
};



