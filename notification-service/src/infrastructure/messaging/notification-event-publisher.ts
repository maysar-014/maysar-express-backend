import { DomainEvent, IDomainEventPublisher } from '../../domain/events';
import { logger } from '../services/logger.service';
import { IOutboxRepository, OutboxStatus } from '../../../../shared/outbox/outbox.repository';

/**
 * Notification event publisher - Outbox-based
 */
export class NotificationEventPublisher implements IDomainEventPublisher {
  constructor(private readonly outboxRepository: IOutboxRepository) { }

  async publish(event: DomainEvent, transaction?: any): Promise<void> {
    try {
      await this.outboxRepository.save({
        eventId: event.eventId,
        eventType: event.eventType,
        eventData: event,
        status: OutboxStatus.PENDING
      }, transaction);
      logger.info('Event saved to Outbox', { eventType: event.eventType, aggregateId: event.aggregateId });
    } catch (error) {
      logger.error('Failed to save event to Outbox', { eventType: event.eventType, error });
      throw error;
    }
  }

  async publishMany(events: DomainEvent[], transaction?: any): Promise<void> {
    await Promise.all(events.map(event => this.publish(event, transaction)));
  }
}


