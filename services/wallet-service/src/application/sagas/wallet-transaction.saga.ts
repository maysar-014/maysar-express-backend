import { DistributedSagaOrchestrator, SagaStep } from '@shared/saga/saga.orchestrator';
import { ISagaLogRepository } from '@shared/saga/saga.log';
import { CreditWalletUseCase } from '../use-cases/credit-wallet.use-case';
import { DebitWalletUseCase } from '../use-cases/debit-wallet.use-case';
import { PlaceHoldUseCase } from '../use-cases/place-hold.use-case';
import { ReleaseHoldUseCase } from '../use-cases/release-hold.use-case';
import { ReverseTransactionUseCase } from '../use-cases/reverse-transaction.use-case';
import { WalletEventPublisher } from '../../infrastructure/messaging/wallet-event-publisher';
import { TransactionalOutbox } from '@shared/outbox/outboxPattern';
import { AuditInfo } from '../../domain/value-objects/audit-info.value-object';
import { EventEnvelope } from '@shared/events/eventBus';
import { randomUUID } from 'crypto';

const createSagaOutboxAdapter = (outbox?: TransactionalOutbox) => {
    if (!outbox) {
        return undefined;
    }

    return {
        saveEvent: async (
            event: { eventType: string; data: unknown; metadata: unknown },
            _transaction?: unknown
        ): Promise<void> => {
            const envelope: EventEnvelope = {
                eventId: randomUUID(),
                eventType: event.eventType,
                data: event.data,
                metadata: (typeof event.metadata === 'object' && event.metadata !== null)
                    ? (event.metadata as Record<string, unknown>)
                    : undefined,
                timestamp: new Date()
            };
            await outbox.saveEvent(envelope);
        }
    };
};

export interface WalletSagaPayload {
    transactionId: string;
    userId: string;
    amount: number;
    currency: string;
    type: 'CREDIT' | 'DEBIT' | 'HOLD' | 'RELEASE_HOLD';
    reason?: string;
    metadata?: Record<string, unknown>;
    idempotencyKey: string;
    correlationId: string;
    auditInfo: AuditInfo;
    holdId?: string;
    paymentSagaId?: string;
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
        private readonly creditWalletUseCase: CreditWalletUseCase,
        private readonly debitWalletUseCase: DebitWalletUseCase,
        private readonly placeHoldUseCase: PlaceHoldUseCase,
        private readonly releaseHoldUseCase: ReleaseHoldUseCase,
        private readonly reverseTransactionUseCase: ReverseTransactionUseCase,
        private readonly eventPublisher: WalletEventPublisher,
        outbox?: TransactionalOutbox
    ) {
        super(sagaLogRepository, serviceName, createSagaOutboxAdapter(outbox));
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
                    const reason = context.reason || `Wallet ${context.type} transaction ${context.transactionId}`;

                    switch (context.type) {
                        case 'CREDIT': {
                            const result = await this.creditWalletUseCase.execute({
                                userId: context.userId,
                                amount: context.amount,
                                currency: context.currency,
                                description: reason,
                                idempotencyKey: context.idempotencyKey,
                                correlationId: context.correlationId,
                                auditInfo: context.auditInfo
                            });
                            context.resultTransactionId = result.transactionId;
                            break;
                        }
                        case 'DEBIT': {
                            try {
                                const result = await this.debitWalletUseCase.execute({
                                    userId: context.userId,
                                    amount: context.amount,
                                    currency: context.currency,
                                    description: reason,
                                    idempotencyKey: context.idempotencyKey,
                                    correlationId: context.correlationId,
                                    auditInfo: context.auditInfo
                                });
                                if (!result.success) {
                                    if (context.paymentSagaId) {
                                        await this.eventPublisher.publishWalletPaymentFailed({
                                            userId: context.userId,
                                            amount: context.amount,
                                            error: result.message,
                                            metadata: { sagaId: context.paymentSagaId, correlationId: context.correlationId }
                                        });
                                    }
                                    throw new Error(result.message);
                                }
                                context.resultTransactionId = result.transactionId;
                                
                                if (context.paymentSagaId) {
                                    await this.eventPublisher.publishWalletPaymentProcessed({
                                        transactionId: result.transactionId,
                                        userId: context.userId,
                                        amount: context.amount,
                                        metadata: { sagaId: context.paymentSagaId, correlationId: context.correlationId }
                                    });
                                }
                            } catch (error: unknown) {
                                if (context.paymentSagaId) {
                                    await this.eventPublisher.publishWalletPaymentFailed({
                                        userId: context.userId,
                                        amount: context.amount,
                                        error: error instanceof Error ? error.message : String(error),
                                        metadata: { sagaId: context.paymentSagaId, correlationId: context.correlationId }
                                    });
                                }
                                throw error;
                            }
                            break;
                        }
                        case 'HOLD': {
                            const result = await this.placeHoldUseCase.execute({
                                userId: context.userId,
                                amount: context.amount,
                                currency: context.currency,
                                reason,
                                expiresInSeconds: 24 * 60 * 60,
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
                                reason,
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

                    if (context.paymentSagaId) {
                        await this.eventPublisher.publishWalletPaymentFailed({
                            userId: context.userId,
                            amount: context.amount,
                            error: context.error || 'Wallet transaction failed',
                            metadata: { sagaId: context.paymentSagaId, correlationId: context.correlationId }
                        });
                    }

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
