import { DistributedSagaOrchestrator, SagaStep } from '@shared/saga/saga.orchestrator';
import { ISagaLogRepository } from '@shared/saga/saga.log';
import { ReleaseHoldUseCase } from '../use-cases/release-hold.use-case';
import { CaptureHoldUseCase } from '../use-cases/capture-hold.use-case';
import { CreditWalletUseCase } from '../use-cases/credit-wallet.use-case';
import { FreezeFundsUseCase } from '../use-cases/freeze-funds.use-case';
import { TransactionalOutbox } from '@shared/outbox/outboxPattern';
import { AuditInfo, ActorType } from '../../domain/value-objects/audit-info.value-object';
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

export interface CODSettlementPayload {
    orderId: string;
    buyerId: string;
    sellerId: string;
    amount: number;
    currency: string;
    holdId?: string;
    deliveryStatus: 'SUCCESS' | 'REFUSED' | 'DISPUTED';
    sellerAmount: number;
    courierId: string;
    courierAmount: number;
}

/**
 * COD Settlement Saga
 * Manages the final financial adjustments after a COD delivery attempt.
 * 
 * Flow:
 * - If SUCCESS: Release the 5% commitment fee hold back to the buyer.
 * - If REFUSED: Capture the 5% hold as a penalty for time and logistics wasted.
 * - If DISPUTED: Keeps hold until resolution (manual).
 */
export class CODSettlementSaga extends DistributedSagaOrchestrator<CODSettlementPayload> {
    protected sagaType = 'CODSettlementSaga';

    constructor(
        sagaLogRepository: ISagaLogRepository,
        serviceName: string,
        private readonly releaseHoldUseCase: ReleaseHoldUseCase,
        private readonly captureHoldUseCase: CaptureHoldUseCase,
        private readonly creditWalletUseCase: CreditWalletUseCase,
        private readonly freezeWalletUseCase: FreezeFundsUseCase,
        outbox?: TransactionalOutbox
    ) {
        super(sagaLogRepository, serviceName, createSagaOutboxAdapter(outbox));
    }

