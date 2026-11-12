import { PrismaClient } from "@prisma/client";
import { PaymentRepository } from "./infrastructure/repositories/payment.repository";
import { IRefundRepository } from "./domain/repositories/refund.repository";
import { IFraudRepository } from "./domain/repositories/fraud.repository";
import { RefundRepository } from "./infrastructure/repositories/refund.repository";
import { FraudRepository } from "./infrastructure/repositories/fraud.repository";
import {
  attachRedisErrorHandlers,
  getSharedRedisClient,
  resolveRedisUrl,
} from "@shared/redis/ioredis-client";
import { createPrismaClient } from "@shared/database/prisma-client";

import { SelcomPesaAdapter } from "./infrastructure/providers/selcom-pesa.adapter";
import { InternalWalletAdapter } from "./infrastructure/providers/internal-wallet.adapter";
import { InternalBankTransferAdapter } from "./infrastructure/providers/internal-bank-transfer.adapter";
import { PaymentMethodProviderRegistry } from "./infrastructure/providers/payment-provider.registry";
import {
  SandboxLedger,
  SandboxSimulatorAdapter,
  SandboxAwareProviderRouter,
} from "./infrastructure/providers/sandbox-simulation";
import type { WebhookPayload } from "./domain/repositories/payment-provider.gateway";
import {
  getPaymentMethodConfigService,
  PaymentMethodConfigService,
} from "./config/payment-methods.config";
import { PaymentMethodsController } from "./api/controllers/payment-methods.controller";
import { HandlePaymentWebhookUseCase } from "./application/use-cases/handle-payment-webhook.use-case";
import { ProcessPaymentUseCase } from "./application/use-cases/process-payment.use-case";
import { RefundPaymentUseCase } from "./application/use-cases/refund-payment.use-case";
import { CheckPaymentStatusUseCase } from "./application/use-cases/check-payment-status.use-case";
import { BlockTransactionUseCase } from "./application/use-cases/block-transaction.use-case";
import { FlagTransactionUseCase } from "./application/use-cases/flag-transaction.use-case";
import { PaymentProcessingEngine } from "./domain/engines/payment-processing.engine";
import { FraudEngine } from "./domain/engines/fraud.engine";
import { PaymentLimitsPolicy } from "./domain/policies/payment-limits.policy";
import { FraudPreventionPolicy } from "./domain/policies/fraud-prevention.policy";
import { RefundPolicy } from "./domain/policies/refund.policy";
import { PaymentController } from "./api/controllers/payment.controller";
import { PaymentAdminController } from "./api/controllers/payment-admin.controller";
import { WebhookController } from "./api/controllers/webhook.controller";
import { eventBus as sharedEventBus } from "@shared-events/eventBus";
import { IEventBus } from "./infrastructure/messaging/event-bus.interface";
import { OutboxRepository } from "./infrastructure/messaging/outbox.repository";
import { OutboxProcessor } from "./infrastructure/messaging/outbox-processor";
import { WebhookEventRepository } from "./infrastructure/repositories/webhook-event.repository";

