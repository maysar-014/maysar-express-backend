/**
 * Dependency Injection Container
 * Wires up all layers: Repositories -> Use Cases -> Controllers
 */

import { PrismaClient } from '@prisma/client';
import { PaymentRepository } from './infrastructure/repositories/payment.repository';
import { RefundRepository } from './infrastructure/repositories/refund.repository';
import { FraudRepository } from './infrastructure/repositories/fraud.repository';

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
import { KafkaEventBus } from './infrastructure/messaging/kafka.event-bus';
import { OutboxRepository } from './infrastructure/messaging/outbox.repository';
import { WalletServiceClient } from './infrastructure/clients/wallet-service.client';
import { SagaEventHandler } from './api/sagas/saga.event-handler';
import { PaymentProcessingSaga } from './application/sagas/payment-processing.saga';
import { PaymentProvider } from './domain/entities/payment.entity';
import { IPaymentProvider } from './domain/ports/payment-provider.port';
import { IFraudRepository } from './domain/ports/fraud.repository.port';
import { ITransactionRepository } from './domain/ports/transaction.repository.port';
import { IPayoutRepository } from './domain/ports/payout.repository.port';
import { IRefundRepository } from './domain/ports/refund.repository.port';

export class Container {
    private static instance: Container;

    public prisma: PrismaClient;

    // Repositories
    public paymentRepository: PaymentRepository;
    public refundRepository: IRefundRepository;
    public fraudRepository: IFraudRepository;
    public outboxRepository: OutboxRepository;

    // Clients
    public walletServiceClient: WalletServiceClient;

    // Messaging
    public eventBus: KafkaEventBus;

    // Saga
    public paymentProcessingSaga: PaymentProcessingSaga;
    public sagaEventHandler: SagaEventHandler;

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

    // Controllers
    public paymentController: PaymentController;

    private constructor() {
        this.prisma = new PrismaClient();

        // Repositories
        this.paymentRepository = new PaymentRepository(this.prisma);
        this.refundRepository = new RefundRepository(this.prisma);
        this.fraudRepository = new FraudRepository(this.prisma);
        this.outboxRepository = new OutboxRepository(this.prisma);

        // Clients
        this.walletServiceClient = new WalletServiceClient(process.env.WALLET_SERVICE_URL || 'http://wallet-service:3002');

        // Messaging
        this.eventBus = new KafkaEventBus();

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

        // Controllers
        this.paymentController = new PaymentController(
            this.processPaymentUseCase,
            this.checkPaymentStatusUseCase,
            this.refundPaymentUseCase
        );

        // Sagas
        this.paymentProcessingSaga = new PaymentProcessingSaga(
            this.paymentRepository,
            paymentProviderFactory,
            this.fraudEngine,
            this.paymentProcessingEngine,
            this.eventBus
        );

        this.sagaEventHandler = new SagaEventHandler(
            this.paymentProcessingSaga,
            this.eventBus
        );
    }

    public static getInstance(): Container {
        if (!Container.instance) {
            Container.instance = new Container();
        }
        return Container.instance;
    }
}
