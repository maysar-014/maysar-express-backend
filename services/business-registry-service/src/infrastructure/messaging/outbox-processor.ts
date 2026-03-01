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

    // Publish to Kafka event bus - saga handlers will be invoked via setupSubscriptions
    await eventBus.publish(eventType, record.eventData, {
      eventId: record.eventId,
      source: 'business-registry-service'
    });

    logger.debug('Published event to Kafka', { eventType, eventId: record.eventId });
  }


}
