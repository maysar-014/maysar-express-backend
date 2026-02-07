import { Notification } from '../../domain/entities/notification.entity';
import { INotificationRepository } from '../../domain/repositories';
import { logger } from '../../infrastructure/services/logger.service';
import { DistributedSagaOrchestrator, SagaStep } from '@shared/saga/saga.orchestrator';
import { sagaLogRepository } from '../../infrastructure/repositories/saga.repository';
import { v4 as uuidv4 } from 'uuid';

export interface ScheduledNotificationContext {
  notification: Notification;
  scheduledAt: Date;
  cancelled: boolean;
  metadata: { correlationId: string; timestamp: Date };
}

export class ScheduledNotificationSaga extends DistributedSagaOrchestrator<ScheduledNotificationContext> {
  protected sagaType = 'ScheduledNotificationSaga';

  constructor(
    private notificationRepository: INotificationRepository,
    private triggerDelivery: (n: Notification) => Promise<void>
  ) {
    super(sagaLogRepository, 'notification-service');
  }

  protected async onStart(sagaId: string, payload: ScheduledNotificationContext, correlationId?: string): Promise<void> {
    logger.info(`Starting ScheduledNotificationSaga`, { sagaId, correlationId, notificationId: payload.notification.id });
  }

  protected async onCompensate(sagaId: string, failedStepName: string): Promise<void> {
    logger.info(`Compensating ScheduledNotificationSaga failed at ${failedStepName}`, { sagaId });
  }

  protected defineSteps(): SagaStep<ScheduledNotificationContext>[] {
    return [
      {
        name: 'TriggerAtScheduledTime',
        execute: async (ctx, sagaId) => {
          if (ctx.cancelled) return;
          if (ctx.notification.isExpired()) {
            logger.warn('Scheduled notification expired', { notificationId: ctx.notification.id, sagaId });
            return;
          }
          await this.triggerDelivery(ctx.notification);
        },
        compensate: async (ctx, sagaId) => {
          logger.info('Scheduled notification compensation', { notificationId: ctx.notification.id, sagaId });
          ctx.cancelled = true;
        }
      }
    ];
  }
}

export async function executeScheduledNotificationSaga(
  notification: Notification,
  notificationRepository: INotificationRepository,
  triggerDelivery: (n: Notification) => Promise<void>
): Promise<void> {
  const saga = new ScheduledNotificationSaga(notificationRepository, triggerDelivery);
  const correlationId = uuidv4();
  const context: ScheduledNotificationContext = {
    notification,
    scheduledAt: notification.scheduledAt ?? new Date(),
    cancelled: false,
    metadata: { correlationId, timestamp: new Date() }
  };

  try {
    await saga.start(context, correlationId);
  } catch (error) {
    logger.error('Scheduled notification saga failed', {
      error: error instanceof Error ? error.message : String(error),
      notificationId: notification.id,
      correlationId
    });
    throw error;
  }
}

export function cancelScheduledNotification(
  notificationRepository: INotificationRepository,
  notificationId: string
): Promise<void> {
  return notificationRepository.delete(notificationId);
}
