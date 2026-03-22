import { PrismaClient } from '@prisma/client';
import { PaymentRepository } from './infrastructure/repositories/payment.repository';
import { IRefundRepository } from './domain/repositories/refund.repository';
import { IFraudRepository } from './domain/repositories/fraud.repository';
import { RefundRepository } from './infrastructure/repositories/refund.repository';
import { FraudRepository } from './infrastructure/repositories/fraud.repository';
import { attachRedisErrorHandlers, getSharedRedisClient, resolveRedisUrl } from '@shared/redis/ioredis-client';
import { createPrismaClient } from '@shared/database/prisma-client';

import { PesapalAdapter } from './infrastructure/providers/pesapal.adapter';
import { ProcessPaymentUseCase } from './application/use-cases/process-payment.use-case';
import { RefundPaymentUseCase } from './application/use-cases/refund-payment.use-case';
import { CheckPaymentStatusUseCase } from './application/use-cases/check-payment-status.use-case';
import { PaymentProcessingEngine } from './domain/engines/payment-processing.engine';
import { FraudEngine } from './domain/engines/fraud.engine';
import { PaymentLimitsPolicy } from './domain/policies/payment-limits.policy';
import { FraudPreventionPolicy } from './domain/policies/fraud-prevention.policy';
import { RefundPolicy } from './domain/policies/refund.policy';
import { PaymentController } from './api/controllers/payment.controller';
import { WebhookController } from './api/controllers/webhook.controller';
import { HandlePesapalWebhookUseCase } from './application/use-cases/handle-pesapal-webhook.use-case';
import { EventBus } from '@shared-events/eventBus';
import { IEventBus } from './infrastructure/messaging/event-bus.interface';
import { OutboxRepository } from './infrastructure/messaging/outbox.repository';
import { OutboxProcessor } from './infrastructure/messaging/outbox-processor';
import { WebhookEventRepository } from './infrastructure/repositories/webhook-event.repository';

import { WalletServiceClient } from './infrastructure/clients/wallet-service.client';
import { SagaEventHandler } from './api/sagas/saga.event-handler';
import { PaymentProcessingSaga } from './application/sagas/payment-processing.saga';
import { PaymentProvider } from './domain/entities/payment.entity';
import { IPaymentProvider } from './domain/repositories/payment-provider.gateway';
import { PaymentEventHandlers } from './infrastructure/events/payment.event-handlers';
import { PrismaSagaLogRepository } from '../../../shared/saga/saga-log.repository';
import { ISagaLogRepository } from '../../../shared/saga/saga.log';
import { EventIdempotency } from '@shared/middleware/idempotency';
import { SagaFactory } from '@shared/saga/saga-factory';


export class Container {
    private static instance: Container;

    public prisma: PrismaClient;
    public redisClient?: ReturnType<typeof getSharedRedisClient>;

    // Repositories
    public paymentRepository: PaymentRepository;
    public refundRepository: IRefundRepository;
    public fraudRepository: IFraudRepository;
    public outboxRepository: OutboxRepository;
    public webhookEventRepository: WebhookEventRepository;
    public sagaLogRepository: ISagaLogRepository;

    // Clients
    public walletServiceClient: WalletServiceClient;

    // Messaging
    public eventBus: IEventBus;

    // Outbox
    public outboxProcessor: OutboxProcessor;

    // Saga
    public paymentProcessingSaga: PaymentProcessingSaga;
    public sagaEventHandler: SagaEventHandler;
    public paymentEventHandlers: PaymentEventHandlers;

    // Providers
    public pesapalAdapter: PesapalAdapter;

    // Engines
    public paymentProcessingEngine: PaymentProcessingEngine;
    public fraudEngine: FraudEngine;

    // Policies
    public paymentLimitsPolicy: PaymentLimitsPolicy;
    public fraudPreventionPolicy: FraudPreventionPolicy;
    public refundPolicy: RefundPolicy;

    // Use Cases
    public processPaymentUseCase: ProcessPaymentUseCase;
    public refundPaymentUseCase: RefundPaymentUseCase;
    public checkPaymentStatusUseCase: CheckPaymentStatusUseCase;
    public handlePesapalWebhookUseCase: HandlePesapalWebhookUseCase;

