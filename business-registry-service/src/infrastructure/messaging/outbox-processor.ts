import {
  BusinessRegisteredEvent,
  BusinessVerifiedEvent,
  BusinessSuspendedEvent,
  BusinessReactivatedEvent,
  BusinessUpdatedEvent
} from '../../domain/events';
import { IOutboxRepository, OutboxEventRecord } from '../repositories/outbox.repository';
import { SagaEventHandler } from '../../application/sagas/saga-event-handler';
import { logger } from '../services/logger.service';
import { eventBus } from '../../../../shared/events/eventBus';

/**
 * Outbox Processor - Reads pending events from outbox, publishes to event bus,
 * and invokes SagaEventHandler for saga orchestration
 */
export class OutboxProcessor {
  constructor(
    private readonly outboxRepository: IOutboxRepository,
    private readonly sagaEventHandler: SagaEventHandler
  ) { }

  async processPending(): Promise<number> {
    const pending = await this.outboxRepository.getPending(20);
    let processed = 0;

    for (const record of pending) {
      try {
        await this.processEvent(record);
        await this.outboxRepository.markPublished(record.id);
        processed++;
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : String(error);
        logger.error('OutboxProcessor: failed to process event', {
          outboxId: record.id,
          eventType: record.eventType,
          error: errMsg
        });
        await this.outboxRepository.incrementRetry(record.id, errMsg);
      }
    }

    return processed;
  }

  private async processEvent(record: OutboxEventRecord): Promise<void> {
    const { eventType } = record;

    // Publish to Kafka event bus
    await eventBus.publish(eventType, record.eventData, {
      eventId: record.eventId,
      source: 'business-registry-service'
    });

    logger.debug('Published event to Kafka', { eventType, eventId: record.eventId });

    // Invoke saga handler based on event type
    const domainEvent = this.reconstructEvent(record);
    if (!domainEvent) {
      logger.warn('OutboxProcessor: unknown event type', { eventType });
      return;
    }

    switch (eventType) {
      case 'BusinessRegistered':
        await this.sagaEventHandler.handleBusinessRegisteredEvent(domainEvent as BusinessRegisteredEvent);
        break;
      case 'BusinessVerified':
        await this.sagaEventHandler.handleBusinessVerifiedEvent(domainEvent as BusinessVerifiedEvent);
        break;
      case 'BusinessSuspended':
        await this.sagaEventHandler.handleBusinessSuspendedEvent(domainEvent as BusinessSuspendedEvent);
        break;
      case 'BusinessUpdated':
        await this.sagaEventHandler.handleBusinessUpdatedEvent(domainEvent as BusinessUpdatedEvent);
        break;
      case 'BusinessReactivated':
        await this.sagaEventHandler.handleBusinessReactivatedEvent(domainEvent as BusinessReactivatedEvent);
        break;
      default:
        logger.warn('OutboxProcessor: no saga handler for event type', { eventType });
    }
  }

  private reconstructEvent(record: OutboxEventRecord): unknown {
    const { eventType, eventData } = record;
    const p = eventData as Record<string, unknown>;

    switch (eventType) {
      case 'BusinessRegistered':
        return new BusinessRegisteredEvent(
          p.aggregateId as string,
          p.ownerId as string,
          p.businessType as never,
          p.registrationNumber as string,
          p.metadata as Record<string, unknown>
        );
      case 'BusinessVerified':
        return new BusinessVerifiedEvent(
          p.aggregateId as string,
          p.verifiedBy as string,
          p.ownerId as string,
          p.metadata as Record<string, unknown>
        );
      case 'BusinessSuspended':
        return new BusinessSuspendedEvent(
          p.aggregateId as string,
          p.suspendedBy as string,
          p.reason as string | undefined,
          p.metadata as Record<string, unknown>
        );
      case 'BusinessUpdated':
        return new BusinessUpdatedEvent(
          p.aggregateId as string,
          p.updatedBy as string,
          (p.changes as string[]) ?? [],
          p.metadata as Record<string, unknown>
        );
      case 'BusinessReactivated':
        return new BusinessReactivatedEvent(
          p.aggregateId as string,
          p.reactivatedBy as string,
          p.metadata as Record<string, unknown>
        );
      default:
        return null;
    }
  }
}