import { WalletServiceClient } from "./infrastructure/clients/wallet-service.client";
import { SagaEventHandler } from "./api/sagas/saga.event-handler";
import { PaymentProcessingSaga } from "./application/sagas/payment-processing.saga";
import { PaymentProvider } from "./domain/entities/payment.entity";
import { IPaymentProvider } from "./domain/repositories/payment-provider.gateway";
import { PaymentEventHandlers } from "./infrastructure/events/payment.event-handlers";
import { PrismaSagaLogRepository } from "../../../shared/saga/saga-log.repository";
import { ISagaLogRepository } from "../../../shared/saga/saga.log";
import { EventIdempotency } from "@shared/middleware/idempotency";
import { SagaFactory } from "@shared/saga/saga-factory";

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
  public paymentGateway: SelcomPesaAdapter;
  public paymentMethodConfigService: PaymentMethodConfigService;
  public paymentMethodProviderRegistry: PaymentMethodProviderRegistry;
  public internalWalletAdapter: InternalWalletAdapter;
  public internalBankTransferAdapter: InternalBankTransferAdapter;
  public sandboxLedger: SandboxLedger;
  public sandboxAwareRouter: SandboxAwareProviderRouter;
  public handlePaymentWebhookUseCase: HandlePaymentWebhookUseCase;
  public paymentMethodsController: PaymentMethodsController;

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
  public blockTransactionUseCase: BlockTransactionUseCase;
  public flagTransactionUseCase: FlagTransactionUseCase;
  // Controllers
  public paymentController: PaymentController;
  public paymentAdminController: PaymentAdminController;
  public webhookController: WebhookController;

  private constructor() {
    this.prisma = createPrismaClient();

    // Redis client (optional)
    if (process.env.REDIS_URL) {
      this.redisClient = getSharedRedisClient(
        resolveRedisUrl(process.env.REDIS_URL),
      );
      attachRedisErrorHandlers(this.redisClient, "payment-service");
    }

    // Repositories
    this.paymentRepository = new PaymentRepository(this.prisma as any);
    this.refundRepository = new RefundRepository(this.prisma);
    this.fraudRepository = new FraudRepository(this.prisma as any);
    this.outboxRepository = new OutboxRepository(this.prisma);
    this.webhookEventRepository = new WebhookEventRepository(this.prisma);

    // Messaging - MUST be assigned before OutboxProcessor construction.
    // Use the shared in-process bus singleton (the monolith's event fabric) so
    // payment events — webhook completions/failures above all — are observable
    // by other modules (e.g. analytics). Previously this was a private
    // `new EventBus()` instance whose events nobody outside this container
    // could ever receive. Payment's own handlers (PaymentEventHandlers) already
    // subscribe on this same shared singleton.
    this.eventBus = sharedEventBus;
    this.outboxProcessor = new OutboxProcessor(
      this.outboxRepository,
      this.eventBus,
    );

    // Helper casting
    // but ours is specific. Usually works if models match.
    this.sagaLogRepository = new PrismaSagaLogRepository(this.prisma as any);

    // Clients
    this.walletServiceClient = new WalletServiceClient();

    // Providers
    this.paymentGateway = new SelcomPesaAdapter();
    this.paymentMethodConfigService = getPaymentMethodConfigService();
    this.internalWalletAdapter = new InternalWalletAdapter(
      this.walletServiceClient,
    );
    this.internalBankTransferAdapter = new InternalBankTransferAdapter();

    // Sandbox simulation — shared ledger so simulated transactions are
    // verifiable across the whole service (webhooks, status polling).
    this.sandboxLedger = new SandboxLedger();
    const dispatchSandboxWebhook = (payload: WebhookPayload): Promise<void> =>
      this.handlePaymentWebhookUseCase.execute(
        payload.providerReference,
        (payload.metadata?.transactionId as string) ?? "",
        payload.status,
        payload,
      ).then(() => undefined);

    this.paymentMethodProviderRegistry = new PaymentMethodProviderRegistry(
      this.paymentMethodConfigService,
      this.internalWalletAdapter,
      this.internalBankTransferAdapter,
      (methodCode, channel) =>
        new SandboxSimulatorAdapter({
          channel,
          methodCode,
          ledger: this.sandboxLedger,
          dispatchWebhook: dispatchSandboxWebhook,
        }),
    );

    // Sandbox-aware router: webhook/status traffic for `sbx_*` references is
    // verified against the simulation ledger; everything else goes to the
    // real provider gateway (live path untouched).
    this.sandboxAwareRouter = new SandboxAwareProviderRouter(
      this.sandboxLedger,
      this.paymentGateway,
    );

    // Engines
    this.paymentProcessingEngine = new PaymentProcessingEngine();
    this.fraudEngine = new FraudEngine(this.fraudRepository);

    // Policies
    this.paymentLimitsPolicy = new PaymentLimitsPolicy();
    this.fraudPreventionPolicy = new FraudPreventionPolicy();
    this.refundPolicy = new RefundPolicy();

    // Provider Factory
    const paymentProviderFactory = (
      provider: PaymentProvider,
    ): IPaymentProvider => {
      switch (provider) {
        case PaymentProvider.INTERNAL_WALLET:
          return this.paymentMethodProviderRegistry.getProvider("WALLET");
        case PaymentProvider.INTERNAL_BANK_TRANSFER:
          return this.paymentMethodProviderRegistry.getProvider(
            "BANK_TRANSFER",
          );
        case PaymentProvider.PAYMENT_GATEWAY:
        default:
          // Legacy/contract path — sandbox-aware: `sbx_*` references verify
          // against the simulation ledger, real references against the
          // gateway.
          return this.sandboxAwareRouter;
      }
    };

    // Use Cases
    this.processPaymentUseCase = new ProcessPaymentUseCase(
      this.paymentRepository,
      paymentProviderFactory,
      this.fraudEngine,
      this.paymentProcessingEngine,
      this.paymentLimitsPolicy,
      this.fraudPreventionPolicy,
      this.paymentMethodConfigService,
      this.paymentMethodProviderRegistry,
    );

    this.checkPaymentStatusUseCase = new CheckPaymentStatusUseCase(
      this.paymentRepository,
      paymentProviderFactory,
    );

    this.refundPaymentUseCase = new RefundPaymentUseCase(
      this.paymentRepository,
      this.refundRepository,
      this.refundPolicy,
    );

    this.blockTransactionUseCase = new BlockTransactionUseCase(
      this.paymentRepository,
    );

    this.flagTransactionUseCase = new FlagTransactionUseCase(
      this.paymentRepository,
    );

    // Controllers
    // HandlePaymentWebhookUseCase verification is sandbox-aware: `sbx_*`
    // references resolve against the simulation ledger, live references
    // against the real provider gateway.
    this.handlePaymentWebhookUseCase = new HandlePaymentWebhookUseCase(
      this.paymentRepository,
      this.sandboxAwareRouter,
      this.eventBus,
      this.webhookEventRepository,
    );
    this.paymentMethodsController = new PaymentMethodsController(
      this.paymentMethodConfigService,
    );
    this.paymentController = new PaymentController(
      this.processPaymentUseCase,
      this.checkPaymentStatusUseCase,
      this.refundPaymentUseCase,
      this.handlePaymentWebhookUseCase,
      this.sandboxAwareRouter,
    );

    this.paymentAdminController = new PaymentAdminController(
      this.blockTransactionUseCase,
      this.flagTransactionUseCase,
      this.paymentRepository,
    );

    this.webhookController = new WebhookController(
      this.sandboxAwareRouter,
      this.handlePaymentWebhookUseCase,
    );

    // Sagas
    const eventIdempotency = new EventIdempotency(
      process.env.REDIS_URL!,
      this.prisma,
    );
    this.paymentProcessingSaga = new PaymentProcessingSaga(
      this.sagaLogRepository,
      "payment-service",
      this.paymentRepository,
      paymentProviderFactory,
      this.fraudEngine,
      this.paymentProcessingEngine,
      this.outboxRepository,
      eventIdempotency,
    );
    SagaFactory.registerByType(
      "PaymentProcessingSaga",
      this.paymentProcessingSaga as any,
    );

    this.sagaEventHandler = new SagaEventHandler(
      this.paymentProcessingSaga,
      this.eventBus,
    );

    this.paymentEventHandlers = new PaymentEventHandlers(
      this.paymentRepository,
    );
  }

  public static getInstance(): Container {
    if (!Container.instance) {
      Container.instance = new Container();
    }
    return Container.instance;
  }
}