    // Controllers
    public paymentController: PaymentController;
    public webhookController: WebhookController;

    private constructor() {
        this.prisma = createPrismaClient();

        // Redis client (optional)
        if (process.env.REDIS_URL) {
            this.redisClient = getSharedRedisClient(resolveRedisUrl(process.env.REDIS_URL));
            attachRedisErrorHandlers(this.redisClient, 'payment-service');
        }

        // Repositories
        this.paymentRepository = new PaymentRepository(this.prisma as any);
        this.refundRepository = new RefundRepository(this.prisma);
        this.fraudRepository = new FraudRepository(this.prisma as any);
        this.outboxRepository = new OutboxRepository(this.prisma);
        this.webhookEventRepository = new WebhookEventRepository(this.prisma);

        // Messaging - MUST be assigned before OutboxProcessor construction
        this.eventBus = new EventBus();
        this.outboxProcessor = new OutboxProcessor(this.outboxRepository, this.eventBus);

        // Helper casting
        // but ours is specific. Usually works if models match.
        this.sagaLogRepository = new PrismaSagaLogRepository(this.prisma as any);

        // Clients
        this.walletServiceClient = new WalletServiceClient();

        // Providers
        this.pesapalAdapter = new PesapalAdapter();

        // Engines
        this.paymentProcessingEngine = new PaymentProcessingEngine();
        this.fraudEngine = new FraudEngine(this.fraudRepository);

        // Policies
        this.paymentLimitsPolicy = new PaymentLimitsPolicy();
        this.fraudPreventionPolicy = new FraudPreventionPolicy();
        this.refundPolicy = new RefundPolicy();

        // Provider Factory
        const paymentProviderFactory = (provider: PaymentProvider): IPaymentProvider => {
            // For now, return Pesapal adapter for everything or throw error
            if (provider === PaymentProvider.PESAPAL) return this.pesapalAdapter;
            // In a real scenario, you'd switch based on provider type
            return this.pesapalAdapter;
        };

        // Use Cases
        this.processPaymentUseCase = new ProcessPaymentUseCase(
            this.paymentRepository,
            paymentProviderFactory,
            this.fraudEngine,
            this.paymentProcessingEngine,
            this.paymentLimitsPolicy,
            this.fraudPreventionPolicy
        );

        this.checkPaymentStatusUseCase = new CheckPaymentStatusUseCase(
            this.paymentRepository,
            paymentProviderFactory
        );

        this.refundPaymentUseCase = new RefundPaymentUseCase(
            this.paymentRepository,
            this.refundRepository,
            this.refundPolicy
        );

        this.handlePesapalWebhookUseCase = new HandlePesapalWebhookUseCase(
            this.paymentRepository,
            this.pesapalAdapter,
            this.eventBus,
            this.webhookEventRepository
        );

        // Controllers
        this.paymentController = new PaymentController(
            this.processPaymentUseCase,
            this.checkPaymentStatusUseCase,
            this.refundPaymentUseCase,
            this.handlePesapalWebhookUseCase,
            this.pesapalAdapter
        );

        this.webhookController = new WebhookController(
            this.pesapalAdapter,
            this.handlePesapalWebhookUseCase
        );

        // Sagas
        const eventIdempotency = new EventIdempotency(process.env.REDIS_URL!, this.prisma);
        this.paymentProcessingSaga = new PaymentProcessingSaga(
            this.sagaLogRepository,
            'payment-service',
            this.paymentRepository,
            paymentProviderFactory,
            this.fraudEngine,
            this.paymentProcessingEngine,
            this.outboxRepository,
            eventIdempotency
        );
        SagaFactory.registerByType('PaymentProcessingSaga', this.paymentProcessingSaga as any);

        this.sagaEventHandler = new SagaEventHandler(
            this.paymentProcessingSaga,
            this.eventBus
        );

        this.paymentEventHandlers = new PaymentEventHandlers(
            this.paymentRepository
        );
    }

    public static getInstance(): Container {
        if (!Container.instance) {
            Container.instance = new Container();
        }
        return Container.instance;
    }
}
