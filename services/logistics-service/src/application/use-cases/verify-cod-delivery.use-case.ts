import { IDeliveryRepository } from '../../domain/repositories';
import { CODConfirmationEngine } from '../../domain/engines/cod-confirmation.engine';
import { GeoPoint } from '../../domain/value-objects/geopoint.value-object';
import { CODDeliveryConfirmationSaga } from '../sagas/cod-delivery-confirmation.saga';

export interface VerifyCODDeliveryInput {
    deliveryId: string;
    otp: string;
    location: GeoPoint;
}

export class VerifyCODDeliveryUseCase {
    constructor(
        private readonly deliveryRepository: IDeliveryRepository,
        private readonly codConfirmationEngine: CODConfirmationEngine,
        private readonly codDeliveryConfirmationSaga: CODDeliveryConfirmationSaga
    ) { }

    async execute(input: VerifyCODDeliveryInput): Promise<void> {
        const delivery = await this.deliveryRepository.findById(input.deliveryId);
        if (!delivery) {
            throw new Error(`Delivery ${input.deliveryId} not found`);
        }

        if (!delivery.isCOD) {
            // Non-COD delivery: treat verification as a no-op success
            console.log(`[COD] Delivery ${input.deliveryId} not marked as COD — treating verify as success`);
            return;
        }

        // In a real system, the saga might already be running and waiting for this verification.
        // For our orchestrator pattern, we resume/trigger the verification step in the saga.

        if (!delivery.buyerId || !delivery.sellerId) {
            // Missing attribution data — log and return success to avoid blocking courier
            console.log(`[COD] Delivery ${input.deliveryId} missing attribution data — completing without saga`);
            return;
        }

        // Resume the saga with verification data
        await this.codDeliveryConfirmationSaga.start({
            deliveryId: delivery.id,
            orderId: delivery.orderId,
            buyerId: delivery.buyerId,
            sellerId: delivery.sellerId,
            codCommitmentHoldId: delivery.codCommitmentHoldId,
            codAmount: delivery.codAmount ? Number(delivery.codAmount) : 0,
            codCurrency: delivery.codCurrency || 'TZS',
            otp: delivery.otp,
            otpExpiresAt: delivery.otpExpiresAt,
            deliveryLocation: delivery.deliveryLocation,
            currentLocation: input.location,
            providedOtp: input.otp,
            status: delivery.status
        });

        console.log(`COD Verification initiated for delivery ${input.deliveryId}`);
    }
}
