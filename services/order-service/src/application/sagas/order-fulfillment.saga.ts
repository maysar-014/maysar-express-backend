import { DistributedSagaOrchestrator, SagaStep } from '@shared/saga/saga.orchestrator';
import { sagaLogRepository } from '../../infrastructure/repositories/saga.repository';

export interface OrderFulfillmentPayload {
    orderId: string;
    buyerId: string;
    sellerId: string;
    amount: number;
    items: Array<{ productId: string; quantity: number }>;
}

export class OrderFulfillmentSaga extends DistributedSagaOrchestrator<OrderFulfillmentPayload> {
    protected sagaType = 'OrderFulfillmentSaga';

    constructor() {
        super(sagaLogRepository, 'order-service');
    }

    protected async onStart(sagaId: string, payload: OrderFulfillmentPayload, correlationId?: string): Promise<void> {
        // Logging or initial setup if needed
    }

    protected defineSteps(): SagaStep<OrderFulfillmentPayload>[] {
        return [
            {
                name: 'StockReservation',
                execute: async (payload, sagaId) => {
                    await this.publishCommand('StockReservation.Command', {
                        sagaId,
                        orderId: payload.orderId,
                        items: payload.items
                    }, sagaId);
                },
                compensate: async (payload, sagaId) => {
                    await this.publishCommand('StockRelease.Command', {
                        sagaId,
                        orderId: payload.orderId
                    }, sagaId);
                }
            },
            {
                name: 'Payment',
                execute: async (payload, sagaId) => {
                    await this.publishCommand('Payment.Command', {
                        sagaId,
                        orderId: payload.orderId,
                        amount: payload.amount,
                        buyerId: payload.buyerId
                    }, sagaId);
                },
                compensate: async (payload, sagaId) => {
                    await this.publishCommand('PaymentRefund.Command', {
                        sagaId,
                        orderId: payload.orderId
                    }, sagaId);
                }
            },
            {
                name: 'Delivery',
                execute: async (payload, sagaId) => {
                    await this.publishCommand('Delivery.Command', {
                        sagaId,
                        orderId: payload.orderId,
                        sellerId: payload.sellerId
                    }, sagaId);
                },
                compensate: async () => {
                    // No specific delivery compensation needed if it's just scheduling
                }
            }
        ];
    }

    async handleStockReserved(sagaId: string): Promise<void> {
        await this.completeStep(sagaId, 'StockReservation');
    }

    async handlePaymentSuccess(sagaId: string): Promise<void> {
        await this.completeStep(sagaId, 'Payment');
    }

    async handleDeliverySuccess(sagaId: string): Promise<void> {
        await this.completeStep(sagaId, 'Delivery');
    }

    async handleFailure(sagaId: string, stepName: string, error: string): Promise<void> {
        await this.failStep(sagaId, stepName, error);
    }
}


