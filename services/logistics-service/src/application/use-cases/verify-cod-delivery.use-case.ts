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
            throw new Error('This delivery is not a COD order');
        }

        // In a real system, the saga might already be running and waiting for this verification.
        // For our orchestrator pattern, we resume/trigger the verification step in the saga.

        if (!delivery.buyerId || !delivery.sellerId) {
            throw new Error(`Delivery ${input.deliveryId} is missing attribution data (buyer/seller)`);
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
