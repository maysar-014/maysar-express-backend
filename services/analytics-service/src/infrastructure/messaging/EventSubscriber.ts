import { EventBusAdapter } from './EventBusAdapter';
import { ProcessAnalyticsEventUseCase } from '../../application/use-cases/ProcessAnalyticsEventUseCase';
import { EventEnvelope } from '@shared-events/eventBus';

const asRecord = (value: unknown): Record<string, unknown> =>
    typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};

const asSellerId = (value: unknown): string | undefined => (typeof value === 'string' ? value : undefined);

export class EventSubscriber {
    constructor(
        private readonly eventBus: EventBusAdapter,
        private readonly processUseCase: ProcessAnalyticsEventUseCase
    ) { }

    initialize(): void {
        // Subscriber for order events
        this.eventBus.subscribe('order.created', async (envelope: EventEnvelope) => {
            const data = asRecord(envelope.data);
            await this.processUseCase.execute({
                eventType: 'order',
                data,
                timestamp: new Date(),
                context: {
                    channel: 'unknown',
                    source: 'order-service',
                    sellerId: asSellerId(data.sellerId)
                }
            });
        });

        // Subscriber for payment events
        this.eventBus.subscribe('payment.processed', async (envelope: EventEnvelope) => {
            const data = asRecord(envelope.data);
            await this.processUseCase.execute({
                eventType: 'payment',
                data,
                timestamp: new Date(),
                context: {
                    channel: 'unknown',
                    source: 'payment-service',
                    sellerId: asSellerId(data.sellerId)
                }
            });
        });
    }
}
