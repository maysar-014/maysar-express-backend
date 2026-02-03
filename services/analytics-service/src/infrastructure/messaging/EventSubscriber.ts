import { EventBusAdapter } from './EventBusAdapter';
import { ProcessAnalyticsEventUseCase } from '../../application/use-cases/ProcessAnalyticsEventUseCase';

export class EventSubscriber {
    constructor(
        private readonly eventBus: EventBusAdapter,
        private readonly processUseCase: ProcessAnalyticsEventUseCase
    ) { }

    initialize(): void {
        // Subscriber for order events
        this.eventBus.subscribe('order.created', async (data) => {
            await this.processUseCase.execute({
                eventType: 'order',
                data,
                timestamp: new Date(),
                context: {
                    channel: 'unknown',
                    source: 'order-service',
                    sellerId: data.sellerId
                }
            });
        });

        // Subscriber for payment events
        this.eventBus.subscribe('payment.processed', async (data) => {
            await this.processUseCase.execute({
                eventType: 'payment',
                data,
                timestamp: new Date(),
                context: {
                    channel: 'unknown',
                    source: 'payment-service',
                    sellerId: data.sellerId
                }
            });
        });
    }
}
