/**
 * User Event Publisher
 * Publishes user domain events to message broker
 */

import { DomainEvent, IDomainEventPublisher } from '../../domain/events';
import { logger } from '../services/logger.service';

export class UserEventPublisher implements IDomainEventPublisher {
  async publish(event: DomainEvent): Promise<void> {
    try {
      // For now, just log the event (in production, this would publish to a message queue)
      logger.info('Event published:', { eventId: event.eventId, eventType: event.eventType });
    } catch (error) {
      logger.error('Failed to publish event:', { eventId: event.eventId, error });
      throw error;
    }
  }

  async publishMany(events: DomainEvent[]): Promise<void> {
    try {
      await Promise.all(events.map(event => this.publish(event)));
      logger.info('Events published:', { count: events.length });
    } catch (error) {
      logger.error('Failed to publish events:', { error });
      throw error;
    }
  }
}
