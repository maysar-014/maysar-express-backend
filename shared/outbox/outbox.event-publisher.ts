import { IOutboxRepository, OutboxStatus } from './outbox.repository';

export interface DomainEvent {
    eventId: string;
    eventType: string;
    aggregateId: string;
    version: number;
    timestamp: Date;
    payload: any;
    metadata?: Record<string, any>;
}

export class OutboxEventPublisher {
    constructor(private repository: IOutboxRepository) { }

    async publish(event: DomainEvent, transaction?: any): Promise<void> {
        await this.repository.save({
            eventId: event.eventId,
            eventType: event.eventType,
            eventData: event,
            status: OutboxStatus.PENDING
        }, transaction);
    }

    async publishAll(events: DomainEvent[], transaction?: any): Promise<void> {
        await Promise.all(events.map(event => this.publish(event, transaction)));
    }
}
