import { PrismaClient } from '@prisma/client';
import { WalletRepository } from './infrastructure/repositories/wallet.repository';
import { TransactionRepository } from './infrastructure/repositories/transaction.repository';
import { WalletController } from './api/controllers/wallet.controller';
import { CreditWalletUseCase } from './application/use-cases/credit-wallet.use-case';
import { DebitWalletUseCase } from './application/use-cases/debit-wallet.use-case';
import { FreezeFundsUseCase } from './application/use-cases/freeze-funds.use-case';
import { UnfreezeFundsUseCase } from './application/use-cases/unfreeze-funds.use-case';
import { WalletEngine } from './domain/engines/wallet.engine';
import { LimitPolicy } from './domain/policies/wallet-limit.policy';
import { VelocityCheckPolicy } from './domain/policies/velocity-check.policy';
import { OutboxRepository } from './infrastructure/messaging/outbox.repository';
import { EventBus } from '@shared-events/eventBus';
import { OutboxProcessor } from './infrastructure/messaging/outbox-processor';
import { IEventBus, EventEnvelope } from './infrastructure/messaging/event-bus.interface';
import { IdempotencyRepository } from './infrastructure/repositories/idempotency.repository';
import { HoldRepository } from './infrastructure/repositories/hold.repository';
import { AuditLogRepository } from './infrastructure/repositories/audit-log.repository';
import { IdempotencyService } from './application/services/idempotency.service';
import { VelocityCheckService } from './application/services/velocity-check.service';
import { PlaceHoldUseCase } from './application/use-cases/place-hold.use-case';
import { ReleaseHoldUseCase } from './application/use-cases/release-hold.use-case';
import { CaptureHoldUseCase } from './application/use-cases/capture-hold.use-case';
import { ReverseTransactionUseCase } from './application/use-cases/reverse-transaction.use-case';
import { GetWalletStatementUseCase } from './application/use-cases/get-wallet-statement.use-case';
import { ExpireHoldUseCase } from './application/use-cases/expire-hold.use-case';
import { HoldExpiryJob } from './application/jobs/hold-expiry.job';
import { HoldReconciliationJob } from './application/jobs/hold-reconciliation.job';
import { OrderStateReader } from './infrastructure/repositories/order-state.reader';
import { WalletEventPublisher } from './infrastructure/messaging/wallet-event-publisher';
import { walletConfig } from './config/wallet.config';
import { PaymentServiceClient } from './infrastructure/clients/payment-service.client';
import { TopUpWalletUseCase } from './application/use-cases/top-up-wallet.use-case';
import { PaymentCompletedHandler } from './infrastructure/messaging/payment-completed.handler';
import { UserRegisteredHandler } from './infrastructure/messaging/user-registered.handler';
import { EventIdempotency } from '@shared/middleware/idempotency';
import { PayoutServiceClient } from './infrastructure/clients/payout-service.client';
import { InitiatePayoutFromWalletUseCase } from './application/use-cases/initiate-payout-from-wallet.use-case';
import { provideSagaLogRepository } from './infrastructure/repositories/saga.repository';
import { WalletTransactionSaga, WalletSagaPayload } from './application/sagas/wallet-transaction.saga';
import { CODSettlementSaga } from './application/sagas/cod-settlement.saga';
import { SagaFactory } from '@shared/saga/saga-factory';
import { DistributedSagaOrchestrator } from '@shared/saga/saga.orchestrator';
import { RedisLock } from '../../../shared/locking/redis-lock';
import { createClient } from 'redis';
import { ActorType, AuditInfo } from './domain/value-objects/audit-info.value-object';
import { createPrismaClient } from '@shared/database/prisma-client';

interface PaymentInitiatedEventData {
    paymentId: string;
    userId: string;
    amount: number;
    currency: string;
    method: string;
}

interface CODSettlementEventData {
    orderId: string;
    buyerId: string;
    sellerId: string;
    amount: number;
    currency: string;
    holdId: string;
    courierId?: string;
}

const asRecord = (value: unknown): Record<string, unknown> =>
    typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};

const getString = (value: unknown): string | undefined => (typeof value === 'string' ? value : undefined);
const getNumber = (value: unknown): number | undefined => (typeof value === 'number' ? value : undefined);

const getMetadataString = (metadata: Record<string, unknown> | undefined, key: string): string | undefined => {
    const value = metadata?.[key];
    return typeof value === 'string' ? value : undefined;
};

