/**
 * COD settlement saga — verification, then delivery marking, then settlement.
 *
 * This is the only place in the codebase permitted to emit `SettleCODPayment` or
 * `RecordCODSuccess`, and it is started only by `VerifyCODDeliveryUseCase` after
 * the courier has presented an OTP. Splitting it out of the former single
 * `CODDeliveryConfirmationSaga` is what makes settlement structurally
 * unreachable before verification — previously a bare `return` in the verify
 * step counted as success and let the settlement step run at OTP-generation time
 * (BLG-027).
 *
 * Ordering is deliberate and load-bearing:
 *
 *   1. `verify_cod_delivery` — evidence check only. Writes no status.
 *   2. `mark_delivered`       — the durable state change.
 *   3. `complete_cod_transaction` — irreversible money movement, last.
 *
 * A failure at step 1 leaves the delivery `in_transit` and emits nothing. A
 * failure at step 2 likewise settles nothing. Only once both have succeeded does
 * money move, so a partially-failed verification cannot release a COD hold.
 */
import { DistributedSagaOrchestrator, SagaStep } from '../../../../../shared/saga/saga.orchestrator';
import { ISagaLogRepository } from '../../../../../shared/saga/saga.log';
import { IDeliveryRepository } from '../../domain/repositories';
import { CODConfirmationEngine } from '../../domain/engines/cod-confirmation.engine';
import { CODDeliverySagaContext } from './cod-initiation.saga';

export class CODSettlementSaga extends DistributedSagaOrchestrator<CODDeliverySagaContext> {
    protected sagaType = 'CODSettlementSaga';

    constructor(
        sagaLogRepository: ISagaLogRepository,
        serviceName: string,
        private readonly deliveryRepository: IDeliveryRepository,
        private readonly codConfirmationEngine: CODConfirmationEngine,
        outbox?: any
    ) {
        super(sagaLogRepository, serviceName, outbox);
    }

    protected defineSteps(): SagaStep<CODDeliverySagaContext>[] {
        return [
            {
                name: 'verify_cod_delivery',
                execute: async (context: CODDeliverySagaContext, sagaId: string) => {
                    // Fail closed. Unlike the superseded saga, missing evidence is a
                    // thrown error, never a silent `return`, so the settlement step
                    // below cannot be reached without it.
                    if (!context.currentLocation || !context.providedOtp) {
                        throw new Error('Verification Failed: courier location and OTP are both required');
                    }

                    const isNear = this.codConfirmationEngine.isWithinProximity(
                        context.currentLocation,
                        context.deliveryLocation
                    );

                    if (!isNear) {
                        throw new Error('Verification Failed: Courier is not within proximity of delivery address');
                    }

                    // The issued OTP is re-read from storage rather than trusted from
                    // the payload, so a tampered or replayed context cannot make an
                    // arbitrary code validate.
                    const stored = await this.deliveryRepository.findById(context.deliveryId);
                    const isOtpValid = this.codConfirmationEngine.validateOTP(
                        context.providedOtp,
                        stored?.otp ?? '',
                        stored?.otpExpiresAt ?? new Date(0)
                    );

                    if (!isOtpValid) {
                        throw new Error('Verification Failed: Invalid or expired OTP');
                    }
                },
                compensate: async (context: CODDeliverySagaContext, sagaId: string) => {
                    // No state was written, so there is nothing to roll back. This is
                    // why the verify step deliberately makes no writes.
                    console.log(`[${sagaId}] Verification rejected for ${context.deliveryId}`);
                }
            },
            {
                name: 'mark_delivered',
                execute: async (context: CODDeliverySagaContext, sagaId: string) => {
                    await this.deliveryRepository.updateStatus(context.deliveryId, 'delivered', {
                        codCollected: true,
                        codCollectedAt: new Date(),
                        codOtpVerified: true,
                        codProofGpsLat: context.currentLocation!.getLatitude(),
                        codProofGpsLng: context.currentLocation!.getLongitude(),
                        codProofTimestamp: new Date()
                    });
                },
                compensate: async (context: CODDeliverySagaContext, sagaId: string) => {
                    console.warn(`[${sagaId}] Reverting delivered status for ${context.deliveryId}`);
                    await this.deliveryRepository.updateStatus(context.deliveryId, 'in_transit', {
                        codCollected: false,
                        codOtpVerified: false
                    });
                }
            },
            {
                name: 'complete_cod_transaction',
                execute: async (context: CODDeliverySagaContext, sagaId: string) => {
                    console.log(`[${sagaId}] Settling COD transaction for ${context.deliveryId}`);

                    // 1. Success Event for Reputation Update
                    await (this as any).publishCommand('RecordCODSuccess', {
                        userId: context.buyerId,
                        orderId: context.orderId
                    }, context.requestId || sagaId, sagaId);

                    // 2. Success Event for Payment Settlement
                    await (this as any).publishCommand('SettleCODPayment', {
                        orderId: context.orderId,
                        buyerId: context.buyerId,
                        sellerId: context.sellerId,
                        amount: context.codAmount,
                        currency: context.codCurrency,
                        holdId: context.codCommitmentHoldId
                    }, context.requestId || sagaId, sagaId);
                },
                compensate: async (context: CODDeliverySagaContext, sagaId: string) => {
                    // Settlement is irreversible once published, which is precisely
                    // why this step is last and gated behind both the evidence check
                    // and the durable `delivered` write.
                    console.warn(`[${sagaId}] Critical: compensation requested after settlement for ${context.deliveryId}`);
                }
            }
        ];
    }
}