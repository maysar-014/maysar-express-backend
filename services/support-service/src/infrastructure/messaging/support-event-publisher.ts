import { injectable, inject, optional } from 'inversify';
import { TYPES } from '../../types';
import { EventBus, EventEnvelope } from '@shared-events/eventBus';
import { TicketCreatedEvent, TicketAssignedEvent, TicketResolvedEvent, TicketClosedEvent, MessageAddedEvent } from '../../domain/events/ticket-events';
import { IOutboxRepository } from '../../../../../shared/outbox/outbox.repository';

@injectable()
export class SupportEventPublisher {
    constructor(
        @inject(TYPES.EventBus) private eventBus: EventBus,
        @inject(TYPES.SupportOutboxRepository) @optional() private outboxRepository?: IOutboxRepository
    ) { }

    public async publishTicketCreated(event: TicketCreatedEvent): Promise<void> {
        await this.persistAndPublish('TicketCreated', event);
    }

    public async publishTicketAssigned(event: TicketAssignedEvent): Promise<void> {
        await this.persistAndPublish('TicketAssigned', event);
    }

    public async publishTicketResolved(event: TicketResolvedEvent): Promise<void> {
        await this.persistAndPublish('TicketResolved', event);
    }

    public async publishTicketClosed(event: TicketClosedEvent): Promise<void> {
        await this.persistAndPublish('TicketClosed', event);
    }

    public async publishMessageAdded(event: MessageAddedEvent): Promise<void> {
        await this.persistAndPublish('MessageAdded', event);
    }

    private async persistAndPublish(eventType: string, data: unknown): Promise<void> {
        const envelope: EventEnvelope = {
            eventId: crypto.randomUUID(),
            eventType,
            data,
            timestamp: new Date()
        };

        if (this.outboxRepository) {
            await this.outboxRepository.save(envelope);
        }

        await this.eventBus.publish(envelope);
    }
}
