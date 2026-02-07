import { CreditWalletUseCase, CreditWalletDTO } from '../use-cases/credit-wallet.use-case';
import { DebitWalletUseCase, DebitWalletDTO } from '../use-cases/debit-wallet.use-case';
import { PlaceHoldUseCase, PlaceHoldDTO } from '../use-cases/place-hold.use-case';
import { ReleaseHoldUseCase, ReleaseHoldDTO } from '../use-cases/release-hold.use-case';
import { ReverseTransactionUseCase, ReverseTransactionDTO } from '../use-cases/reverse-transaction.use-case';
import { AuditInfo } from '../../domain/value-objects/audit-info.value-object';

export interface WalletSagaState {
    transactionId: string;
    userId: string;
    amount: number;
    currency: string;
    type: 'CREDIT' | 'DEBIT' | 'HOLD' | 'RELEASE_HOLD';
    status: 'INITIATED' | 'COMPLETED' | 'FAILED' | 'COMPENSATED';
    error?: string;
    compensationSteps: Array<{
        type: 'REVERSE_TRANSACTION' | 'RELEASE_HOLD';
        payload: any;
    }>;
    idempotencyKey: string;
    correlationId: string;
    auditInfo: AuditInfo;
    // Context properties
    holdId?: string;
    reason?: string;
    metadata?: Record<string, any>;
}

export class WalletTransactionSaga {
    constructor(
        private readonly creditWalletUseCase: CreditWalletUseCase,
        private readonly debitWalletUseCase: DebitWalletUseCase,
        private readonly placeHoldUseCase: PlaceHoldUseCase,
        private readonly releaseHoldUseCase: ReleaseHoldUseCase,
        private readonly reverseTransactionUseCase: ReverseTransactionUseCase
    ) { }

    async execute(state: WalletSagaState): Promise<void> {
        try {
            state.status = 'INITIATED';

            switch (state.type) {
                case 'CREDIT':
                    const creditDto: CreditWalletDTO = {
                        userId: state.userId,
                        amount: state.amount,
                        currency: state.currency,
                        description: state.reason || 'Saga Credit',
                        metadata: state.metadata,
                        idempotencyKey: state.idempotencyKey,
                        correlationId: state.correlationId,
                        auditInfo: state.auditInfo
                    };
                    const creditResult = await this.creditWalletUseCase.execute(creditDto);

                    state.compensationSteps.push({
                        type: 'REVERSE_TRANSACTION',
                        payload: {
                            transactionId: creditResult.transactionId,
                            reason: 'Compensation for Credit',
                            idempotencyKey: `${state.idempotencyKey}_comp`,
                            correlationId: state.correlationId,
                            auditInfo: state.auditInfo
                        } as ReverseTransactionDTO
                    });
                    break;

                case 'DEBIT':
                    const debitDto: DebitWalletDTO = {
                        userId: state.userId,
                        amount: state.amount,
                        currency: state.currency,
                        description: state.reason || 'Saga Debit',
                        metadata: state.metadata,
                        idempotencyKey: state.idempotencyKey,
                        correlationId: state.correlationId,
                        auditInfo: state.auditInfo
                    };
                    const debitResult = await this.debitWalletUseCase.execute(debitDto);
                    if (!debitResult.success) {
                        throw new Error(debitResult.message);
                    }

                    state.compensationSteps.push({
                        type: 'REVERSE_TRANSACTION',
                        payload: {
                            transactionId: debitResult.transactionId,
                            reason: 'Compensation for Debit',
                            idempotencyKey: `${state.idempotencyKey}_comp`,
                            correlationId: state.correlationId,
                            auditInfo: state.auditInfo
                        } as ReverseTransactionDTO
                    });
                    break;

                case 'HOLD':
                    const holdDto: PlaceHoldDTO = {
                        userId: state.userId,
                        amount: state.amount,
                        currency: state.currency,
                        reason: state.reason || 'Saga Hold',
                        expiresInSeconds: 3600, // Default 1 hour? Should be in state
                        idempotencyKey: state.idempotencyKey,
                        auditInfo: state.auditInfo
                    };
                    const holdResult = await this.placeHoldUseCase.execute(holdDto);
                    state.holdId = holdResult.holdId;

                    state.compensationSteps.push({
                        type: 'RELEASE_HOLD',
                        payload: {
                            holdId: holdResult.holdId,
                            userId: state.userId,
                            reason: 'Compensation for Hold',
                            idempotencyKey: `${state.idempotencyKey}_comp`,
                            auditInfo: state.auditInfo
                        } as ReleaseHoldDTO
                    });
                    break;

                case 'RELEASE_HOLD':
                    if (!state.holdId) {
                        throw new Error('Hold ID required for RELEASE_HOLD');
                    }
                    const releaseDto: ReleaseHoldDTO = {
                        holdId: state.holdId,
                        userId: state.userId,
                        reason: state.reason || 'Saga Release',
                        idempotencyKey: state.idempotencyKey,
                        auditInfo: state.auditInfo
                    };
                    await this.releaseHoldUseCase.execute(releaseDto);
                    // Compensation for Release is... internal logic? Re-hold? 
                    // Usually Release is final or compensation of Hold. 
                    // If we are executing Release as a primary action, compensation might be PlaceHold again?
                    // Let's assume Release is not compensated for now or defined elsewhere.
                    break;

                default:
                    throw new Error(`Unsupported transaction type: ${state.type}`);
            }

            state.status = 'COMPLETED';

        } catch (error: any) {
            state.error = error.message;
            state.status = 'FAILED';

            // Execute compensations
            await this.compensate(state);
            throw error;
        }
    }

    private async compensate(state: WalletSagaState): Promise<void> {
        while (state.compensationSteps.length > 0) {
            const step = state.compensationSteps.pop();
            if (!step) continue;

            try {
                if (step.type === 'REVERSE_TRANSACTION') {
                    await this.reverseTransactionUseCase.execute(step.payload);
                } else if (step.type === 'RELEASE_HOLD') {
                    await this.releaseHoldUseCase.execute(step.payload);
                }
            } catch (error) {
                console.error(`Failed to compensate step ${step.type}:`, error);
                // In production: Retry mechanism, dead letter queue, manual intervention alert
                // For now, we log.
            }
        }
        state.status = 'COMPENSATED';
    }
}

