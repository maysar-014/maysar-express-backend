import { DistributedSagaOrchestrator } from '../../../../shared/saga/saga.orchestrator';
import { ISagaLogRepository, SagaLogEntry } from '../../../../shared/saga/saga.log';

export interface OrderFulfillmentPayload {
    orderId: string;
    buyerId: string;
    sellerId: string;
    amount: number;
    items: Array<{ productId: string; quantity: number }>;
}

export class OrderFulfillmentSaga extends DistributedSagaOrchestrator<OrderFulfillmentPayload> {
    protected sagaType = 'OrderFulfillmentSaga';

    constructor(sagaLogRepository: ISagaLogRepository) {
        super(sagaLogRepository, 'order-service');
    }

    protected async onStart(sagaId: string, payload: OrderFulfillmentPayload): Promise<void> {
        // Step 1: Reserve Stock
        await this.publishCommand('StockReservation.Command', {
            sagaId,
            orderId: payload.orderId,
            items: payload.items
        }, sagaId);
    }

    /**
     * Called when StockReservedSuccess is received
     */
    async handleStockReserved(sagaId: string): Promise<void> {
        await this.completeStep(sagaId, 'StockReservation', async (saga) => {
            const payload = saga.payload as OrderFulfillmentPayload;
            // Step 2: Process Payment
            await this.publishCommand('Payment.Command', {
                sagaId,
                orderId: payload.orderId,
                amount: payload.amount,
                buyerId: payload.buyerId
            }, sagaId);
        });
    }

    /**
     * Called when PaymentSuccess is received
     */
    async handlePaymentSuccess(sagaId: string): Promise<void> {
        await this.completeStep(sagaId, 'Payment', async (saga) => {
            const payload = saga.payload as OrderFulfillmentPayload;
            // Step 3: Schedule Delivery
            await this.publishCommand('Delivery.Command', {
                sagaId,
                orderId: payload.orderId,
                sellerId: payload.sellerId
            }, sagaId);
        });
    }

    /**
     * Called when DeliveryScheduledSuccess is received
     */
    async handleDeliverySuccess(sagaId: string): Promise<void> {
        await this.completeSaga(sagaId);
    }

    /**
     * Called when any failure occurs
     */
    async handleFailure(sagaId: string, stepName: string, error: string): Promise<void> {
        await this.failStep(sagaId, stepName, error);
    }

    protected async onCompensate(sagaId: string, failedStepName: string): Promise<void> {
        const saga = await this.getSagaOrThrow(sagaId);

        // Reverse logic based on where we failed
        if (failedStepName === 'Payment' || failedStepName === 'Delivery') {
            // If payment failed or delivery failed, we must release stock
            await this.publishCommand('StockRelease.Command', {
                sagaId,
                orderId: (saga.payload as OrderFulfillmentPayload).orderId
            }, sagaId);
        }

        if (failedStepName === 'Delivery') {
            // If delivery failed, we might need to refund payment
            await this.publishCommand('PaymentRefund.Command', {
                sagaId,
                orderId: (saga.payload as OrderFulfillmentPayload).orderId
            }, sagaId);
        }

        // Mark as compensated once commands are sent (Outbox ensures they go out)
        await this.markAsCompensated(sagaId);
    }
}
