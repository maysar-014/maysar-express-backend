import { DomainEvent } from '../../domain/events/sms.events';

/**
 * Event Publisher Interface
 */
export interface IEventPublisher {
    publish(eventType: string, payload: any): Promise<void>;
    publishBatch(events: DomainEvent[]): Promise<void>;
}

/**
 * Simple Event Publisher Implementation
 * Publishes events to an in-memory event bus or message queue
 */
export class EventPublisher implements IEventPublisher {
    constructor(private readonly logger?: any) { }

    async publish(eventType: string, payload: any): Promise<void> {
        try {
            // In a real implementation, this would publish to:
            // - Node.js EventEmitter
            // - Kafka
            // - RabbitMQ
            // - Redis Pub/Sub
            // etc.

            if (this.logger && process.env.NODE_ENV !== 'test') {
                this.logger.info('Event published', {
                    eventType,
                    payload,
                    timestamp: new Date().toISOString()
                });
            }

            // TODO: Implement actual event bus integration
            // Example: await this.eventBus.emit(eventType, payload);
        } catch (error) {
            if (this.logger) {
                this.logger.error('Failed to publish event', {
                    eventType,
                    error: error instanceof Error ? error.message : 'Unknown error'
                });
            }
            // Don't throw - event publishing failures shouldn't break the main flow
        }
    }

    async publishBatch(events: DomainEvent[]): Promise<void> {
        for (const event of events) {
            await this.publish(event.eventType, event.payload);
        }
    }
}
