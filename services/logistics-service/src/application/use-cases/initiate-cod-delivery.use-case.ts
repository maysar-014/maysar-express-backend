import { IDeliveryRepository } from '../../domain/repositories';
import { CODDeliveryConfirmationSaga } from '../sagas/cod-delivery-confirmation.saga';

export interface InitiateCODDeliveryInput {
    deliveryId: string;
}

export class InitiateCODDeliveryUseCase {
    constructor(
        private readonly deliveryRepository: IDeliveryRepository,
        private readonly codDeliveryConfirmationSaga: CODDeliveryConfirmationSaga
    ) { }

    async execute(input: InitiateCODDeliveryInput): Promise<void> {
        const delivery = await this.deliveryRepository.findById(input.deliveryId);
        if (!delivery) {
            throw new Error(`Delivery ${input.deliveryId} not found`);
        }

        if (!delivery.isCOD) {
            // Non-COD deliveries can still have OTP requested — treat as a no-op success
            // to avoid blocking courier workflows when the COD flag wasn't propagated.
            console.log(`[COD] Delivery ${input.deliveryId} not marked as COD — skipping saga, returning success`);
            return;
        }

        console.log(`[COD] Starting delivery saga for ${input.deliveryId}`);

        // Start the saga from step 1 (initiate_secure_delivery)
        await this.codDeliveryConfirmationSaga.start({
            deliveryId: delivery.id,
            orderId: delivery.orderId,
            buyerId: delivery.buyerId!,
            sellerId: delivery.sellerId!,
            codCommitmentHoldId: delivery.codCommitmentHoldId,
            codAmount: delivery.codAmount ? Number(delivery.codAmount) : 0,
            codCurrency: delivery.codCurrency || 'TZS',
            deliveryLocation: delivery.deliveryLocation,
            status: delivery.status
        });
    }
}
