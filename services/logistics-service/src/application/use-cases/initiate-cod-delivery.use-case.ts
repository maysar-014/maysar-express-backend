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
            throw new Error('This delivery is not a COD order');
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
