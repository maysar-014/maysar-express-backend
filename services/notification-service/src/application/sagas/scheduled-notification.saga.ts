import { Notification } from '../../domain/entities/notification.entity';
import { INotificationRepository } from '../../domain/repositories';
import { logger } from '../../infrastructure/services/logger.service';
import { BaseSaga, SagaStep } from './saga-base';
import { v4 as uuidv4 } from 'uuid';

export interface ScheduledNotificationContext {
  notification: Notification;
  scheduledAt: Date;
  cancelled: boolean;
  metadata: { correlationId: string; timestamp: Date };
}

export class ScheduledNotificationSaga extends BaseSaga<ScheduledNotificationContext> {
  constructor(
    notification: Notification,
    private notificationRepository: INotificationRepository,
    private triggerDelivery: (n: Notification) => Promise<void>
  ) {
    const correlationId = uuidv4();
    const context: ScheduledNotificationContext = {
      notification,
      scheduledAt: notification.scheduledAt ?? new Date(),
      cancelled: false,
      metadata: { correlationId, timestamp: new Date() }
    };
    super(`scheduled-notification-${correlationId}`, context);
    this.addStep(this.triggerAtScheduledTimeStep());
  }

  private triggerAtScheduledTimeStep(): SagaStep<ScheduledNotificationContext> {
    return {
      name: 'TriggerAtScheduledTime',
      execute: async (ctx) => {
        if (ctx.cancelled) return;
        if (ctx.notification.isExpired()) {
          logger.warn('Scheduled notification expired', { notificationId: ctx.notification.id });
          return;
        }
        await this.triggerDelivery(ctx.notification);
      },
      compensate: async (ctx) => {
        logger.info('Scheduled notification compensation', { notificationId: ctx.notification.id });
        ctx.cancelled = true;
      },
      options: { timeoutMs: 60000 }
    };
  }
}

export function cancelScheduledNotification(
  notificationRepository: INotificationRepository,
  notificationId: string
): Promise<void> {
  return notificationRepository.delete(notificationId);
}
