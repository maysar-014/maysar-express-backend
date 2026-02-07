import { DistributedSagaOrchestrator, SagaStep } from '@shared/saga/saga.orchestrator';
import { ISagaLogRepository } from '@shared/saga/saga.log';

export interface WalletSagaPayload {
    transactionId: string;
    userId: string;
    amount: number;
    currency: string;
    type: 'CREDIT' | 'DEBIT' | 'HOLD' | 'RELEASE_HOLD';
    reason?: string;
    metadata?: any;
    idempotencyKey: string;
    correlationId: string;
    auditInfo: any;
    holdId?: string;
}

export interface WalletSagaContext extends WalletSagaPayload {
    status: string;
    error?: string;
    resultTransactionId?: string;
    resultHoldId?: string;
}

export class WalletTransactionSaga extends DistributedSagaOrchestrator<WalletSagaPayload> {
    protected sagaType = 'WalletTransactionSaga';

    constructor(
        protected readonly sagaLogRepository: ISagaLogRepository,
        protected readonly serviceName: string,
        private readonly creditWalletUseCase: any,
        private readonly debitWalletUseCase: any,
        private readonly placeHoldUseCase: any,
        private readonly releaseHoldUseCase: any,
        private readonly reverseTransactionUseCase: any,
        protected readonly outbox?: any
    ) {
        super(sagaLogRepository, serviceName, outbox);
    }

    protected async onStart(sagaId: string, payload: WalletSagaPayload, correlationId?: string): Promise<void> {
        const context: WalletSagaContext = {
            ...payload,
            correlationId: correlationId || sagaId,
            status: 'INITIATED'
        };
        await this.sagaLogRepository.update(sagaId, { context });
    }

    protected defineSteps(): SagaStep<WalletSagaPayload>[] {
        return [
            {
                name: 'ExecuteTransaction',
                execute: async (payload, sagaId) => {
                    const saga = await this.getSagaOrThrow(sagaId);
                    const context = saga.context as WalletSagaContext;

                    switch (context.type) {
                        case 'CREDIT': {
                            const result = await this.creditWalletUseCase.execute({
                                userId: context.userId,
                                amount: context.amount,
                                currency: context.currency,
                                description: context.reason,
                                idempotencyKey: context.idempotencyKey,
                                correlationId: context.correlationId,
                                auditInfo: context.auditInfo
                            });
                            context.resultTransactionId = result.transactionId;
                            break;
                        }
                        case 'DEBIT': {
                            const result = await this.debitWalletUseCase.execute({
                                userId: context.userId,
                                amount: context.amount,
                                currency: context.currency,
                                description: context.reason,
                                idempotencyKey: context.idempotencyKey,
                                correlationId: context.correlationId,
                                auditInfo: context.auditInfo
                            });
                            if (!result.success) throw new Error(result.message);
                            context.resultTransactionId = result.transactionId;
                            break;
                        }
                        case 'HOLD': {
                            const result = await this.placeHoldUseCase.execute({
                                userId: context.userId,
                                amount: context.amount,
                                currency: context.currency,
                                reason: context.reason,
                                idempotencyKey: context.idempotencyKey,
                                auditInfo: context.auditInfo
                            });
                            context.resultHoldId = result.holdId;
                            break;
                        }
                        case 'RELEASE_HOLD': {
                            if (!context.holdId) throw new Error('Hold ID required');
                            await this.releaseHoldUseCase.execute({
                                holdId: context.holdId,
                                userId: context.userId,
                                reason: context.reason,
                                idempotencyKey: context.idempotencyKey,
                                auditInfo: context.auditInfo
                            });
                            break;
                        }
                    }
                    await this.sagaLogRepository.update(sagaId, { context });
                },
                compensate: async (payload, sagaId) => {
                    const saga = await this.getSagaOrThrow(sagaId);
                    const context = saga.context as WalletSagaContext;

                    if (context.type === 'CREDIT' || context.type === 'DEBIT') {
                        if (context.resultTransactionId) {
                            await this.reverseTransactionUseCase.execute({
                                transactionId: context.resultTransactionId,
                                reason: 'Saga Compensation',
                                idempotencyKey: `${context.idempotencyKey}_comp`,
                                correlationId: context.correlationId,
                                auditInfo: context.auditInfo
                            });
                        }
                    } else if (context.type === 'HOLD') {
                        if (context.resultHoldId) {
                            await this.releaseHoldUseCase.execute({
                                holdId: context.resultHoldId,
                                userId: context.userId,
                                reason: 'Saga Compensation',
                                idempotencyKey: `${context.idempotencyKey}_comp`,
                                auditInfo: context.auditInfo
                            });
                        }
                    }
                }
            }
        ];
    }
}
