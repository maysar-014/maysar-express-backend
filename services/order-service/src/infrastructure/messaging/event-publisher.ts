import { EventPublisher } from '../../application/use-cases/place-order.use-case';
import { IOutboxRepository, OutboxStatus } from '../../../../../shared/outbox/outbox.repository';

export class EventPublisherImpl implements EventPublisher {
  constructor(private readonly outboxRepository: IOutboxRepository) { }

  async publish(event: any, transaction?: any): Promise<void> {
    await this.outboxRepository.save({
      eventId: event.id || Math.random().toString(36).substr(2, 9),
      eventType: event.constructor.name,
      eventData: event
    }, transaction);
    console.log('Event saved to Outbox:', event.constructor.name);
  }
}


