import { Notification } from '../../domain/entities/notification.entity';
import { logger } from '../../infrastructure/services/logger.service';
import { DistributedSagaOrchestrator, SagaStep } from '@shared/saga/saga.orchestrator';
import { sagaLogRepository } from '../../infrastructure/repositories/saga.repository';
import { v4 as uuidv4 } from 'uuid';

export interface BatchNotificationContext {
  notifications: Notification[];
  results: Array<{ id: string; success: boolean; error?: string }>;
  processed: number;
  metadata: { correlationId: string; timestamp: Date };
}

const CONCURRENCY_LIMIT = 5;

export class BatchNotificationSaga extends DistributedSagaOrchestrator<BatchNotificationContext> {
  protected sagaType = 'BatchNotificationSaga';

  constructor(
    private processSingle: (n: Notification) => Promise<void>
  ) {
    super(sagaLogRepository, 'notification-service');
  }

  protected async onStart(sagaId: string, payload: BatchNotificationContext, correlationId?: string): Promise<void> {
    logger.info(`Starting BatchNotificationSaga`, { sagaId, correlationId, count: payload.notifications.length });
  }

  protected async onCompensate(sagaId: string, failedStepName: string): Promise<void> {
    logger.info(`Compensating BatchNotificationSaga failed at ${failedStepName}`, { sagaId });
  }

  protected defineSteps(): SagaStep<BatchNotificationContext>[] {
    return [
      {
        name: 'ProcessBatch',
        execute: async (ctx, sagaId) => {
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
        compensate: async (ctx, sagaId) => {
          logger.info('Batch compensation: log only', { correlationId: ctx.metadata.correlationId, sagaId });
        }
      }
    ];
  }
}

export async function executeBatchNotificationSaga(
  notifications: Notification[],
  processSingle: (n: Notification) => Promise<void>
): Promise<void> {
  const saga = new BatchNotificationSaga(processSingle);
  const correlationId = uuidv4();
  const context: BatchNotificationContext = {
    notifications,
    results: [],
    processed: 0,
    metadata: { correlationId, timestamp: new Date() }
  };

  try {
    await saga.start(context, correlationId);
  } catch (error) {
    logger.error('Batch notification saga failed', {
      error: error instanceof Error ? error.message : String(error),
      correlationId
    });
    throw error;
  }
}
