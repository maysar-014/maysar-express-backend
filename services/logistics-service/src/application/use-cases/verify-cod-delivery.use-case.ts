import { IDeliveryRepository } from '../../domain/repositories';
import { CODConfirmationEngine } from '../../domain/engines/cod-confirmation.engine';
import { GeoPoint } from '../../domain/value-objects/geopoint.value-object';
import { CODSettlementSaga } from '../sagas/cod-settlement.saga';

export interface VerifyCODDeliveryInput {
    deliveryId: string;
    otp: string;
    location: GeoPoint;
}

export class VerifyCODDeliveryUseCase {
    constructor(
        private readonly deliveryRepository: IDeliveryRepository,
        private readonly codConfirmationEngine: CODConfirmationEngine,
        private readonly codSettlementSaga: CODSettlementSaga
    ) { }

    async execute(input: VerifyCODDeliveryInput): Promise<void> {
        const delivery = await this.deliveryRepository.findById(input.deliveryId);
        if (!delivery) {
            throw new Error(`Delivery ${input.deliveryId} not found`);
        }

        if (!delivery.isCOD) {
            throw new Error(`This delivery is not a COD order`);
        }

        if (!delivery.buyerId || !delivery.sellerId) {
            // Fail closed. This previously returned success, which reported a
            // verified COD delivery that had in fact settled nothing — the buyer
            // was told the order was confirmed while the order stayed in flight.
            throw new Error(`Delivery ${input.deliveryId} is missing attribution data`);
        }

        if (delivery.codOtpVerified) {
            // Idempotent retry: a courier double-submitting, or a client retrying a
            // timed-out request, must not settle the same order twice.
            console.log(`[COD] Delivery ${input.deliveryId} already verified — ignoring duplicate request`);
            return;
        }

        console.log(`[COD] Verifying delivery ${input.deliveryId}`);

        // Verification is a separate HTTP request from OTP generation, so this
        // advances the SETTLEMENT saga rather than restarting anything. The
        // settlement saga re-checks the OTP against storage and the courier's
        // proximity itself; doing the check here as well means a wrong code is
        // rejected with a 4xx before any saga is started.
        //
        // The previous implementation called start() again on the initiation saga,
        // which restarted it at step 0 and re-minted the OTP — so the code the
        // courier was holding was overwritten and could never validate, leaving
        // the delivery stuck at in_transit (BLG-024).
        // `awaitCompletion` is essential here, not an optimisation. `start()` is
        // fire-and-forget by default and returns once the saga is merely persisted,
        // so without this the endpoint answered "verification successful" for a saga
        // that had already failed and compensated - the courier was told the COD was
        // confirmed while the delivery stayed in_transit and nothing settled.
        await this.codSettlementSaga.start(
            {
                deliveryId: delivery.id,
                orderId: delivery.orderId,
                buyerId: delivery.buyerId,
                sellerId: delivery.sellerId,
                codCommitmentHoldId: delivery.codCommitmentHoldId,
                codAmount: delivery.codAmount ? Number(delivery.codAmount) : 0,
                codCurrency: delivery.codCurrency || 'TZS',
                deliveryLocation: delivery.deliveryLocation,
                currentLocation: input.location,
                providedOtp: input.otp,
                status: delivery.status
            },
            undefined,
            { awaitCompletion: true }
        );

        console.log(`COD Verification completed for delivery ${input.deliveryId}`);
    }
}
