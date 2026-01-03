import { EventEnvelope } from '../../events';
import { EventIdempotency } from '../middleware/idempotency';
import { enhancedEventBus } from '../../src/events/eventBus';

export interface IdempotentEventConsumer {
  name: string;
  handler: (envelope: EventEnvelope) => Promise<void>;
}

export class IdempotentEventBus {
  private eventIdempotency: EventIdempotency;

  constructor(redisUrl: string) {
    this.eventIdempotency = new EventIdempotency(redisUrl);
  }

  async subscribe(eventPattern: string, consumer: IdempotentEventConsumer): Promise<void> {
    const wrappedConsumer = {
      name: consumer.name,
      handler: async (envelope: EventEnvelope) => {
        await this.eventIdempotency.withIdempotency(
          envelope.eventId,
          consumer.name,
          () => consumer.handler(envelope)
        );
      }
    };

    enhancedEventBus.subscribe(eventPattern, wrappedConsumer);
  }

  async publish(envelope: EventEnvelope): Promise<void> {
    return enhancedEventBus.publish(envelope);
  }
}

export const idempotentEventBus = new IdempotentEventBus(
  process.env.REDIS_URL || 'redis://localhost:6379'
);