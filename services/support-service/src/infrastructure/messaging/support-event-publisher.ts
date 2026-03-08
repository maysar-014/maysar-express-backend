import { injectable, inject } from 'inversify';
import { TYPES } from '../../types';
import { EventBus, EventEnvelope } from '@shared-events/eventBus';
import { TicketCreatedEvent, TicketAssignedEvent, TicketResolvedEvent, TicketClosedEvent, MessageAddedEvent } from '../../domain/events/ticket-events';

@injectable()
export class SupportEventPublisher {
    constructor(
        @inject(TYPES.EventBus) private eventBus: EventBus
    ) { }

    public async publishTicketCreated(event: TicketCreatedEvent): Promise<void> {
        const envelope: EventEnvelope = { eventId: crypto.randomUUID(), eventType: 'TicketCreated', data: event, timestamp: new Date() };
        await this.eventBus.publish(envelope);
    }

    public async publishTicketAssigned(event: TicketAssignedEvent): Promise<void> {
        const envelope: EventEnvelope = { eventId: crypto.randomUUID(), eventType: 'TicketAssigned', data: event, timestamp: new Date() };
        await this.eventBus.publish(envelope);
    }

    public async publishTicketResolved(event: TicketResolvedEvent): Promise<void> {
        const envelope: EventEnvelope = { eventId: crypto.randomUUID(), eventType: 'TicketResolved', data: event, timestamp: new Date() };
        await this.eventBus.publish(envelope);
    }

    public async publishTicketClosed(event: TicketClosedEvent): Promise<void> {
        const envelope: EventEnvelope = { eventId: crypto.randomUUID(), eventType: 'TicketClosed', data: event, timestamp: new Date() };
        await this.eventBus.publish(envelope);
    }

    public async publishMessageAdded(event: MessageAddedEvent): Promise<void> {
        const envelope: EventEnvelope = { eventId: crypto.randomUUID(), eventType: 'MessageAdded', data: event, timestamp: new Date() };
        await this.eventBus.publish(envelope);
    }
}
