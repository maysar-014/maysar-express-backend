import { Notification } from '../../domain/entities/notification.entity';
import { INotificationRepository } from '../../domain/repositories';
import { INotificationPreferenceRepository } from '../../domain/repositories';
import { NotificationValidationService } from '../../domain/services/notification-validation.service';
import { logger } from '../../infrastructure/services/logger.service';
import { DistributedSagaOrchestrator, SagaStep } from '@shared/saga/saga.orchestrator';
import { sagaLogRepository } from '../../infrastructure/repositories/saga.repository';
import { v4 as uuidv4 } from 'uuid';

export interface NotificationDeliveryContext {
  notification: Notification;
  notificationId: string;
  userId: string;
  channel: string;
  addressValidated: boolean;
  preferencesChecked: boolean;
  templateRendered: boolean;
  sentViaProvider: boolean;
  statusUpdated: boolean;
  metricsRecorded: boolean;
  metadata: {
    correlationId: string;
    timestamp: Date;
  };
}

export class NotificationDeliverySaga extends DistributedSagaOrchestrator<NotificationDeliveryContext> {
  protected sagaType = 'NotificationDeliverySaga';

  constructor(
    private notificationRepository: INotificationRepository,
    private preferenceRepository: INotificationPreferenceRepository,
    private validationService: NotificationValidationService,
    private sendViaChannel: (notification: Notification) => Promise<void>,
    private recordMetrics: (notificationId: string, channel: string) => Promise<void>
  ) {
    super(sagaLogRepository, 'notification-service');
  }

  protected async onStart(sagaId: string, payload: NotificationDeliveryContext, correlationId?: string): Promise<void> {
    logger.info(`Starting NotificationDeliverySaga for notification ${payload.notificationId}`, { sagaId, correlationId });
  }

  protected async onCompensate(sagaId: string, failedStepName: string): Promise<void> {
    logger.info(`Compensating NotificationDeliverySaga failed at ${failedStepName}`, { sagaId });
  }

  protected defineSteps(): SagaStep<NotificationDeliveryContext>[] {
    return [
      {
        name: 'ValidateDeliveryAddress',
        execute: async (ctx, sagaId) => {
          if (ctx.notification.deliveryAddress) {
            this.validationService.validateDeliveryAddress(ctx.notification.deliveryAddress, ctx.channel);
          }
          ctx.addressValidated = true;
        },
        compensate: async (ctx, sagaId) => {
          if (ctx.addressValidated) ctx.addressValidated = false;
        }
      },
      {
        name: 'CheckUserPreferences',
        execute: async (ctx, sagaId) => {
          const prefs = await this.preferenceRepository.findByUserAndChannel(ctx.userId, ctx.channel);
          if (prefs && !prefs.canSend(ctx.notification)) {
            throw new Error(`User preferences do not allow this notification for user ${ctx.userId}`);
          }
          ctx.preferencesChecked = true;
        },
        compensate: async (ctx, sagaId) => {
          if (ctx.preferencesChecked) ctx.preferencesChecked = false;
        }
      },
      {
        name: 'RenderTemplate',
        execute: async (ctx, sagaId) => {
          // Template rendering is optional
          ctx.templateRendered = true;
        },
        compensate: async (ctx, sagaId) => {
          if (ctx.templateRendered) ctx.templateRendered = false;
        }
      },
      {
        name: 'SendViaChannelProvider',
        execute: async (ctx, sagaId) => {
          await this.sendViaChannel(ctx.notification);
          ctx.sentViaProvider = true;
        },
        compensate: async (ctx, sagaId) => {
          if (ctx.sentViaProvider) {
            logger.info('Compensating send: mark as failed', { notificationId: ctx.notificationId, sagaId });
            const failed = ctx.notification.markAsFailed('Compensated after saga failure');
            await this.notificationRepository.update(failed);
            ctx.sentViaProvider = false;
          }
        }
      },
      {
        name: 'UpdateNotificationStatus',
        execute: async (ctx, sagaId) => {
          const sent = ctx.notification.markAsSent();
          await this.notificationRepository.update(sent);
          ctx.notification = sent;
          ctx.statusUpdated = true;
        },
        compensate: async (ctx, sagaId) => {
          if (ctx.statusUpdated) {
            const backToPending = new Notification({
              ...ctx.notification,
              status: 'pending',
              sentAt: undefined,
              updatedAt: new Date()
            });
            await this.notificationRepository.update(backToPending);
            ctx.notification = backToPending;
            ctx.statusUpdated = false;
          }
        }
      },
      {
        name: 'RecordDeliveryMetrics',
        execute: async (ctx, sagaId) => {
          await this.recordMetrics(ctx.notificationId, ctx.channel);
          ctx.metricsRecorded = true;
        },
        compensate: async (ctx, sagaId) => {
          if (ctx.metricsRecorded) ctx.metricsRecorded = false;
        }
      }
    ];
  }
}

export async function executeNotificationDeliverySaga(
  notification: Notification,
  notificationRepository: INotificationRepository,
  preferenceRepository: INotificationPreferenceRepository,
  validationService: NotificationValidationService,
  sendViaChannel: (n: Notification) => Promise<void>,
  recordMetrics: (id: string, ch: string) => Promise<void>
): Promise<void> {
  const saga = new NotificationDeliverySaga(
    notificationRepository,
    preferenceRepository,
    validationService,
    sendViaChannel,
    recordMetrics
  );

  const correlationId = uuidv4();
  const context: NotificationDeliveryContext = {
    notification,
    notificationId: notification.id,
    userId: notification.userId,
    channel: notification.channel,
    addressValidated: false,
    preferencesChecked: false,
    templateRendered: false,
    sentViaProvider: false,
    statusUpdated: false,
    metricsRecorded: false,
    metadata: { correlationId, timestamp: new Date() }
  };

  try {
    await saga.start(context, correlationId);
    logger.info('Notification delivery saga completed', { notificationId: notification.id });
  } catch (error) {
    logger.error('Notification delivery saga failed', {
      error: error instanceof Error ? error.message : String(error),
      notificationId: notification.id,
      correlationId
    });
    throw error;
  }
}
