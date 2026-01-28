import { IDomainEventPublisher, DomainEvent, UserRegisteredEvent, UserProfileUpdatedEvent, UserEmailVerifiedEvent } from '../../domain/events';
import { logger } from '../services/logger.service';

/**
 * User Event Publisher
 * Handles publishing domain events for user-related operations
 * In production, this would integrate with message queues like Kafka, RabbitMQ, etc.
 */
export class UserEventPublisher implements IDomainEventPublisher {
  /**
   * Publish a single domain event
   * In a real implementation, this would publish to a message queue
   */
  async publish(event: DomainEvent): Promise<void> {
    try {
      // Log the event for now (in production, publish to message queue)
      logger.info('Domain Event Published', {
        eventType: event.constructor.name,
        eventId: event.eventId,
        aggregateId: event.aggregateId,
        eventVersion: event.eventVersion,
        occurredAt: event.occurredAt,
        metadata: event.metadata || {},
        eventData: this.sanitizeEventData(event)
      });

      // In production, this would publish to Kafka/RabbitMQ/etc.
      // Example:
      // await this.messageQueue.publish('user.events', event.eventType, event);

      // For now, just simulate async operation
      await this.simulateAsyncPublish(event);

    } catch (error) {
      logger.error('Failed to publish domain event', {
        eventType: event.constructor.name,
        eventId: event.eventId,
        error
      });

      // In production, you might want to implement dead letter queue handling
      throw error;
    }
  }

  /**
   * Publish multiple domain events
   * Useful for bulk operations or transaction boundaries
   */
  async publishMany(events: DomainEvent[]): Promise<void> {
    const promises = events.map(event => this.publish(event));
    await Promise.all(promises);
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
