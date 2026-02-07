import { injectable, inject } from 'inversify';
import { TYPES } from '../../types';
import { EventBus, EventEnvelope } from '@shared/events/eventBus';
import { logger } from '../services/logger.service';
import { TicketLifecycleSaga, TicketLifecycleContext } from '../../application/sagas/ticket-lifecycle.saga';
import { TicketCreatedEvent } from '../../domain/events/ticket-events';

@injectable()
export class SupportEventSubscriber {
    constructor(
        @inject(TYPES.EventBus) private eventBus: EventBus
    ) { }

    public async initialize(): Promise<void> {
        await this.eventBus.subscribe('TicketCreated', this.handleTicketCreated.bind(this));
        await this.eventBus.subscribe('UserRegistered', this.handleUserRegistered.bind(this));
        logger.info('SupportEventSubscriber initialized');
    }

    private async handleTicketCreated(envelope: EventEnvelope): Promise<void> {
        const event = envelope.data as TicketCreatedEvent;
        logger.info(`Handling TicketCreated event for ${event.ticketId}`);

        const saga = new TicketLifecycleSaga();
        await saga.handleTicketCreated(event, `lifecycle-${event.ticketId}`);
    }

    private async handleUserRegistered(envelope: EventEnvelope): Promise<void> {
        const data = envelope.data;
        logger.info(`User registered: ${data.userId}. Ready to handle support for them.`);
        // Potential logic: create a default welcome ticket or similar
    }
}
