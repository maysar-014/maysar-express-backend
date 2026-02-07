import { eventBus } from '../../../../shared/events/eventBus';

/**
 * EventPublisher handles publishing domain events from the 2FA service.
 */
export class EventPublisher {
    /**
     * Publishes a domain event to the event bus.
     * This can be extended to use the outbox pattern.
     */
    public async publish(eventType: string, data: any, metadata: any = {}): Promise<void> {
        const timestamp = new Date();

        // In a production environment, this would save to user_service_outbox_events
        // to ensure atomic transactions with domain logic.

        await eventBus.publish(eventType, {
            ...data,
            occurredAt: timestamp
        }, metadata);

        console.log(`[EventPublisher] Event published: ${eventType}`, { userId: data.userId });
    }
}
