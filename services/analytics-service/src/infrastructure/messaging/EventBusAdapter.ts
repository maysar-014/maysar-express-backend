import { randomUUID } from 'crypto';
import {
    EventEnvelope,
    EventHandler,
    IEventBus,
    SubscriptionOptions,
    eventBus
} from '@shared-events/eventBus';

interface LegacyEventObject {
    type?: string;
    event?: string;
    eventType?: string;
    data?: any;
    payload?: any;
    metadata?: Record<string, any>;
    eventId?: string;
    timestamp?: Date | string;
    correlationId?: string;
}

export class EventBusAdapter implements IEventBus {
    async publish(envelope: EventEnvelope): Promise<void>;
    async publish(eventType: string, data: any, metadata?: Record<string, any>): Promise<void>;
    async publish(
        eventTypeOrObject: string | EventEnvelope | LegacyEventObject,
        data?: any,
        metadata?: Record<string, any>
    ): Promise<void> {
        const envelope =
            typeof eventTypeOrObject === 'string'
                ? this.buildEnvelope(eventTypeOrObject, data, metadata)
                : this.normalizeEnvelope(eventTypeOrObject, data, metadata);

        await eventBus.publish(envelope);
    }

    async emit(envelope: EventEnvelope): Promise<void>;
    async emit(eventType: string, data: any, metadata?: Record<string, any>): Promise<void>;
    async emit(
        eventTypeOrObject: string | EventEnvelope | LegacyEventObject,
        data?: any,
        metadata?: Record<string, any>
    ): Promise<void> {
        await this.publish(eventTypeOrObject as any, data, metadata);
    }

    async subscribe(eventType: string, handler: EventHandler): Promise<void>;
    async subscribe(eventType: string, options: SubscriptionOptions): Promise<void>;
    async subscribe(eventType: string, handlerOrOptions: EventHandler | SubscriptionOptions): Promise<void> {
        if (typeof handlerOrOptions === 'function') {
            await eventBus.subscribe(eventType, handlerOrOptions);
            return;
        }

        await eventBus.subscribe(eventType, handlerOrOptions);
    }

    private normalizeEnvelope(
        eventObject: EventEnvelope | LegacyEventObject,
        fallbackData?: any,
        fallbackMetadata?: Record<string, any>
    ): EventEnvelope {
        const eventType = eventObject.eventType || eventObject.type || eventObject.event;
        if (!eventType) {
            throw new Error('Event type is required for publishing');
        }

        const payload =
            eventObject.data !== undefined
                ? eventObject.data
                : eventObject.payload !== undefined
                    ? eventObject.payload
                    : fallbackData;

        const metadata = {
            ...(eventObject.metadata || {}),
            ...(fallbackMetadata || {})
        };

        return this.buildEnvelope(
            eventType,
            payload,
            metadata,
            eventObject.eventId,
            eventObject.timestamp,
            eventObject.correlationId
        );
    }

    private buildEnvelope(
        eventType: string,
        data: any,
        metadata?: Record<string, any>,
        eventId?: string,
        timestamp?: Date | string,
        correlationId?: string
    ): EventEnvelope {
        return {
            eventId: eventId || metadata?.eventId || randomUUID(),
            eventType,
            data,
            metadata,
            timestamp: timestamp instanceof Date ? timestamp : timestamp ? new Date(timestamp) : new Date(),
            correlationId: correlationId || metadata?.correlationId
        };
    }
}
