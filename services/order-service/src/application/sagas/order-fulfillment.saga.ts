import { DistributedSagaOrchestrator, SagaStep } from '@shared/saga/saga.orchestrator';
import { sagaLogRepository } from '../../infrastructure/repositories/saga.repository';
import { EventIdempotency } from '@shared/middleware/idempotency';
import { ISagaDeadLetterRepository } from '@shared/saga/saga-dead-letter.repository';

export interface OrderFulfillmentPayload {
    orderId: string;
    buyerId: string;
    sellerId: string;
    amount: number;
    items: Array<{ productId: string; quantity: number }>;
}

export interface OrderFulfillmentDeps {
    eventIdempotency: EventIdempotency;
    inventoryRepository?: { getReservationStatus(orderId: string): Promise<string | null> };
    paymentRepository?: { getPaymentStatus(orderId: string): Promise<string | null> };
    deadLetterRepository?: ISagaDeadLetterRepository;
}

export class OrderFulfillmentSaga extends DistributedSagaOrchestrator<OrderFulfillmentPayload> {
    protected sagaType = 'OrderFulfillmentSaga';
    private eventIdempotency: EventIdempotency;
    private inventoryRepository?: OrderFulfillmentDeps['inventoryRepository'];
    private paymentRepository?: OrderFulfillmentDeps['paymentRepository'];

    constructor(deps: EventIdempotency | OrderFulfillmentDeps) {
        // Support both legacy (EventIdempotency) and new (deps object) constructor forms
        const isFullDeps = (d: any): d is OrderFulfillmentDeps => d && typeof d === 'object' && 'eventIdempotency' in d;
        const fullDeps = isFullDeps(deps) ? deps : { eventIdempotency: deps };

        super(
            sagaLogRepository,
            'order-service',
            undefined, // outbox
            undefined, // stepRetryOptions (use defaults)
            undefined, // compensationRetryOptions (use defaults)
            fullDeps.deadLetterRepository
        );
        this.eventIdempotency = fullDeps.eventIdempotency;
        this.inventoryRepository = fullDeps.inventoryRepository;
        this.paymentRepository = fullDeps.paymentRepository;
    }

    protected async onStart(sagaId: string, payload: OrderFulfillmentPayload, correlationId?: string): Promise<void> {
        // Logging or initial setup if needed
    }

    protected defineSteps(): SagaStep<OrderFulfillmentPayload>[] {
        return [
            {
                name: 'StockReservation',
                execute: async (payload, sagaId) => {
                    await this.publishCommand('StockReservation.Command.v1', {
                        sagaId,
                        orderId: payload.orderId,
                        items: payload.items
                    }, sagaId);
                },
                compensate: async (payload, sagaId) => {
                    await this.publishCommand('StockRelease.Command.v1', {
                        sagaId,
                        orderId: payload.orderId
                    }, sagaId);
                },
                validateCompensation: async (payload) => {
                    if (!this.inventoryRepository) return true;
                    const status = await this.inventoryRepository.getReservationStatus(payload.orderId);
                    return status === null || status === 'RELEASED' || status === 'cancelled';
                }
            },
            {
                name: 'Payment',
                execute: async (payload, sagaId) => {
                    await this.publishCommand('Payment.Command.v1', {
                        sagaId,
                        orderId: payload.orderId,
                        amount: payload.amount,
                        buyerId: payload.buyerId
                    }, sagaId);
                },
                compensate: async (payload, sagaId) => {
                    await this.publishCommand('PaymentRefund.Command.v1', {
                        sagaId,
                        orderId: payload.orderId
                    }, sagaId);
                },
                validateCompensation: async (payload) => {
                    if (!this.paymentRepository) return true;
                    const status = await this.paymentRepository.getPaymentStatus(payload.orderId);
                    return status === 'REFUNDED' || status === 'CANCELLED';
                }
            },
            {
                name: 'Delivery',
                execute: async (payload, sagaId) => {
                    await this.publishCommand('Delivery.Command.v1', {
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
        await this.eventIdempotency.withIdempotency(sagaId, 'OrderFulfillmentSaga.StockReserved', () => this.completeStep(sagaId, 'StockReservation'));
    }

    async handlePaymentSuccess(sagaId: string): Promise<void> {
        await this.eventIdempotency.withIdempotency(sagaId, 'OrderFulfillmentSaga.PaymentSuccess', () => this.completeStep(sagaId, 'Payment'));
    }

    async handleDeliverySuccess(sagaId: string): Promise<void> {
        await this.eventIdempotency.withIdempotency(sagaId, 'OrderFulfillmentSaga.DeliverySuccess', () => this.completeStep(sagaId, 'Delivery'));
    }

    async handleFailure(sagaId: string, stepName: string, error: string): Promise<void> {
        await this.eventIdempotency.withIdempotency(`${sagaId}:${stepName}:failure`, 'OrderFulfillmentSaga.Failure', () => this.failStep(sagaId, stepName, error));
    }
}


