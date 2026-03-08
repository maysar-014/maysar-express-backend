import { EventEmitter } from 'events';
import { randomUUID } from 'crypto';
import { EventEnvelope, EventHandler, IEventBus, SubscriptionOptions } from '@shared-events/eventBus';

interface LegacyEventLike {
    type?: string;
    event?: string;
    eventType?: string;
    data?: any;
    payload?: any;
    metadata?: Record<string, any>;
    eventId?: string;
    correlationId?: string;
    timestamp?: Date | string;
}

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

    async publish(envelope: EventEnvelope): Promise<void>;
    async publish(eventType: string, data: any, metadata?: Record<string, any>): Promise<void>;
    async publish(
        eventTypeOrEnvelope: string | EventEnvelope | LegacyEventLike,
        data?: any,
        metadata?: Record<string, any>
    ): Promise<void> {
        const envelope = this.normalizeEnvelope(eventTypeOrEnvelope, data, metadata);
        const eventType = envelope.eventType || 'unknown';
        console.log(`[EventBus] Publishing event: ${eventType}`, envelope.data);
        this.eventEmitter.emit(eventType, envelope);
        // In a real microservices env, this would publish to RabbitMQ/Kafka/Redis
    }

    async emit(envelope: EventEnvelope): Promise<void>;
    async emit(eventType: string, data: any, metadata?: Record<string, any>): Promise<void>;
    async emit(
        eventTypeOrEnvelope: string | EventEnvelope | LegacyEventLike,
        data?: any,
        metadata?: Record<string, any>
    ): Promise<void> {
        await this.publish(eventTypeOrEnvelope as any, data, metadata);
    }

    async subscribe(eventType: string, handler: EventHandler): Promise<void>;
    async subscribe(eventType: string, options: SubscriptionOptions): Promise<void>;
    async subscribe(eventType: string, handlerOrOptions: EventHandler | SubscriptionOptions): Promise<void> {
        console.log(`[EventBus] Subscribing to event: ${eventType}`);
        const handler = typeof handlerOrOptions === 'function' ? handlerOrOptions : handlerOrOptions.handler;

        this.eventEmitter.on(eventType, async (event: EventEnvelope) => {
            try {
                await handler(event);
            } catch (error) {
                console.error(`[EventBus] Error handling event ${eventType}:`, error);
            }
        });
    }

    private normalizeEnvelope(
        eventTypeOrEnvelope: string | EventEnvelope | LegacyEventLike,
        data?: any,
        metadata?: Record<string, any>
    ): EventEnvelope {
        if (typeof eventTypeOrEnvelope === 'string') {
            return {
                eventId: metadata?.eventId || randomUUID(),
                eventType: eventTypeOrEnvelope,
                data,
                metadata,
                timestamp: new Date(),
                correlationId: metadata?.correlationId
            };
        }

        const eventType = eventTypeOrEnvelope.eventType || eventTypeOrEnvelope.type || eventTypeOrEnvelope.event;
        if (!eventType) {
            throw new Error('Event type is required for publish');
        }

        return {
            eventId: eventTypeOrEnvelope.eventId || eventTypeOrEnvelope.metadata?.eventId || randomUUID(),
            eventType,
            data: eventTypeOrEnvelope.data !== undefined ? eventTypeOrEnvelope.data : eventTypeOrEnvelope.payload,
            metadata: eventTypeOrEnvelope.metadata,
            timestamp: eventTypeOrEnvelope.timestamp ? new Date(eventTypeOrEnvelope.timestamp) : new Date(),
            correlationId: eventTypeOrEnvelope.correlationId || eventTypeOrEnvelope.metadata?.correlationId
        };
    }
}
