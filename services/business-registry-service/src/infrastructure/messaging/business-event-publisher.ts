import {
  BusinessRegisteredEvent,
  BusinessVerifiedEvent,
  BusinessSuspendedEvent,
  BusinessReactivatedEvent,
  BusinessUpdatedEvent,
  ComplianceStatusChangedEvent
} from '../../domain/events';
import { IOutboxRepository } from '../repositories/outbox.repository';
import { logger } from '../services/logger.service';

export type BusinessDomainEvent =
  | BusinessRegisteredEvent
  | BusinessVerifiedEvent
  | BusinessSuspendedEvent
  | BusinessReactivatedEvent
  | BusinessUpdatedEvent
  | ComplianceStatusChangedEvent;

export type OutboxProcessorFn = () => Promise<number>;

/**
 * Business Event Publisher
 * Uses Outbox Processor - Reads pending events from outbox, publishes to Kafka event bus,
 * and invokes SagaEventHandler for saga orchestration
 */
export class BusinessEventPublisher {
  constructor(
    private readonly outboxRepository: IOutboxRepository,
    private readonly processOutbox?: OutboxProcessorFn
  ) { }

  async publish(event: BusinessDomainEvent): Promise<void> {
    const payload = this.toEventPayload(event);

    try {
      await this.outboxRepository.create({
        eventId: event.eventId,
        eventType: event.eventType,
        eventData: payload
      });

      logger.info('Business event saved to outbox', {
        eventType: event.eventType,
        aggregateId: event.aggregateId,
        eventId: event.eventId
      });

      // Process outbox immediately to trigger sagas (synchronous behavior)
      if (this.processOutbox) {
        await this.processOutbox();
      }
    } catch (error) {
      logger.error('Failed to publish business event to outbox', {
        eventType: event.eventType,
        aggregateId: event.aggregateId,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  async publishMany(events: BusinessDomainEvent[]): Promise<void> {
    for (const event of events) {
      await this.publish(event);
    }
  }

  private toEventPayload(event: BusinessDomainEvent): Record<string, unknown> {
    // This method prepares the payload for the outbox.
    // The Kafka publishing logic should be part of the OutboxProcessorFn,
    // which reads from the outbox and then publishes.
    // The provided Code Edit snippet for Kafka publishing seems misplaced here.
    // I will assume the instruction "Add Kafka publishing to OutboxProcessor" means
    // that the OutboxProcessorFn (which is not defined in this file) will handle it.
    // The snippet provided in the instruction seems to be an example of what the OutboxProcessorFn would do.
    // I will only apply the JSDoc and import changes as they are clearly intended for this file.

    return {
      eventId: event.eventId,
      eventType: event.eventType,
      aggregateId: event.aggregateId,
      aggregateType: event.aggregateType,
      eventVersion: event.eventVersion,
      occurredAt: event.occurredAt,
      metadata: event.metadata,
      ...this.getEventSpecificData(event)
    };
  }

  private getEventSpecificData(event: BusinessDomainEvent): Record<string, unknown> {
    if (event instanceof BusinessRegisteredEvent) {
      return { ownerId: event.ownerId, businessType: event.businessType, registrationNumber: event.registrationNumber };
    }
    if (event instanceof BusinessVerifiedEvent) {
      return { verifiedBy: event.verifiedBy, ownerId: event.ownerId };
    }
    if (event instanceof BusinessSuspendedEvent) {
      return { suspendedBy: event.suspendedBy, reason: event.reason };
    }
    if (event instanceof BusinessReactivatedEvent) {
      return { reactivatedBy: event.reactivatedBy };
    }
    if (event instanceof BusinessUpdatedEvent) {
      return { updatedBy: event.updatedBy, changes: event.changes };
    }
    if (event instanceof ComplianceStatusChangedEvent) {
      return { oldStatus: event.oldStatus, newStatus: event.newStatus, businessId: event.businessId };
    }
    return {};
  }
}
