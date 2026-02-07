
import { EventEmitter } from 'events';
import { IEventBus } from '../../domain/interfaces/IEventBus';

export class EventBusAdapter implements IEventBus {
    private static instance: EventBusAdapter;
    private eventEmitter: EventEmitter;

    constructor() {
        this.eventEmitter = new EventEmitter();
    }

    static getInstance(): EventBusAdapter {
        if (!EventBusAdapter.instance) {
            EventBusAdapter.instance = new EventBusAdapter();
        }
        return EventBusAdapter.instance;
    }

    async publish(event: any): Promise<void> {
        console.log(`[EventBus] Publishing event: ${event.type}`, event.payload);
        this.eventEmitter.emit(event.type, event);
        // In a real microservices env, this would publish to RabbitMQ/Kafka/Redis
    }

    subscribe(eventType: string, handler: (event: any) => Promise<void>): void {
        console.log(`[EventBus] Subscribing to event: ${eventType}`);
        this.eventEmitter.on(eventType, async (event) => {
            try {
                await handler(event);
            } catch (error) {
                console.error(`[EventBus] Error handling event ${eventType}:`, error);
            }
        });
    }
}
