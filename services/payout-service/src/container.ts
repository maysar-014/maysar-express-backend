import { PrismaClient } from '@prisma/client';
import { PayoutRepository } from './infrastructure/repositories/payout.repository';
import { PiiEncryptionService } from '../../../shared/encryption/pii-encryption.service';
import { PayoutController } from './api/controllers/payout.controller';
import { InitiatePayoutUseCase } from './application/use-cases/initiate-payout.use-case';
import { CompletePayoutUseCase } from './application/use-cases/complete-payout.use-case';
import { CancelPayoutUseCase } from './application/use-cases/cancel-payout.use-case';
import { PayoutPolicy } from './domain/policies/payout.policy';
import { OutboxRepository } from './infrastructure/messaging/outbox.repository';
import { EventBus } from '@shared-events/eventBus';
import { OutboxProcessor } from './infrastructure/messaging/outbox-processor';
import { IEventBus } from './infrastructure/messaging/event-bus.interface';
import { provideSagaLogRepository } from './infrastructure/repositories/saga.repository';
import { PayoutProcessingSaga } from './application/sagas/payout-processing.saga';
import { WalletServiceClient } from '../../payment-service/src/infrastructure/clients/wallet-service.client';
import { createPrismaClient } from '@shared/database/prisma-client';

export class Container {
    private static instance: Container;
    public readonly prisma: PrismaClient;
    public readonly payoutController: PayoutController;
    public readonly eventBus: IEventBus;
    public readonly outboxProcessor: OutboxProcessor;
    public readonly payoutProcessingSaga: PayoutProcessingSaga;
    public readonly payoutRepository: PayoutRepository;
    public readonly initiatePayoutUseCase: InitiatePayoutUseCase;
    public readonly completePayoutUseCase: CompletePayoutUseCase;
    public readonly cancelPayoutUseCase: CancelPayoutUseCase;

    private constructor() {
        this.prisma = createPrismaClient();
        const piiEncryptionService = new PiiEncryptionService();
        const payoutRepository = new PayoutRepository(this.prisma, piiEncryptionService);
        const payoutPolicy = new PayoutPolicy();

        const outboxRepository = new OutboxRepository(this.prisma);
        this.eventBus = new EventBus();
        this.outboxProcessor = new OutboxProcessor(outboxRepository, this.eventBus);

        const sagaLogRepository = provideSagaLogRepository(this.prisma);

        const walletServiceClient = new WalletServiceClient();
        const payoutProviderFactory = {
            getProvider: (method: string) => {
                throw new Error(`Payout provider not configured for method "${method}"`);
            }
        };

        this.payoutProcessingSaga = new PayoutProcessingSaga(
            sagaLogRepository,
            'payout-service',
            walletServiceClient,
            payoutRepository,
            payoutProviderFactory
        );

        // Register saga in SagaFactory
        const { SagaFactory } = require('@shared/saga/saga-factory');
        SagaFactory.registerByType('PayoutProcessingSaga', this.payoutProcessingSaga);

        const initiateUseCase = new InitiatePayoutUseCase(payoutRepository, payoutPolicy, this.payoutProcessingSaga);
        const completeUseCase = new CompletePayoutUseCase(payoutRepository);
        const cancelUseCase = new CancelPayoutUseCase(payoutRepository);

        this.payoutController = new PayoutController(
            initiateUseCase,
            completeUseCase,
            cancelUseCase,
            payoutRepository
        );

        this.payoutRepository = payoutRepository;
        this.initiatePayoutUseCase = initiateUseCase;
        this.completePayoutUseCase = completeUseCase;
        this.cancelPayoutUseCase = cancelUseCase;
    }

    public static getInstance(): Container {
        if (!Container.instance) {
            Container.instance = new Container();
        }
        return Container.instance;
    }
}
