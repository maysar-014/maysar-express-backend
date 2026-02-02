import { PrismaClient } from '@prisma/client';
import { WalletRepository } from './infrastructure/repositories/wallet.repository';
import { TransactionRepository } from './infrastructure/repositories/transaction.repository';
import { WalletController } from './api/controllers/wallet.controller';
import { CreditWalletUseCase } from './application/use-cases/credit-wallet.use-case';
import { DebitWalletUseCase } from './application/use-cases/debit-wallet.use-case';
import { FreezeFundsUseCase } from './application/use-cases/freeze-funds.use-case';
import { UnfreezeFundsUseCase } from './application/use-cases/unfreeze-funds.use-case';
import { WalletEngine } from './domain/engines/wallet.engine';
import { OutboxRepository } from './infrastructure/messaging/outbox.repository';
import { RabbitMQEventBus } from './infrastructure/messaging/rabbitmq.event-bus';
import { OutboxProcessor } from './infrastructure/messaging/outbox-processor';
import { IEventBus } from './infrastructure/messaging/event-bus.interface';

export class Container {
    private static instance: Container;
    public readonly prisma: PrismaClient;
    public readonly walletController: WalletController;
    public readonly eventBus: IEventBus;
    public readonly outboxProcessor: OutboxProcessor;

    private constructor() {
        this.prisma = new PrismaClient();
        const walletRepository = new WalletRepository(this.prisma);
        const transactionRepository = new TransactionRepository(this.prisma);
        const walletEngine = new WalletEngine();

        const creditUseCase = new CreditWalletUseCase(walletRepository, transactionRepository);
        const debitUseCase = new DebitWalletUseCase(walletRepository, transactionRepository, walletEngine);
        const freezeUseCase = new FreezeFundsUseCase(walletRepository, transactionRepository);
        const unfreezeUseCase = new UnfreezeFundsUseCase(walletRepository, transactionRepository);

        const outboxRepository = new OutboxRepository(this.prisma);
        this.eventBus = new RabbitMQEventBus(); // Defaulting to RabbitMQ based on availability
        this.outboxProcessor = new OutboxProcessor(outboxRepository, this.eventBus);

        this.walletController = new WalletController(
            creditUseCase,
            debitUseCase,
            freezeUseCase,
            unfreezeUseCase,
            walletRepository
        );
    }

    public static getInstance(): Container {
        if (!Container.instance) {
            Container.instance = new Container();
        }
        return Container.instance;
    }
}