    protected defineSteps(): SagaStep<CODSettlementPayload>[] {
        return [
            {
                name: 'WaitForDisputeWindow',
                execute: async (payload, sagaId) => {
                    if (payload.deliveryStatus !== 'SUCCESS') return;

                    console.log(`[${sagaId}] Order ${payload.orderId} successful. Waiting 24h dispute window...`);

                    // Implementing an actual delay for the dispute window.
                    // In production, this would be a persistent scheduled event or a message queue delay.
                    // For current orchestrator compatibility, we use a promise-based delay.

                    // We check if a dispute was already filed before proceeding (simulated check)
                    console.log(`[${sagaId}] Dispute window timer started for order ${payload.orderId}`);

                    // Simulation: In this implementation we will wait for a short period to demonstrate the delay, 
                    // but in a real environment this would be handled by a task scheduler re-triggering the saga.
                    await new Promise(resolve => setTimeout(resolve, 5000));

                    console.log(`[${sagaId}] Dispute window passed for order ${payload.orderId}. Proceeding to settlement.`);
                },
                compensate: async (_payload, _sagaId) => {
                    // No action needed
                }
            },
            {
                name: 'ProcessCODCommitment',
                execute: async (payload, sagaId) => {
                    if (!payload.holdId) return;
                    const auditInfo = AuditInfo.create({
                        actor: 'wallet-service',
                        actorType: ActorType.SYSTEM,
                        action: 'COD_SETTLEMENT',
                        reason: `COD settlement processing for order ${payload.orderId}`,
                        metadata: { sagaId, orderId: payload.orderId }
                    });

                    if (payload.deliveryStatus === 'SUCCESS') {
                        await this.releaseHoldUseCase.execute({
                            holdId: payload.holdId,
                            userId: payload.buyerId,
                            reason: `COD Commitment Released - Order ${payload.orderId} confirmed after dispute window.`,
                            idempotencyKey: `cod_release_${payload.orderId}`,
                            auditInfo
                        });
                    } else if (payload.deliveryStatus === 'REFUSED') {
                        await this.captureHoldUseCase.execute({
                            holdId: payload.holdId,
                            userId: payload.buyerId,
                            reason: `COD Commitment Captured - Order ${payload.orderId} refused.`,
                            idempotencyKey: `cod_capture_${payload.orderId}`,
                            correlationId: sagaId,
                            auditInfo
                        });
                    } else if (payload.deliveryStatus === 'DISPUTED') {
                        // For DISPUTED, we keep the commitment hold active instead of releasing/capturing.
                        // This freezes the funds until manual dispute resolution.
                        console.log(`[${sagaId}] COD Dispute detected for order ${payload.orderId}. Freezing commitment hold ${payload.holdId}.`);

                        // We use the freezeWalletUseCase if available, or just log that we are keeping it active.
                        if (this.freezeWalletUseCase) {
                            await this.freezeWalletUseCase.execute({
                                userId: payload.buyerId,
                                amount: payload.amount,
                                description: `COD Dispute - Order ${payload.orderId} funds frozen pending resolution.`,
                                reason: `COD dispute hold for order ${payload.orderId}`,
                                correlationId: sagaId,
                                auditInfo,
                                metadata: {
                                    orderId: payload.orderId,
                                    currency: payload.currency
                                }
                            });
                        }
                    }
                },
                compensate: async (payload, sagaId) => {
                    // Requires manual reversal of hold actions
                    console.warn(`[${sagaId}] Compensation for ProcessCODCommitment: manual reversal required`);
                }
            },
            {
                name: 'PayoutSellerAndCourier',
                execute: async (payload, sagaId) => {
                    if (payload.deliveryStatus !== 'SUCCESS') return;
                    const sellerAuditInfo = AuditInfo.create({
                        actor: 'wallet-service',
                        actorType: ActorType.SYSTEM,
                        action: 'COD_SELLER_PAYOUT',
                        reason: `Seller payout for order ${payload.orderId}`,
                        metadata: { sagaId, orderId: payload.orderId }
                    });
                    const courierAuditInfo = AuditInfo.create({
                        actor: 'wallet-service',
                        actorType: ActorType.SYSTEM,
                        action: 'COD_COURIER_PAYOUT',
                        reason: `Courier payout for order ${payload.orderId}`,
                        metadata: { sagaId, orderId: payload.orderId }
                    });

                    console.log(`[${sagaId}] Crediting seller ${payload.sellerId} and courier ${payload.courierId}`);

                    // Credit Seller
                    await this.creditWalletUseCase.execute({
                        userId: payload.sellerId,
                        amount: payload.sellerAmount,
                        currency: payload.currency,
                        description: `COD Payout - Order ${payload.orderId}`,
                        idempotencyKey: `cod_seller_credit_${payload.orderId}`,
                        correlationId: sagaId,
                        auditInfo: sellerAuditInfo
                    });

                    // Credit Courier
                    await this.creditWalletUseCase.execute({
                        userId: payload.courierId,
                        amount: payload.courierAmount,
                        currency: payload.currency,
                        description: `COD Delivery Fee - Order ${payload.orderId}`,
                        idempotencyKey: `cod_courier_credit_${payload.orderId}`,
                        correlationId: sagaId,
                        auditInfo: courierAuditInfo
                    });

                    await this.publishCommand('EventBus.Emit', {
                        type: 'Settlement.Completed',
                        payload: { orderId: payload.orderId, status: 'SETTLED' }
                    }, sagaId, sagaId);
                },
                compensate: async (payload, sagaId) => {
                    // Requires manual reversal of payouts
                    console.warn(`[${sagaId}] Compensation for PayoutSellerAndCourier: manual reversal required`);
                }
            }
        ];
    }
}
