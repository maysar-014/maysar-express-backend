import { eventBus, EventEnvelope } from '@shared/events/eventBus';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../services/logger.service';

/**
 * EventPublisher handles publishing domain events from the 2FA service.
 */
export class EventPublisher {
    /**
     * Publishes a domain event to the event bus.
     * This can be extended to use the outbox pattern.
     */
    public async publish(eventType: string, data: Record<string, unknown>, metadata: Record<string, unknown> = {}): Promise<void> {
        const envelope: EventEnvelope = {
            eventId: uuidv4(),
            eventType,
            data,
            metadata,
            timestamp: new Date()
        };

        await eventBus.publish(envelope);

        logger.info(`[EventPublisher] Event published: ${eventType}`, { userId: data.userId });
    }
}
