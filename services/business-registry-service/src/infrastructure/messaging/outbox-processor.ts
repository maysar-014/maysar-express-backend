import { IOutboxRepository, OutboxEventRecord } from '../repositories/outbox.repository';
import { SagaEventHandler } from '../../application/sagas/saga-event-handler';
import { logger } from '../services/logger.service';
import { EventEnvelope, eventBus } from '@shared-events/eventBus';

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
    const eventData = record.eventData as Partial<EventEnvelope>;
    const envelope: EventEnvelope = {
      eventId: eventData.eventId || record.eventId,
      eventType: eventData.eventType || record.eventType,
      data: eventData.data !== undefined ? eventData.data : record.eventData,
      metadata: {
        ...(eventData.metadata || {}),
        eventId: record.eventId,
        source: 'business-registry-service'
      },
      timestamp: eventData.timestamp ? new Date(eventData.timestamp) : new Date(record.createdAt),
      correlationId: eventData.correlationId || (eventData.metadata?.correlationId as string | undefined)
    };

    await eventBus.publish(envelope);

    logger.debug('Published event to Kafka', { eventType: envelope.eventType, eventId: record.eventId });
  }


}
