import { Notification } from '../../domain/entities/notification.entity';
import { logger } from '../../infrastructure/services/logger.service';
import { BaseSaga, SagaStep } from './saga-base';
import { v4 as uuidv4 } from 'uuid';

export interface BatchNotificationContext {
  notifications: Notification[];
  results: Array<{ id: string; success: boolean; error?: string }>;
  processed: number;
  metadata: { correlationId: string; timestamp: Date };
}

const CONCURRENCY_LIMIT = 5;

export class BatchNotificationSaga extends BaseSaga<BatchNotificationContext> {
  constructor(
    notifications: Notification[],
    private processSingle: (n: Notification) => Promise<void>
  ) {
    const correlationId = uuidv4();
    const context: BatchNotificationContext = {
      notifications,
      results: [],
      processed: 0,
      metadata: { correlationId, timestamp: new Date() }
    };
    super(`batch-notification-${correlationId}`, context);
    this.addStep(this.processBatchStep());
  }

  private processBatchStep(): SagaStep<BatchNotificationContext> {
    return {
      name: 'ProcessBatch',
      execute: async (ctx) => {
        const chunks: Notification[][] = [];
        for (let i = 0; i < ctx.notifications.length; i += CONCURRENCY_LIMIT) {
          chunks.push(ctx.notifications.slice(i, i + CONCURRENCY_LIMIT));
        }
        for (const chunk of chunks) {
          const settled = await Promise.allSettled(
            chunk.map(async (n) => {
              await this.processSingle(n);
              ctx.results.push({ id: n.id, success: true });
              ctx.processed++;
            })
          );
          settled.forEach((result, idx) => {
            if (result.status === 'rejected') {
              ctx.results.push({
                id: chunk[idx]!.id,
                success: false,
                error: result.reason?.message ?? String(result.reason)
              });
            }
          });
        }
        logger.info('Batch notification saga completed', {
          correlationId: ctx.metadata.correlationId,
          total: ctx.notifications.length,
          processed: ctx.processed,
          failed: ctx.results.filter((r) => !r.success).length
        });
      },
      compensate: async (ctx) => {
        logger.info('Batch compensation: log only', { correlationId: ctx.metadata.correlationId });
      },
      options: { timeoutMs: 120000 }
    };
  }
}
