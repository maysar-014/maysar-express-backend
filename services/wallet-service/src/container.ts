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
import { inMemoryEventBus } from '@shared-events/eventBus';
import { OutboxProcessor } from './infrastructure/messaging/outbox-processor';
import { IEventBus } from './infrastructure/messaging/event-bus.interface';
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
import { WalletEventPublisher } from './infrastructure/messaging/wallet-event-publisher';
import { walletConfig } from './config/wallet.config';
import { NotificationAdapter } from './infrastructure/adapters/notification.adapter';
import { PaymentServiceClient } from './infrastructure/clients/payment-service.client';
import { TopUpWalletUseCase } from './application/use-cases/top-up-wallet.use-case';
import { PaymentCompletedHandler } from './infrastructure/messaging/payment-completed.handler';
import { EventIdempotency } from '@shared/middleware/idempotency';
import { PayoutServiceClient } from './infrastructure/clients/payout-service.client';
import { InitiatePayoutFromWalletUseCase } from './application/use-cases/initiate-payout-from-wallet.use-case';
import { provideSagaLogRepository } from './infrastructure/repositories/saga.repository';
import { WalletTransactionSaga } from './application/sagas/wallet-transaction.saga';
import { CODSettlementSaga } from './application/sagas/cod-settlement.saga';
import { SagaFactory } from '@shared/saga/saga-factory';

export class Container {
    private static instance: Container;
    public readonly prisma: PrismaClient;
    public readonly walletController: WalletController;
    public readonly eventBus: IEventBus;
    public readonly outboxProcessor: OutboxProcessor;
    public readonly holdExpiryJob: HoldExpiryJob;

    private constructor() {
        this.prisma = new PrismaClient();
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
        this.eventBus = inMemoryEventBus; // Unified with other services
        const eventPublisher = new WalletEventPublisher(this.eventBus);
        const notificationAdapter = new NotificationAdapter();

        const paymentServiceClient = new PaymentServiceClient(process.env.PAYMENT_SERVICE_URL || 'http://payment-service:3003');

        // Use Cases
        const creditUseCase = new CreditWalletUseCase(
            walletRepository,
            transactionRepository,
            idempotencyService,
            eventPublisher,
            auditLogRepository
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
            auditLogRepository
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
        const topUpUseCase = new TopUpWalletUseCase(paymentServiceClient);

        const payoutServiceClient = new PayoutServiceClient(process.env.PAYOUT_SERVICE_URL || 'http://payout-service:3005');
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

        // Jobs
        this.holdExpiryJob = new HoldExpiryJob(holdRepository, expireHoldUseCase);

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
        SagaFactory.registerByType('WalletTransactionSaga', walletTransactionSaga);

        this.eventBus.subscribe('WalletTransaction.Command.v1', {
            name: 'wallet-transaction-saga',
            handler: async (envelope) => {
                await walletTransactionSaga.start(envelope.data, envelope.correlationId ?? envelope.metadata?.correlationId);
            }
        });

        this.eventBus.subscribe('PaymentInitiated', {
            name: 'wallet-transaction-saga-payment',
            handler: async (envelope) => {
                const { paymentId, userId, amount, currency, method } = envelope.data;
                if (method !== 'WALLET') return;
                
                const sagaId = envelope.metadata?.sagaId || envelope.correlationId;
                const payload: any = {
                    transactionId: paymentId,
                    userId,
                    amount,
                    currency,
                    type: 'DEBIT',
                    reason: `Payment debit for ${paymentId}`,
                    idempotencyKey: `payment_${paymentId}`,
                    correlationId: envelope.correlationId ?? envelope.metadata?.correlationId ?? paymentId,
                    auditInfo: { actor: 'payment-service', actorType: 'SYSTEM', action: 'PAYMENT_DEBIT', timestamp: new Date() },
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
        SagaFactory.registerByType('CODSettlementSaga', codSettlementSaga);

        this.eventBus.subscribe('SettleCODPayment', {
            name: 'cod-settlement-saga',
            handler: async (envelope) => {
                const { orderId, buyerId, sellerId, amount, currency, holdId } = envelope.data;
                await codSettlementSaga.start({
                    orderId,
                    buyerId,
                    sellerId,
                    amount,
                    currency,
                    holdId,
                    deliveryStatus: 'SUCCESS',
                    sellerAmount: amount * 0.85,
                    courierId: envelope.data.courierId || 'system',
                    courierAmount: amount * 0.15
                }, envelope.correlationId ?? envelope.metadata?.correlationId ?? orderId);
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
            initiatePayoutFromWalletUseCase
        );
    }

    public static getInstance(): Container {
        if (!Container.instance) {
            Container.instance = new Container();
        }
        return Container.instance;
    }
}
