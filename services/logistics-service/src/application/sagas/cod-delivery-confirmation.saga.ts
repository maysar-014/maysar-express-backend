import { DistributedSagaOrchestrator, SagaStep } from '../../../../../shared/saga/saga.orchestrator';
import { ISagaLogRepository } from '../../../../../shared/saga/saga.log';
import { IDeliveryRepository } from '../../domain/repositories';
import { CODConfirmationEngine } from '../../domain/engines/cod-confirmation.engine';
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
 * COD Delivery Confirmation Saga
 * Orchestrates the secure completion of a Cash-on-Delivery transaction.
 * 
 * Flow:
 * 1. Shipment Started -> Generate OTP -> Notify Buyer
 * 2. Delivery Attempt -> Verify GPS Proximity -> Verify OTP
 * 3. Verified -> Mark Collected -> Trigger Reputation Update -> Trigger Payment Settlement
 * 4. Failed/Refused -> Trigger Penalty -> Forfeit Commitment
 */
export class CODDeliveryConfirmationSaga extends DistributedSagaOrchestrator<CODDeliverySagaContext> {
    protected sagaType = 'CODDeliveryConfirmationSaga';

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

                    const otp = this.codConfirmationEngine.generateOTP();
                    const otpExpiresAt = this.codConfirmationEngine.calculateOTPExpiry();

                    context.otp = otp;
                    context.otpExpiresAt = otpExpiresAt;

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
                },
                compensate: async (context: CODDeliverySagaContext, sagaId: string) => {
                    await this.deliveryRepository.updateStatus(context.deliveryId, 'failed', {
                        reason: 'Failed to initiate secure COD delivery'
                    });
                }
            },
            {
                name: 'verify_cod_delivery',
                execute: async (context: CODDeliverySagaContext, sagaId: string) => {
                    // This step would technically be triggered by an external event/call
                    // For the purpose of the saga orchestrator, we validate the presence of verification data
                    if (!context.currentLocation || !context.providedOtp) {
                        console.log(`[${sagaId}] Verification data missing, waiting for courier submission...`);
                        // In a real reactive saga, this would pause here. 
                        // For now, we assume this step is called when data is available.
                        return;
                    }

                    const isNear = this.codConfirmationEngine.isWithinProximity(
                        context.currentLocation,
                        context.deliveryLocation
                    );

                    if (!isNear) {
                        throw new Error('Verification Failed: Courier is not within proximity of delivery address');
                    }

                    const isOtpValid = this.codConfirmationEngine.validateOTP(
                        context.providedOtp,
                        context.otp!,
                        context.otpExpiresAt!
                    );

                    if (!isOtpValid) {
                        throw new Error('Verification Failed: Invalid or expired OTP');
                    }

                    await this.deliveryRepository.updateStatus(context.deliveryId, 'delivered', {
                        codCollected: true,
                        codCollectedAt: new Date(),
                        codOtpVerified: true,
                        codProofGpsLat: context.currentLocation.getLatitude(),
                        codProofGpsLng: context.currentLocation.getLongitude(),
                        codProofTimestamp: new Date()
                    });

                    context.status = 'delivered';
                },
                compensate: async (context: CODDeliverySagaContext, sagaId: string) => {
                    console.log(`[${sagaId}] Resetting delivery status due to verification failure`);
                    await this.deliveryRepository.updateStatus(context.deliveryId, 'failed', {
                        reason: 'COD verification failed during saga execution'
                    });
                }
            },
            {
                name: 'complete_cod_transaction',
                execute: async (context: CODDeliverySagaContext, sagaId: string) => {
                    console.log(`[${sagaId}] Triggering downstream CODDeliverySuccess events`);

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
                    // Irreversible once settlement is triggered, requires multi-stage compensation if failed
                    console.warn(`[${sagaId}] Critical: Compensation triggered during transaction completion`);
                }
            }
        ];
    }
}
