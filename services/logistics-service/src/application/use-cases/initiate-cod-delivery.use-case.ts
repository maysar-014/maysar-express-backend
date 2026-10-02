import { IDeliveryRepository } from '../../domain/repositories';
import { CODInitiationSaga } from '../sagas/cod-initiation.saga';

export interface InitiateCODDeliveryInput {
    deliveryId: string;
}

export class InitiateCODDeliveryUseCase {
    constructor(
        private readonly deliveryRepository: IDeliveryRepository,
        private readonly codInitiationSaga: CODInitiationSaga
    ) { }

    async execute(input: InitiateCODDeliveryInput): Promise<void> {
        const delivery = await this.deliveryRepository.findById(input.deliveryId);
        if (!delivery) {
            throw new Error(`Delivery ${input.deliveryId} not found`);
        }

        if (!delivery.isCOD) {
            // Fail closed. This previously returned success, so a caller asking for
            // an OTP on a non-COD order was told all was well while nothing happened —
            // and the real COD order was left with no OTP it could never verify.
            throw new Error(`This delivery is not a COD order`);
        }

        console.log(`[COD] Starting delivery saga for ${input.deliveryId}`);

        // OTP issuance only. This saga has no settlement step: settlement lives in
        // CODSettlementSaga and is unreachable until a courier verifies the delivery
        // (BLG-027). The superseded single saga ran both from here, so merely asking
        // for an OTP settled the payment.
        const sagaId = await this.codInitiationSaga.start({
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

        // Persist the saga id on the delivery. Verification arrives on a later HTTP
        // request and cannot re-derive this id, so without it there is no saga to
        // continue and verification would have to start a fresh one (BLG-024).
        await this.deliveryRepository.updateStatus(delivery.id, delivery.status, {
            codSagaId: sagaId
        });
    }
}
