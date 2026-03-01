import { OrderFulfillmentSaga } from '../../application/sagas/order-fulfillment.saga';
import { EventEnvelope } from '../../../../shared/events/eventBus';
import { logger } from '../monitoring/logger';

export class SagaReplyHandler {
    constructor(private readonly saga: OrderFulfillmentSaga) { }

    async handleStockReserved(envelope: EventEnvelope): Promise<void> {
        const sagaId = envelope.data.sagaId || envelope.metadata?.sagaId;
        logger.info(`Received StockReservedSuccess for saga ${sagaId}`);
        await this.saga.handleStockReserved(sagaId);
    }

    async handleStockFailed(envelope: EventEnvelope): Promise<void> {
        const sagaId = envelope.data.sagaId || envelope.metadata?.sagaId;
        const error = envelope.data.error || envelope.data.reason;
        logger.error(`Received StockReservationFailure for saga ${sagaId}: ${error}`);
        await this.saga.handleFailure(sagaId, 'StockReservation', error);
    }

    async handlePaymentSuccess(envelope: EventEnvelope): Promise<void> {
        const sagaId = envelope.data.sagaId || envelope.metadata?.sagaId;
        logger.info(`Received PaymentSuccess for saga ${sagaId}`);
        await this.saga.handlePaymentSuccess(sagaId);
    }

    async handlePaymentFailed(envelope: EventEnvelope): Promise<void> {
        const sagaId = envelope.data.sagaId || envelope.metadata?.sagaId;
        const error = envelope.data.error || envelope.data.reason;
        logger.error(`Received PaymentFailure for saga ${sagaId}: ${error}`);
        await this.saga.handleFailure(sagaId, 'Payment', error);
    }

    async handleDeliverySuccess(envelope: EventEnvelope): Promise<void> {
        const sagaId = envelope.data.sagaId || envelope.metadata?.sagaId;
        logger.info(`Received DeliveryScheduledSuccess for saga ${sagaId}`);
        await this.saga.handleDeliverySuccess(sagaId);
    }

    async handleDeliveryFailed(envelope: EventEnvelope): Promise<void> {
        const sagaId = envelope.data.sagaId || envelope.metadata?.sagaId;
        const error = envelope.data.error || envelope.data.reason;
        logger.error(`Received DeliverySchedulingFailure for saga ${sagaId}: ${error}`);
        await this.saga.handleFailure(sagaId, 'Delivery', error);
    }
}
