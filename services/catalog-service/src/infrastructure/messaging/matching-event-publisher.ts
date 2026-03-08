// @ts-nocheck
import { EventBus } from '../../../shared/event-bus/event-bus';
import {
    ProductMatchFoundEvent,
    ProductMatchConfirmationRequiredEvent,
    ProductMatchConfirmedEvent,
    ProductMatchRejectedEvent,
    NewProductCreatedEvent,
} from '../../domain/events/matching-events';

export class MatchingEventPublisher {
    constructor(private readonly eventBus: EventBus) { }

    async publishMatchFound(event: ProductMatchFoundEvent): Promise<void> {
        await this.eventBus.publish(event.eventType, event);
    }

    async publishConfirmationRequired(event: ProductMatchConfirmationRequiredEvent): Promise<void> {
        await this.eventBus.publish(event.eventType, event);
    }

    async publishMatchConfirmed(event: ProductMatchConfirmedEvent): Promise<void> {
        await this.eventBus.publish(event.eventType, event);
    }

    async publishMatchRejected(event: ProductMatchRejectedEvent): Promise<void> {
        await this.eventBus.publish(event.eventType, event);
    }

    async publishNewProductCreated(event: NewProductCreatedEvent): Promise<void> {
        await this.eventBus.publish(event.eventType, event);
    }
}
