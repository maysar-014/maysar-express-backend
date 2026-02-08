import { PrismaClient } from '@prisma/client';
import { PayoutRepository } from './infrastructure/repositories/payout.repository';
import { PayoutController } from './api/controllers/payout.controller';
import { InitiatePayoutUseCase } from './application/use-cases/initiate-payout.use-case';
import { CompletePayoutUseCase } from './application/use-cases/complete-payout.use-case';
import { CancelPayoutUseCase } from './application/use-cases/cancel-payout.use-case';
import { PayoutPolicy } from './domain/policies/payout.policy';
import { OutboxRepository } from './infrastructure/messaging/outbox.repository';
import { inMemoryEventBus } from '@shared-events/in-memory-event-bus';
import { OutboxProcessor } from './infrastructure/messaging/outbox-processor';
import { IEventBus } from './infrastructure/messaging/event-bus.interface';
import { provideSagaLogRepository } from './infrastructure/repositories/saga.repository';
import { PayoutProcessingSaga } from './application/sagas/payout-processing.saga';
import { WalletServiceClient } from '../../payment-service/src/infrastructure/clients/wallet-service.client';

export class Container {
    private static instance: Container;
    public readonly prisma: PrismaClient;
    public readonly payoutController: PayoutController;
    public readonly eventBus: IEventBus;
    public readonly outboxProcessor: OutboxProcessor;
    public readonly payoutProcessingSaga: PayoutProcessingSaga;

    private constructor() {
        this.prisma = new PrismaClient();
        const payoutRepository = new PayoutRepository(this.prisma);
        const payoutPolicy = new PayoutPolicy();

        const outboxRepository = new OutboxRepository(this.prisma);
        this.eventBus = inMemoryEventBus;
        this.outboxProcessor = new OutboxProcessor(outboxRepository, this.eventBus);

        const sagaLogRepository = provideSagaLogRepository(this.prisma);

        const walletServiceClient = new WalletServiceClient(process.env.WALLET_SERVICE_URL || 'http://localhost:3002');
        const payoutProviderFactory = { getProvider: (method: string) => ({ initiateTransfer: async () => ({ success: true }) }) }; // Mock provider factory

        this.payoutProcessingSaga = new PayoutProcessingSaga(
            sagaLogRepository,
            'payout-service',
            walletServiceClient,
            payoutRepository,
            payoutProviderFactory
        );

        const initiateUseCase = new InitiatePayoutUseCase(payoutRepository, payoutPolicy, this.payoutProcessingSaga);
        const completeUseCase = new CompletePayoutUseCase(payoutRepository);
        const cancelUseCase = new CancelPayoutUseCase(payoutRepository);

        this.payoutController = new PayoutController(
            initiateUseCase,
            completeUseCase,
            cancelUseCase,
            payoutRepository
        );
    }

    public static getInstance(): Container {
        if (!Container.instance) {
            Container.instance = new Container();
        }
        return Container.instance;
    }
}
