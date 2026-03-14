import { v4 as uuidv4 } from 'uuid';
import { eventBus, EventEnvelope, IEventPublisher } from '@shared/events/eventBus';
import { OutboxRepository } from '@shared/outbox/outbox.repository';
import { logger } from '../services/logger.service';

export type AuthEventType =
  | 'AuthLoginSuccess'
  | 'AuthLoginFailed'
  | 'AuthTwoFactorEnabled'
  | 'AuthTwoFactorDisabled';

export class AuthEventPublisher {
  constructor(
    private readonly outbox: OutboxRepository,
    private readonly events: IEventPublisher = eventBus
  ) {}

  async publish(eventType: AuthEventType, data: Record<string, unknown>, metadata: Record<string, unknown> = {}): Promise<void> {
    const envelope: EventEnvelope = {
      eventId: uuidv4(),
      eventType,
      data,
      timestamp: new Date(),
      metadata: {
        source: 'auth-service',
        ...metadata
      }
    };

    await this.outbox.save(envelope);

    try {
      await this.events.publish(envelope);
    } catch (error) {
      logger.warn('Auth event publish failed after outbox save', {
        eventType,
        eventId: envelope.eventId,
        error
      });
    }
  }
}
