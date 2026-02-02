/**
 * Payout Processing Saga
 * Orchestrates payout workflow across Wallet and Payout services
 */

export interface PayoutSagaState {
    payoutId: string;
    sellerId: string;
    amount: number;
    currency: string;
    method: string;
    status: 'INITIATED' | 'ELIGIBILITY_CHECKED' | 'FUNDS_FROZEN' | 'PROVIDER_PROCESSED' | 'FUNDS_DEBITED' | 'COMPLETED' | 'FAILED';
    fee?: number;
    netAmount?: number;
    providerReference?: string;
    error?: string;
    compensationSteps: string[];
}

export interface SagaStep {
    name: string;
    execute: (state: PayoutSagaState) => Promise<PayoutSagaState>;
    compensate: (state: PayoutSagaState) => Promise<void>;
}

export class PayoutProcessingSaga {
    private steps: SagaStep[] = [];

    constructor(
        private readonly walletServiceClient: any,
        private readonly payoutRepository: any,
        private readonly payoutProviderFactory: any,
        private readonly eventBus: any
    ) {
        this.initializeSteps();
    }

    private initializeSteps(): void {
        this.steps = [
            {
                name: 'ValidateEligibility',
                execute: this.validateEligibility.bind(this),
                compensate: async () => { }, // No action needed
            },
            {
                name: 'FreezeFunds',
                execute: this.freezeFunds.bind(this),
                compensate: this.unfreezeFunds.bind(this),
            },
            {
                name: 'ProcessWithProvider',
                execute: this.processWithProvider.bind(this),
                compensate: async () => { }, // Handled by unfreeze if never debited
            },
            {
                name: 'DebitFrozenFunds',
                execute: this.debitFrozenFunds.bind(this),
                compensate: this.reverseDebit.bind(this),
            },
            {
                name: 'CompletePayout',
                execute: this.completePayout.bind(this),
                compensate: async () => { },
            }
        ];
    }

    async execute(initialState: Omit<PayoutSagaState, 'status' | 'compensationSteps'>): Promise<PayoutSagaState> {
        let state: PayoutSagaState = {
            ...initialState,
            status: 'INITIATED',
            compensationSteps: [],
        };

        try {
            for (const step of this.steps) {
                state = await step.execute(state);
                state.compensationSteps.push(step.name);
            }
            state.status = 'COMPLETED';
            return state;
        } catch (error) {
            state.error = error instanceof Error ? error.message : 'Unknown error';
            state.status = 'FAILED';
            await this.compensate(state);
            throw error;
        }
    }

    private async compensate(state: PayoutSagaState): Promise<void> {
        const reversedSteps = [...state.compensationSteps].reverse();
        for (const stepName of reversedSteps) {
            const step = this.steps.find(s => s.name === stepName);
            if (step) {
                await step.compensate(state);
            }
        }
    }

    private async validateEligibility(state: PayoutSagaState): Promise<PayoutSagaState> {
        const eligibility = await this.walletServiceClient.checkEligibility(state.sellerId, state.amount);
        if (!eligibility.canPayout) {
            throw new Error(`Seller not eligible for payout: ${eligibility.reason}`);
        }
        state.status = 'ELIGIBILITY_CHECKED';
        return state;
    }

    private async freezeFunds(state: PayoutSagaState): Promise<PayoutSagaState> {
        await this.walletServiceClient.freezeFunds({
            userId: state.sellerId,
            amount: state.amount,
            description: `Freeze for payout ${state.payoutId}`
        });
        state.status = 'FUNDS_FROZEN';
        return state;
    }

    private async processWithProvider(state: PayoutSagaState): Promise<PayoutSagaState> {
        const provider = this.payoutProviderFactory.getProvider(state.method);
        const result = await provider.initiateTransfer({
            payoutId: state.payoutId,
            amount: state.amount,
            currency: state.currency,
            // ... details
        });
        if (!result.success) {
            throw new Error(`Provider transfer failed: ${result.message}`);
        }
        state.providerReference = result.reference;
        state.status = 'PROVIDER_PROCESSED';
        return state;
    }

    private async debitFrozenFunds(state: PayoutSagaState): Promise<PayoutSagaState> {
        await this.walletServiceClient.debitFrozenFunds({
            userId: state.sellerId,
            amount: state.amount,
            description: `Debit for completed payout ${state.payoutId}`
        });
        state.status = 'FUNDS_DEBITED';
        return state;
    }

    private async completePayout(state: PayoutSagaState): Promise<PayoutSagaState> {
        const payout = await this.payoutRepository.findById(state.payoutId);
        payout.complete(state.providerReference);
        await this.payoutRepository.update(payout);
        return state;
    }

    private async unfreezeFunds(state: PayoutSagaState): Promise<void> {
        await this.walletServiceClient.unfreezeFunds({
            userId: state.sellerId,
            amount: state.amount,
            description: `Unfreeze due to failed payout ${state.payoutId}`
        });
    }

    private async reverseDebit(state: PayoutSagaState): Promise<void> {
        await this.walletServiceClient.creditWallet({
            userId: state.sellerId,
            amount: state.amount,
            description: `Reversal of payout ${state.payoutId}`
        });
    }
}
