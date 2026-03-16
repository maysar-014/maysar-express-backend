import { IDomainEventPublisher, DomainEvent, UserRegisteredEvent, UserProfileUpdatedEvent, UserEmailVerifiedEvent } from '../../domain/events';
import { logger } from '../services/logger.service';
import { IOutboxRepository } from '../../../../../shared/outbox/outbox.repository';
import { eventBus, EventEnvelope, IEventPublisher } from '@shared/events/eventBus';

/**
 * User Event Publisher
 * Handles saving domain events for user-related operations using the Outbox pattern
 */
export class UserEventPublisher implements IDomainEventPublisher {
  constructor(
    private readonly outboxRepository: IOutboxRepository,
    private readonly events: IEventPublisher = eventBus
  ) { }

  /**
   * Save a single domain event to the outbox table
   */
  async publish(event: DomainEvent, transaction?: any): Promise<void> {
    try {
      const envelope: EventEnvelope = {
        eventId: event.eventId,
        eventType: event.eventType,
        aggregateId: event.aggregateId,
        aggregateType: event.aggregateType,
        version: String(event.eventVersion),
        data: this.sanitizeEventData(event),
        timestamp: event.occurredAt || new Date(),
        metadata: event.metadata || {}
      };

      await this.outboxRepository.save(envelope, transaction);

      logger.info('Domain Event Saved to Outbox', {
        eventType: event.constructor.name,
        eventId: event.eventId,
        aggregateId: event.aggregateId
      });

      // Best-effort in-process publish; outbox remains the source of truth for retries.
      try {
        await this.events.publish(envelope);
      } catch (publishError) {
        logger.warn('EventBus publish failed after outbox save', {
          eventType: event.eventType,
          eventId: event.eventId,
          error: publishError
        });
      }

    } catch (error) {
      logger.error('Failed to save domain event to Outbox', {
        eventType: event.constructor.name,
        eventId: event.eventId,
        error
      });
      throw error;
    }
  }

  /**
   * Save multiple domain events to the outbox table
   */
  async publishMany(events: DomainEvent[], transaction?: any): Promise<void> {
    await Promise.all(events.map(event => this.publish(event, transaction)));
  }



  /**
   * Publish user registered event
   */
  async publishUserRegistered(event: UserRegisteredEvent): Promise<void> {
    // Ensure metadata is defined for type compatibility
    const eventWithMetadata = {
      ...event,
      metadata: event.metadata || {}
    };
    await this.publish(eventWithMetadata as DomainEvent);
  }

  /**
   * Publish user profile updated event
   */
  async publishUserProfileUpdated(event: UserProfileUpdatedEvent): Promise<void> {
    // Ensure metadata is defined for type compatibility
    const eventWithMetadata = {
      ...event,
      metadata: event.metadata || {}
    };
    await this.publish(eventWithMetadata as DomainEvent);
  }

  /**
   * Publish user email verified event
   */
  async publishUserEmailVerified(event: UserEmailVerifiedEvent): Promise<void> {
    // Ensure metadata is defined for type compatibility
    const eventWithMetadata = {
      ...event,
      metadata: event.metadata || {}
    };
    await this.publish(eventWithMetadata as DomainEvent);
  }

  /**
   * Sanitize sensitive data from event payloads
   */
  private sanitizeEventData(event: any): any {
    const sanitized = { ...event };

    // Remove sensitive fields that shouldn't be logged
    const sensitiveFields = ['password', 'token', 'secret', 'twoFactorSecret'];

    function sanitize(obj: any): any {
      if (Array.isArray(obj)) {
        return obj.map(item => sanitize(item));
      }

      if (obj && typeof obj === 'object') {
        const result: any = {};
        for (const [key, value] of Object.entries(obj)) {
          if (sensitiveFields.includes(key.toLowerCase())) {
            result[key] = '[REDACTED]';
          } else {
            result[key] = sanitize(value);
          }
        }
        return result;
      }

      return obj;
    }

    return sanitize(sanitized);
  }

  /**
   * Simulate async publish operation
   * In production, this would be actual message queue publishing
   */
  private async simulateAsyncPublish(_event?: DomainEvent): Promise<void> {
    // Simulate network latency
    await new Promise(resolve => setTimeout(resolve, 10));

    // In production, you might want to implement:
    // - Retry logic with exponential backoff
    // - Dead letter queue for failed publishes
    // - Event versioning and schema validation
    // - Monitoring and metrics collection
  }

  /**
   * Batch publish multiple events
   * Useful for bulk operations
   */
  async publishBatch(events: Array<UserRegisteredEvent | UserProfileUpdatedEvent | UserEmailVerifiedEvent>): Promise<void> {
    const promises = events.map(event => {
      // Ensure metadata is defined for type compatibility
      const eventWithMetadata = {
        ...event,
        metadata: event.metadata || {}
      };
      return this.publish(eventWithMetadata as DomainEvent);
    });
    await Promise.all(promises);
  }
}
