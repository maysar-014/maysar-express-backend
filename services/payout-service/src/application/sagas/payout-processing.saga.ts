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

    constructor(
        protected readonly sagaLogRepository: ISagaLogRepository,
        protected readonly serviceName: string,
        private readonly walletServiceClient: any,
        private readonly payoutRepository: any,
        private readonly payoutProviderFactory: any,
        protected readonly outbox?: any
    ) {
        super(sagaLogRepository, serviceName, outbox);
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

