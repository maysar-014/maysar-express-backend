import { injectable, inject } from 'inversify';
import { TYPES } from '../../types';
import { EventBus } from '../../../../shared/events/eventBus';
import { TicketCreatedEvent, TicketAssignedEvent, TicketResolvedEvent, TicketClosedEvent, MessageAddedEvent } from '../../domain/events/ticket-events';

@injectable()
export class SupportEventPublisher {
    constructor(
        @inject(TYPES.EventBus) private eventBus: EventBus
    ) { }

    public async publishTicketCreated(event: TicketCreatedEvent): Promise<void> {
        await this.eventBus.publish('TicketCreated', event);
    }

    public async publishTicketAssigned(event: TicketAssignedEvent): Promise<void> {
        await this.eventBus.publish('TicketAssigned', event);
    }

    public async publishTicketResolved(event: TicketResolvedEvent): Promise<void> {
        await this.eventBus.publish('TicketResolved', event);
    }

    public async publishTicketClosed(event: TicketClosedEvent): Promise<void> {
        await this.eventBus.publish('TicketClosed', event);
    }

    public async publishMessageAdded(event: MessageAddedEvent): Promise<void> {
        await this.eventBus.publish('MessageAdded', event);
    }
}
