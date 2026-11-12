import { EventBusAdapter } from './EventBusAdapter';
import { ProcessAnalyticsEventUseCase } from '../../application/use-cases/ProcessAnalyticsEventUseCase';
import { EventEnvelope } from '@shared-events/eventBus';

const asRecord = (value: unknown): Record<string, any> =>
    typeof value === 'object' && value !== null ? (value as Record<string, any>) : {};

const asSellerId = (value: unknown): string | undefined => (typeof value === 'string' ? value : undefined);

const asAmount = (value: unknown): number | undefined => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
};

/**
 * Subscribes to the analytics-relevant events that are actually published on the
 * shared in-process event bus.
 *
 * This replaces an earlier version that listened for `order.created` and
 * `payment.processed` — event names no service ever publishes (the real order
 * path emits `OrderCreatedEvent` / `OrderDelivered`, and payment-service
 * publishes on its own private EventBus instance). As a result, `Analytics_Event`
 * and `Analytics_Metric` were never written from the order/payment flow.
 *
 * Handlers are intentionally non-throwing: the shared EventBus rethrows
 * subscriber failures to the publisher, so an analytics error must never break
 * an order or delivery request.
 */
export class EventSubscriber {
    constructor(
        private readonly eventBus: EventBusAdapter,
        private readonly processUseCase: ProcessAnalyticsEventUseCase
    ) { }

    initialize(): void {
        // Order placed (PlaceOrderUseCase emits OrderCreatedEvent; the publisher
        // wraps it so envelope.data is the event instance: { order, timestamp }).
        this.eventBus.subscribe('OrderCreatedEvent', async (envelope: EventEnvelope) => {
            const data = asRecord(envelope.data);
            const order = asRecord(data.order);
            await this.safeProcess({
                eventType: 'order',
                data: this.normalizeOrderPayload(order),
                source: 'order-service',
                fallbackSellerId: asSellerId(order.sellerId)
            });
        });

        // Seller confirmed stock; payload is flat ({ orderId, sellerId, ... }).
        this.eventBus.subscribe('order.pending_seller_verification', async (envelope: EventEnvelope) => {
            const data = asRecord(envelope.data);
            await this.safeProcess({
                eventType: 'order',
                data: this.normalizeOrderPayload(data),
                source: 'order-service',
                fallbackSellerId: asSellerId(data.sellerId)
            });
        });

        // Delivery confirmed (order.controller emits a flat payload with totalAmount).
        this.eventBus.subscribe('OrderDelivered', async (envelope: EventEnvelope) => {
            const data = asRecord(envelope.data);
            await this.safeProcess({
                eventType: 'order',
                data: this.normalizeOrderPayload(data),
                source: 'order-service',
                fallbackSellerId: asSellerId(data.sellerId)
            });
        });

        // Payment settled successfully (payment-service webhook; payload carries
        // `amount` directly). Counts toward payment revenue metrics.
        this.eventBus.subscribe('PaymentCompleted.v1', async (envelope: EventEnvelope) => {
            const data = asRecord(envelope.data);
            await this.safeProcess({
                eventType: 'payment',
                data: this.normalizeOrderPayload(data),
                source: 'payment-service'
            });
        });

        // Failed payments are recorded as events but deliberately NOT as
        // 'payment' (the engine derives revenue from that type) — otherwise
        // failed attempts would inflate revenue metrics.
        this.eventBus.subscribe('PaymentFailed.v1', async (envelope: EventEnvelope) => {
            const data = asRecord(envelope.data);
            await this.safeProcess({
                eventType: 'payment_failed',
                data: this.normalizeOrderPayload(data),
                source: 'payment-service'
            });
        });
    }

    /** Ensure the persisted payload always carries a numeric `amount` for revenue metrics. */
    private normalizeOrderPayload(data: Record<string, any>): Record<string, any> {
        const amount = asAmount(data.amount) ?? asAmount(data.totalAmount) ?? asAmount(data.total);
        return amount === undefined ? { ...data } : { ...data, amount };
    }

    private async safeProcess(params: {
        eventType: 'order' | 'payment' | 'payment_failed';
        data: Record<string, any>;
        source: string;
        fallbackSellerId?: string;
    }): Promise<void> {
        try {
            await this.processUseCase.execute({
                eventType: params.eventType,
                data: params.data,
                timestamp: new Date(),
                context: {
                    channel: 'unknown',
                    source: params.source,
                    sellerId: asSellerId(params.data.sellerId) ?? params.fallbackSellerId
                }
            });
        } catch {
            // Swallow analytics failures so they never surface to the publisher.
        }
    }
}
