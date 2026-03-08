import { OrderFulfillmentSaga } from '../../application/sagas/order-fulfillment.saga';
import { EventEnvelope } from '@shared-events/eventBus';
import { logger } from '../monitoring/logger';

const asRecord = (value: unknown): Record<string, unknown> =>
    typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};

const getString = (value: unknown): string | undefined => (typeof value === 'string' ? value : undefined);

const getSagaId = (envelope: EventEnvelope): string => {
    const payload = asRecord(envelope.data);
    return getString(payload.sagaId) || getString(envelope.metadata?.sagaId) || 'unknown-saga';
};

const getError = (envelope: EventEnvelope): string => {
    const payload = asRecord(envelope.data);
    return getString(payload.error) || getString(payload.reason) || 'unknown-error';
};

export class SagaReplyHandler {
    constructor(private readonly saga: OrderFulfillmentSaga) { }

    async handleStockReserved(envelope: EventEnvelope): Promise<void> {
        const sagaId = getSagaId(envelope);
        logger.info(`Received StockReservedSuccess for saga ${sagaId}`);
        await this.saga.handleStockReserved(sagaId);
    }

    async handleStockFailed(envelope: EventEnvelope): Promise<void> {
        const sagaId = getSagaId(envelope);
        const error = getError(envelope);
        logger.error(`Received StockReservationFailure for saga ${sagaId}: ${error}`);
        await this.saga.handleFailure(sagaId, 'StockReservation', error);
    }

    async handlePaymentSuccess(envelope: EventEnvelope): Promise<void> {
        const sagaId = getSagaId(envelope);
        logger.info(`Received PaymentSuccess for saga ${sagaId}`);
        await this.saga.handlePaymentSuccess(sagaId);
    }

    async handlePaymentFailed(envelope: EventEnvelope): Promise<void> {
        const sagaId = getSagaId(envelope);
        const error = getError(envelope);
        logger.error(`Received PaymentFailure for saga ${sagaId}: ${error}`);
        await this.saga.handleFailure(sagaId, 'Payment', error);
    }

    async handleDeliverySuccess(envelope: EventEnvelope): Promise<void> {
        const sagaId = getSagaId(envelope);
        logger.info(`Received DeliveryScheduledSuccess for saga ${sagaId}`);
        await this.saga.handleDeliverySuccess(sagaId);
    }

    async handleDeliveryFailed(envelope: EventEnvelope): Promise<void> {
        const sagaId = getSagaId(envelope);
        const error = getError(envelope);
        logger.error(`Received DeliverySchedulingFailure for saga ${sagaId}: ${error}`);
        await this.saga.handleFailure(sagaId, 'Delivery', error);
    }
}