const parsePaymentInitiated = (value: unknown): PaymentInitiatedEventData | null => {
    const payload = asRecord(value);
    const paymentId = getString(payload.paymentId);
    const userId = getString(payload.userId);
    const amount = getNumber(payload.amount);
    const currency = getString(payload.currency);
    const method = getString(payload.method);

    if (!paymentId || !userId || typeof amount !== 'number' || !currency || !method) {
        return null;
    }

    return { paymentId, userId, amount, currency, method };
};

const parseCODSettlement = (value: unknown): CODSettlementEventData | null => {
    const payload = asRecord(value);
    const orderId = getString(payload.orderId);
    const buyerId = getString(payload.buyerId);
    const sellerId = getString(payload.sellerId);
    const amount = getNumber(payload.amount);
    const currency = getString(payload.currency);
    const holdId = getString(payload.holdId);
    const courierId = getString(payload.courierId);

    if (!orderId || !buyerId || !sellerId || typeof amount !== 'number' || !currency || !holdId) {
        return null;
    }

    return { orderId, buyerId, sellerId, amount, currency, holdId, courierId };
};

export class Container {
    private static instance: Container;
    public readonly prisma: PrismaClient;
    public readonly walletController: WalletController;
    public readonly eventBus: IEventBus;
    public readonly outboxProcessor: OutboxProcessor;
    public readonly holdExpiryJob: HoldExpiryJob;
    public readonly holdReconciliationJob: HoldReconciliationJob;

    /**
     * Starts the wallet background jobs.
     *
     * Both jobs were previously constructed and never started, so no hold was
     * ever expired or reconciled: a COD hold whose release failed (or whose
     * order was cancelled while the wallet was unreachable) kept the buyer's
     * funds frozen indefinitely, with no automated recovery. Background jobs are
     * opt-out via WALLET_DISABLE_BACKGROUND_JOBS=1 for tests and one-off runs.
     */
    public startBackgroundJobs(): void {
        if (String(process.env.WALLET_DISABLE_BACKGROUND_JOBS ?? '').toLowerCase() === '1') {
            console.log('[Wallet] background jobs disabled by WALLET_DISABLE_BACKGROUND_JOBS');
            return;
        }
        this.holdExpiryJob.start(Number(process.env.HOLD_EXPIRY_INTERVAL_MS ?? 60_000));
        this.holdReconciliationJob.start();
    }

    public stopBackgroundJobs(): void {
        this.holdExpiryJob.stop();
        this.holdReconciliationJob.stop();
    }
    public readonly walletRepository: WalletRepository;
    public readonly transactionRepository: TransactionRepository;
    public readonly creditUseCase: CreditWalletUseCase;
    public readonly debitUseCase: DebitWalletUseCase;
    public readonly freezeUseCase: FreezeFundsUseCase;
    public readonly unfreezeUseCase: UnfreezeFundsUseCase;

