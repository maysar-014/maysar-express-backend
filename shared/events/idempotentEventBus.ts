import { EventEnvelope, eventBus, IEventBus } from './eventBus';
import { EventIdempotency } from '../middleware/idempotency';

export interface IdempotentEventConsumer {
  name: string;
  handler: (envelope: EventEnvelope) => Promise<void>;
}

export class IdempotentEventBus implements IEventBus {
  private eventIdempotency: EventIdempotency;

  constructor(redisUrl: string) {
    this.eventIdempotency = new EventIdempotency(redisUrl);
  }

  async subscribe(eventPattern: string, consumer: IdempotentEventConsumer): Promise<void> {
    const wrappedConsumer = {
      name: consumer.name,
      handler: async (envelope: EventEnvelope) => {
        if (envelope.eventId) {
          await this.eventIdempotency.withIdempotency(
            envelope.eventId,
            consumer.name,
            () => consumer.handler(envelope)
          );
        } else {
          await consumer.handler(envelope);
        }
      }
    };

    eventBus.subscribe(eventPattern, wrappedConsumer.handler);
  }

  async publish(eventTypeOrObject: string | { type?: string; event?: string; data?: any; payload?: any }, data?: any, metadata?: any): Promise<void> {
    if (typeof eventTypeOrObject === 'string') {
      return eventBus.publish(eventTypeOrObject, data, metadata);
    } else {
      return eventBus.publish(eventTypeOrObject);
    }
  }
}

export const idempotentEventBus = new IdempotentEventBus(
  process.env.REDIS_URL || 'redis://localhost:6379'
);