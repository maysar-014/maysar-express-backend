import { DomainEvent, IDomainEventPublisher } from '../../domain/events';
import { logger } from '../services/logger.service';

/**
 * Notification event publisher - Kafka/RabbitMQ
 */
export class NotificationEventPublisher implements IDomainEventPublisher {
  constructor(private publishToBus?: (event: DomainEvent) => Promise<void>) {}

  async publish(event: DomainEvent): Promise<void> {
    if (this.publishToBus) {
      await this.publishToBus(event);
    } else {
      logger.info('Event published (no bus)', { eventType: event.eventType, aggregateId: event.aggregateId });
    }
  }

  async publishMany(events: DomainEvent[]): Promise<void> {
    for (const event of events) {
      await this.publish(event);
    }
  }
}