    private constructor() {
        this.prisma = createPrismaClient();
        const walletRepository = new WalletRepository(this.prisma);
        const transactionRepository = new TransactionRepository(this.prisma);
        const idempotencyRepository = new IdempotencyRepository(this.prisma);
        const holdRepository = new HoldRepository(this.prisma);
        const auditLogRepository = new AuditLogRepository(this.prisma);

        const walletEngine = new WalletEngine();

        // Services
        const idempotencyService = new IdempotencyService(idempotencyRepository);
        const velocityCheckPolicy = new VelocityCheckPolicy(walletConfig.velocity);
        const velocityCheckService = new VelocityCheckService(velocityCheckPolicy, transactionRepository);
        this.eventBus = new EventBus(); // Unified with other services
        const eventPublisher = new WalletEventPublisher(this.eventBus);

        const paymentServiceClient = new PaymentServiceClient();

        // Use Cases
        const redisClient = createClient({ url: process.env.REDIS_URL });
        redisClient.on('error', (error) => {
            console.error('Redis client error (wallet-service):', error);
        });
        void redisClient.connect().catch((error) => {
            console.error('Failed to connect Redis client (wallet-service):', error);
        });
        const redisAdapter = {
            set: async (key: string, value: string, ...args: (string | number)[]) => {
                const result = await redisClient.set(key, value, { PX: args[1] as number, NX: true });
                return result;
            },
            del: async (key: string) => redisClient.del(key)
        };
        const redisLock = new RedisLock(redisAdapter, {
            retries: 8,
            retryDelayMs: 200,
            maxRetryDelayMs: 2000
        });

        const creditUseCase = new CreditWalletUseCase(
            walletRepository,
            transactionRepository,
            idempotencyService,
            eventPublisher,
            auditLogRepository,
            redisLock
        );

        const limitPolicy = new LimitPolicy(walletConfig.limits);

        const debitUseCase = new DebitWalletUseCase(
            walletRepository,
            transactionRepository,
            walletEngine,
            limitPolicy,
            velocityCheckService,
            idempotencyService,
            eventPublisher,
            auditLogRepository,
            redisLock
        );

        const freezeUseCase = new FreezeFundsUseCase(walletRepository, transactionRepository);
        const unfreezeUseCase = new UnfreezeFundsUseCase(walletRepository, transactionRepository);

        const placeHoldUseCase = new PlaceHoldUseCase(
            walletRepository,
            holdRepository,
            idempotencyService,
            eventPublisher
        );

        const releaseHoldUseCase = new ReleaseHoldUseCase(
            walletRepository,
            holdRepository,
            idempotencyService,
            eventPublisher
        );

        const captureHoldUseCase = new CaptureHoldUseCase(
            walletRepository,
            holdRepository,
            transactionRepository,
            idempotencyService,
            eventPublisher
        );

        const reverseTransactionUseCase = new ReverseTransactionUseCase(
            walletRepository,
            transactionRepository,
            idempotencyService,
            eventPublisher,
            auditLogRepository
        );

        const getStatementUseCase = new GetWalletStatementUseCase(transactionRepository);
        const expireHoldUseCase = new ExpireHoldUseCase(walletRepository, holdRepository, eventPublisher);
        const topUpUseCase = new TopUpWalletUseCase(paymentServiceClient, creditUseCase);

        const payoutServiceClient = new PayoutServiceClient();
        const initiatePayoutFromWalletUseCase = new InitiatePayoutFromWalletUseCase(
            debitUseCase,
            creditUseCase,
            payoutServiceClient,
            eventPublisher
        );

        // Event Handlers
        const eventIdempotency = new EventIdempotency(process.env.REDIS_URL!, this.prisma);
        const paymentCompletedHandler = new PaymentCompletedHandler(creditUseCase, eventIdempotency);
        this.eventBus.subscribe('Payment.Success.v1', {
            name: 'payment-completed-handler',
            handler: paymentCompletedHandler.handle.bind(paymentCompletedHandler)
        });

        const userRegisteredHandler = new UserRegisteredHandler(walletRepository, eventIdempotency);
        this.eventBus.subscribe('UserRegistered.v1', {
            name: 'wallet-user-registered-handler',
            handler: userRegisteredHandler.handle.bind(userRegisteredHandler)
        });

        // Jobs
        this.holdExpiryJob = new HoldExpiryJob(holdRepository, expireHoldUseCase);
        this.holdReconciliationJob = new HoldReconciliationJob(
            holdRepository,
            new OrderStateReader(this.prisma),
            releaseHoldUseCase,
            captureHoldUseCase,
            {
                batchSize: Number(process.env.HOLD_RECONCILIATION_BATCH_SIZE ?? 200),
                intervalMs: Number(process.env.HOLD_RECONCILIATION_INTERVAL_MS ?? 5 * 60_000),
            }
        );

        const outboxRepository = new OutboxRepository(this.prisma);
        this.outboxProcessor = new OutboxProcessor(outboxRepository, this.eventBus);

        const sagaLogRepository = provideSagaLogRepository(this.prisma);

        const walletTransactionSaga = new WalletTransactionSaga(
            sagaLogRepository,
            'wallet-service',
            creditUseCase,
            debitUseCase,
            placeHoldUseCase,
            releaseHoldUseCase,
            reverseTransactionUseCase,
            eventPublisher
        );
        SagaFactory.registerByType('WalletTransactionSaga', walletTransactionSaga as DistributedSagaOrchestrator);

        this.eventBus.subscribe('WalletTransaction.Command.v1', {
            name: 'wallet-transaction-saga',
            handler: async (envelope: EventEnvelope) => {
                const payload = envelope.data as WalletSagaPayload;
                const correlationId =
                    envelope.correlationId ?? getMetadataString(envelope.metadata, 'correlationId');
                await walletTransactionSaga.start(payload, correlationId);
            }
        });

        this.eventBus.subscribe('PaymentInitiated', {
            name: 'wallet-transaction-saga-payment',
            handler: async (envelope: EventEnvelope) => {
                const parsed = parsePaymentInitiated(envelope.data);
                if (!parsed) {
                    return;
                }

                const { paymentId, userId, amount, currency, method } = parsed;
                if (method !== 'WALLET') return;
                
                const sagaId = getMetadataString(envelope.metadata, 'sagaId') || envelope.correlationId;
                const payload: WalletSagaPayload = {
                    transactionId: paymentId,
                    userId,
                    amount,
                    currency,
                    type: 'DEBIT',
                    reason: `Payment debit for ${paymentId}`,
                    idempotencyKey: `payment_${paymentId}`,
                    correlationId: envelope.correlationId ?? getMetadataString(envelope.metadata, 'correlationId') ?? paymentId,
                    auditInfo: AuditInfo.create({
                        actor: 'payment-service',
                        actorType: ActorType.SYSTEM,
                        action: 'PAYMENT_DEBIT',
                        reason: `Payment debit for ${paymentId}`
                    }),
                    paymentSagaId: sagaId
                };
                await walletTransactionSaga.start(payload, payload.correlationId);
            }
        });

        const codSettlementSaga = new CODSettlementSaga(
            sagaLogRepository,
            'wallet-service',
            releaseHoldUseCase,
            captureHoldUseCase,
            creditUseCase,
            freezeUseCase
        );
        SagaFactory.registerByType('CODSettlementSaga', codSettlementSaga as DistributedSagaOrchestrator);

        this.eventBus.subscribe('SettleCODPayment', {
            name: 'cod-settlement-saga',
            handler: async (envelope: EventEnvelope) => {
                const parsed = parseCODSettlement(envelope.data);
                if (!parsed) {
                    return;
                }
                const { orderId, buyerId, sellerId, amount, currency, holdId, courierId } = parsed;
                const earning = await this.prisma.enabler_Earning.findUnique({
                    where: { orderId },
                    include: { enabler: { select: { userId: true } } }
                });
                const enablerAmount = earning && ['PENDING', 'ATTRIBUTED', 'QUALIFIED', 'AVAILABLE'].includes(String(earning.status))
                    ? Number(earning.amount)
                    : 0;
                const enablerUserId = enablerAmount > 0 ? earning?.enabler?.userId : undefined;
                if (enablerAmount > amount * 0.85) {
                    throw new Error(`Enabler commission exceeds seller proceeds for COD order ${orderId}`);
                }
                await codSettlementSaga.start({
                    orderId,
                    buyerId,
                    sellerId,
                    amount,
                    currency,
                    holdId,
                    deliveryStatus: 'SUCCESS',
                    sellerAmount: amount * 0.85,
                    courierId: courierId || 'system',
                    courierAmount: amount * 0.15,
                    ...(enablerUserId && enablerAmount > 0 ? {
                        enablerUserId,
                        enablerAmount,
                        enablerEarningId: earning!.id,
                    } : {}),
                }, envelope.correlationId ?? getMetadataString(envelope.metadata, 'correlationId') ?? orderId);
                if (earning && enablerUserId && enablerAmount > 0) {
                    const walletTransaction = await this.prisma.wallet_Transaction.findUnique({
                        where: { idempotencyKey: `enabler_commission_credit_${orderId}` },
                        select: { id: true },
                    });
                    await this.prisma.enabler_Earning.update({
                        where: { id: earning.id },
                        data: {
                            status: 'AVAILABLE',
                            qualifiedAt: new Date(),
                            availableAt: new Date(),
                            walletTransactionId: walletTransaction?.id ?? undefined,
                        }
                    });
                }
            }
        });

        // Digital orders use the same order-delivery qualification point. COD
        // is settled by the saga above so its seller and enabler shares remain
        // part of one idempotent payout workflow.
        this.eventBus.subscribe('OrderDelivered', {
            name: 'enabler-commission-wallet-credit',
            handler: async (envelope: EventEnvelope) => {
                const payload = asRecord(envelope.data);
                const orderId = getString(payload.orderId);
                if (!orderId) return;
                const order = await this.prisma.order_Order.findUnique({
                    where: { id: orderId },
                    select: { paymentMethod: true, sellerId: true, totalAmount: true, currency: true, enablerEarnings: { select: { id: true, enablerId: true, amount: true, currency: true, status: true, enabler: { select: { userId: true } } } } }
                });
                if (!order || String(order.paymentMethod).toUpperCase() === 'COD') return;
                const earning = order.enablerEarnings?.[0];
                if (!earning || !['PENDING', 'ATTRIBUTED', 'QUALIFIED'].includes(String(earning.status))) return;
                const amount = Number(earning.amount);
                if (!(amount > 0)) return;
                const correlationId = envelope.correlationId ?? getMetadataString(envelope.metadata, 'correlationId') ?? orderId;
                const paymentMethod = String(order.paymentMethod).toUpperCase();
                // Seller-verification orders can be paid outside Maysar escrow;
                // their earning remains pending until a funded settlement event.
                if (paymentMethod === 'SELLER_VERIFICATION') return;
                const gross = Number(order.totalAmount);
                const providerFeeRate = paymentMethod === 'CARD' ? 0.029
                    : ['MOBILE_MONEY', 'MPESA', 'AIRTEL_MONEY', 'TIGO_PESA', 'HALOPESA'].includes(paymentMethod) ? 0.015
                    : paymentMethod === 'BANK_TRANSFER' ? 0.01
                    : paymentMethod === 'WALLET' ? 0
                    : 0.02;
                const platformFee = Math.round(gross * 0.02 * 100) / 100;
                const providerFee = Math.round(gross * providerFeeRate * 100) / 100;
                const sellerProceedsBeforeEnabler = Math.round((gross - platformFee - providerFee) * 100) / 100;
                if (amount > sellerProceedsBeforeEnabler) throw new Error(`Enabler commission exceeds seller proceeds for order ${orderId}`);
                const sellerNet = Math.round((sellerProceedsBeforeEnabler - amount) * 100) / 100;
                const sellerCredit = await creditUseCase.execute({
                    userId: order.sellerId,
                    amount: sellerNet,
                    currency: order.currency,
                    description: `Sale proceeds after enabler commission - Order ${orderId}`,
                    referenceType: 'order_sale_settlement',
                    referenceId: orderId,
                    idempotencyKey: `seller_sale_credit_${orderId}`,
                    correlationId,
                    metadata: { orderId, enablerEarningId: earning.id, gross, platformFee, providerFee, enablerCommission: amount },
                    auditInfo: AuditInfo.create({
                        actor: 'wallet-service',
                        actorType: ActorType.SYSTEM,
                        action: 'SELLER_SALE_CREDIT',
                        reason: `Sale proceeds after enabler commission for order ${orderId}`,
                        metadata: { orderId, enablerEarningId: earning.id }
                    })
                });
                if (!sellerCredit.success) throw new Error(`Seller wallet credit failed for order ${orderId}`);
                const result = await creditUseCase.execute({
                    userId: earning.enabler.userId,
                    amount,
                    currency: earning.currency,
                    description: `Enabler commission - Order ${orderId}`,
                    referenceType: 'enabler_commission',
                    referenceId: earning.id,
                    idempotencyKey: `enabler_commission_credit_${orderId}`,
                    correlationId,
                    metadata: { orderId, earningId: earning.id },
                    auditInfo: AuditInfo.create({
                        actor: 'wallet-service',
                        actorType: ActorType.SYSTEM,
                        action: 'ENABLER_COMMISSION_CREDIT',
                        reason: `Enabler commission for delivered order ${orderId}`,
                        metadata: { orderId, earningId: earning.id }
                    })
                });
                if (!result.success || !result.transactionId) throw new Error(`Wallet credit failed for enabler earning ${earning.id}`);
                await this.prisma.enabler_Earning.update({
                    where: { id: earning.id },
                    data: { status: 'AVAILABLE', qualifiedAt: new Date(), availableAt: new Date(), walletTransactionId: result.transactionId }
                });
            }
        });

        this.walletController = new WalletController(
            creditUseCase,
            debitUseCase,
            freezeUseCase,
            unfreezeUseCase,
            placeHoldUseCase,
            releaseHoldUseCase,
            captureHoldUseCase,
            reverseTransactionUseCase,
            getStatementUseCase,
            topUpUseCase,
            walletRepository,
            initiatePayoutFromWalletUseCase,
            holdRepository,
            payoutServiceClient
        );

        this.walletRepository = walletRepository;
        this.transactionRepository = transactionRepository;
        this.creditUseCase = creditUseCase;
        this.debitUseCase = debitUseCase;
        this.freezeUseCase = freezeUseCase;
        this.unfreezeUseCase = unfreezeUseCase;
    }

    public static getInstance(): Container {
        if (!Container.instance) {
            Container.instance = new Container();
        }
        return Container.instance;
    }
}
