import { EventEnvelope, eventBus, EventHandler, IEventBus, SubscriptionOptions } from './eventBus';
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

  async subscribe(eventType: string, handler: EventHandler): Promise<void>;
  async subscribe(eventType: string, options: SubscriptionOptions): Promise<void>;
  async subscribe(eventType: string, handlerOrOptions: EventHandler | SubscriptionOptions): Promise<void> {
    const handler =
      typeof handlerOrOptions === 'function' ? handlerOrOptions : handlerOrOptions.handler;
    const wrappedHandler = async (envelope: EventEnvelope) => {
      if (envelope.eventId) {
        await this.eventIdempotency.withIdempotency(envelope.eventId, eventType, () => handler(envelope));
        return;
      }

      await handler(envelope);
    };

    if (typeof handlerOrOptions === 'function') {
      await eventBus.subscribe(eventType, wrappedHandler);
      return;
    }

    await eventBus.subscribe(eventType, {
      name: handlerOrOptions.name,
      handler: wrappedHandler
    });
  }

  async publish(envelope: EventEnvelope): Promise<void>;
  async publish(eventType: string, data: unknown, metadata?: Record<string, unknown>): Promise<void>;
  async publish(
    eventTypeOrEnvelope: string | EventEnvelope,
    data?: unknown,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    if (typeof eventTypeOrEnvelope === 'string') {
      await eventBus.publish(eventTypeOrEnvelope, data, metadata);
      return;
    }

    await eventBus.publish(eventTypeOrEnvelope);
  }

  async emit(envelope: EventEnvelope): Promise<void>;
  async emit(eventType: string, data: unknown, metadata?: Record<string, unknown>): Promise<void>;
  async emit(
    eventTypeOrEnvelope: string | EventEnvelope,
    data?: unknown,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    if (typeof eventTypeOrEnvelope === 'string') {
      await this.publish(eventTypeOrEnvelope, data, metadata);
      return;
    }

    await this.publish(eventTypeOrEnvelope);
  }
}

export const idempotentEventBus = new IdempotentEventBus(
  process.env.REDIS_URL || 'redis://localhost:6379'
);
