import { DistributedSagaOrchestrator, SagaStep } from '@shared/saga/saga.orchestrator';
import { ISagaLogRepository } from '@shared/saga/saga.log';

export interface PayoutSagaPayload {
    payoutId: string;
    sellerId: string;
    amount: number;
    currency: string;
    method: string;
}

export interface PayoutSagaContext extends PayoutSagaPayload {
    correlationId: string;
    status: string;
    fee?: number;
    netAmount?: number;
    providerReference?: string;
    error?: string;
}

export class PayoutProcessingSaga extends DistributedSagaOrchestrator<PayoutSagaPayload> {
    protected sagaType = 'PayoutProcessingSaga';
    private readonly legacyMode: boolean;
    private readonly legacyEventBus?: { publish: (event: any) => Promise<void> | void };
    private readonly legacyProvider?: { processPayout: (payload: any) => Promise<any> };
    private readonly walletServiceClient: any;
    private readonly payoutRepository: any;
    private readonly payoutProviderFactory: any;

    constructor(
        sagaLogRepository: ISagaLogRepository,
        serviceName: string,
        walletServiceClient: any,
        payoutRepository: any,
        payoutProviderFactory: any,
        outbox?: any
    );
    constructor(
        payoutRepository: any,
        eventBus: { publish: (event: any) => Promise<void> | void },
        provider: { processPayout: (payload: any) => Promise<any> }
    );
    constructor(...args: any[]) {
        const legacyMode = typeof args[1] !== 'string';
        const [sagaLogRepository, serviceName, walletServiceClient, payoutRepository, payoutProviderFactory, outbox] = legacyMode
            ? [PayoutProcessingSaga.createNoopSagaLogRepository(), 'payout-service', undefined, args[0], undefined, undefined]
            : args;

        super(sagaLogRepository, serviceName, outbox);

        if (!legacyMode) {
            this.legacyMode = false;
            this.walletServiceClient = walletServiceClient;
            this.payoutRepository = payoutRepository;
            this.payoutProviderFactory = payoutProviderFactory;
        } else {
            this.legacyMode = true;
            this.legacyEventBus = args[1];
            this.legacyProvider = args[2];
            this.walletServiceClient = undefined;
            this.payoutRepository = args[0];
            this.payoutProviderFactory = undefined;
        }
    }

    /**
     * Backward-compatible entrypoint for the legacy unit test harness.
     * Production code should continue to use the orchestrator `start()` method.
     */
    async execute(payload: { payoutId: string }): Promise<void> {
        if (!this.legacyMode) {
            throw new Error('PayoutProcessingSaga.execute is only available in legacy compatibility mode');
        }

        const result = await this.legacyProvider?.processPayout(payload);
        await this.legacyEventBus?.publish({
            eventType: 'PayoutProcessed',
            data: {
                payoutId: payload.payoutId,
                result
            }
        });
    }

    private static createNoopSagaLogRepository(): ISagaLogRepository {
        return {
            save: async () => { },
            update: async () => { },
            getById: async () => null,
            saveStep: async () => { },
            updateStep: async () => { },
            getSteps: async () => [],
            findStuck: async () => []
        };
    }

    protected async onStart(sagaId: string, payload: PayoutSagaPayload, correlationId?: string): Promise<void> {
        const context: PayoutSagaContext = {
            ...payload,
            correlationId: correlationId || sagaId,
            status: 'INITIATED'
        };
        await this.sagaLogRepository.update(sagaId, { context });
    }

    protected defineSteps(): SagaStep<PayoutSagaPayload>[] {
        return [
            {
                name: 'ValidateEligibility',
                execute: async (payload, sagaId) => {
                    const saga = await this.getSagaOrThrow(sagaId);
                    const context = saga.context as PayoutSagaContext;
                    const eligibility = await this.walletServiceClient.checkEligibility(context.sellerId, context.amount);
                    if (!eligibility.canPayout) {
                        throw new Error(`Seller not eligible for payout: ${eligibility.reason}`);
                    }
                },
                compensate: async () => { } // No action needed
            },
            {
                name: 'FreezeFunds',
                execute: async (payload, sagaId) => {
                    const saga = await this.getSagaOrThrow(sagaId);
                    const context = saga.context as PayoutSagaContext;
                    await this.walletServiceClient.freezeFunds({
                        userId: context.sellerId,
                        amount: context.amount,
                        description: `Freeze for payout ${context.payoutId}`
                    });
                },
                compensate: async (payload, sagaId) => {
                    const saga = await this.getSagaOrThrow(sagaId);
                    const context = saga.context as PayoutSagaContext;
                    await this.walletServiceClient.unfreezeFunds({
                        userId: context.sellerId,
                        amount: context.amount,
                        description: `Unfreeze due to failed payout ${context.payoutId}`
                    });
                }
            },
            {
                name: 'ProcessWithProvider',
                execute: async (payload, sagaId) => {
                    const saga = await this.getSagaOrThrow(sagaId);
                    const context = saga.context as PayoutSagaContext;
                    const provider = this.payoutProviderFactory.getProvider(context.method);
                    const result = await provider.initiateTransfer({
                        payoutId: context.payoutId,
                        amount: context.amount,
                        currency: context.currency
                    });
                    if (!result.success) {
                        throw new Error(`Provider transfer failed: ${result.message}`);
                    }
                    context.providerReference = result.reference;
                    await this.sagaLogRepository.update(sagaId, { context });
                },
                compensate: async () => { } // Handled by unfreeze if never debited
            },
            {
                name: 'DebitFrozenFunds',
                execute: async (payload, sagaId) => {
                    const saga = await this.getSagaOrThrow(sagaId);
                    const context = saga.context as PayoutSagaContext;
                    await this.walletServiceClient.debitFrozenFunds({
                        userId: context.sellerId,
                        amount: context.amount,
                        description: `Debit for completed payout ${context.payoutId}`
                    });
                },
                compensate: async (payload, sagaId) => {
                    const saga = await this.getSagaOrThrow(sagaId);
                    const context = saga.context as PayoutSagaContext;
                    await this.walletServiceClient.creditWallet({
                        userId: context.sellerId,
                        amount: context.amount,
                        description: `Reversal of payout ${context.payoutId}`
                    });
                }
            },
            {
                name: 'CompletePayout',
                execute: async (payload, sagaId) => {
                    const saga = await this.getSagaOrThrow(sagaId);
                    const context = saga.context as PayoutSagaContext;
                    const payout = await this.payoutRepository.findById(context.payoutId);
                    if (payout) {
                        payout.complete(context.providerReference);
                        await this.payoutRepository.update(payout);
                    }
                },
                compensate: async () => { }
            }
        ];
    }
}

