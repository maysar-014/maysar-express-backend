import { DistributedSagaOrchestrator, SagaStep } from '../../../../../shared/saga/saga.orchestrator';
import { ISagaLogRepository } from '../../../../../shared/saga/saga.log';
import { IDeliveryRepository } from '../../domain/repositories';
import { CODConfirmationEngine } from '../../domain/engines/cod-confirmation.engine';

/**
 * Shared context for the COD initiation and settlement sagas.
 *
 * Extracted when the single COD saga was divided into `CODInitiationSaga` (OTP
 * issuance) and `CODSettlementSaga` (verification + settlement) so that
 * settlement is structurally unreachable before a courier verifies the delivery.
 * See BLG-027.
 */
import { GeoPoint } from '../../domain/value-objects/geopoint.value-object';

export interface CODDeliverySagaContext {
    deliveryId: string;
    orderId: string;
    buyerId: string;
    sellerId: string;
    codAmount: number;
    codCurrency: string;
    otp?: string;
    otpExpiresAt?: Date;
    deliveryLocation: GeoPoint;
    currentLocation?: GeoPoint;
    providedOtp?: string;
    status: string;
    requestId?: string;
    codCommitmentHoldId?: string;
}

/**
 * COD initiation saga — OTP issuance only.
 *
 * Replaces the first step of the superseded single-saga flow. It deliberately
 * contains NO settlement step: nothing reachable from this saga can move money
 * or update a buyer's COD trust score. Verification and settlement live in
 * `CODSettlementSaga`, which is only started after a successful verification
 * (see `VerifyCODDeliveryUseCase`).
 */
export class CODInitiationSaga extends DistributedSagaOrchestrator<CODDeliverySagaContext> {
    protected sagaType = 'CODInitiationSaga';

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
                name: 'initiate_secure_delivery',
                execute: async (context: CODDeliverySagaContext, sagaId: string) => {
                    console.log(`[${sagaId}] Initiating secure COD delivery for ${context.deliveryId}`);

                    // Fail closed. An OTP is only meaningful if there is somebody to
                    // notify and an order to attach it to; issuing one without them
                    // produces a code no courier can ever present successfully.
                    if (!context.buyerId || !context.sellerId || !context.orderId) {
                        throw new Error(
                            `Cannot issue a COD OTP for delivery ${context.deliveryId}: missing order or party attribution`
                        );
                    }

                    const otp = this.codConfirmationEngine.generateOTP();
                    const otpExpiresAt = this.codConfirmationEngine.calculateOTPExpiry();

                    try {
                        await this.deliveryRepository.updateStatus(context.deliveryId, 'in_transit', {
                            isCOD: true,
                            otp,
                            otpExpiresAt
                        });

                        // Notify buyer via event
                        await (this as any).publishCommand('NotifyBuyerOTP', {
                            orderId: context.orderId,
                            buyerId: context.buyerId,
                            otp,
                            expiresAt: otpExpiresAt
                        }, context.requestId || sagaId, sagaId);
                    } catch (error) {
                        // The OTP is only useful once the buyer has it. If either the
                        // write or the notification failed, record why and rethrow so
                        // the orchestrator compensates — otherwise the delivery is left
                        // holding a code that nobody ever received, and the courier
                        // has nothing valid to collect against.
                        console.error(
                            `[${sagaId}] Failed to issue COD OTP for ${context.deliveryId}:`,
                            error
                        );
                        throw error;
                    }
                },
                compensate: async (context: CODDeliverySagaContext, sagaId: string) => {
                    await this.deliveryRepository.updateStatus(context.deliveryId, 'failed', {
                        reason: 'Failed to initiate secure COD delivery'
                    });
                }
            }
        ];
    }
}
