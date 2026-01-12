import { EventPublisher } from '../../application/use-cases/place-order.use-case';

export class EventPublisherImpl implements EventPublisher {
  async publish(event: any): Promise<void> {
    // Simple console log for demo
    // In real implementation, this would publish to message broker
    console.log('Event published:', event.constructor.name, event);
  }
}
