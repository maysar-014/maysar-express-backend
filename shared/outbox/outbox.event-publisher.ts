import { IOutboxRepository } from './outbox.repository';
import { EventEnvelope } from '../events/eventBus';

export interface DomainEvent {
    eventId: string;
    eventType: string;
    aggregateId: string;
    version: number;
    timestamp: Date;
    payload: unknown;
    metadata?: Record<string, unknown>;
}

export class OutboxEventPublisher {
    constructor(private repository: IOutboxRepository) { }

    async publish(event: DomainEvent): Promise<void> {
        const envelope: EventEnvelope = {
            eventId: event.eventId,
            eventType: event.eventType,
            data: event,
            timestamp: event.timestamp,
            metadata: event.metadata
        };
        await this.repository.save(envelope);
    }

    async publishAll(events: DomainEvent[]): Promise<void> {
        await Promise.all(events.map(event => this.publish(event)));
    }
}
