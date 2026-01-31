import { Notification } from '../../domain/entities/notification.entity';
import { INotificationRepository } from '../../domain/repositories';
import { INotificationPreferenceRepository } from '../../domain/repositories';
import { NotificationValidationService } from '../../domain/services/notification-validation.service';
import { logger } from '../../infrastructure/services/logger.service';
import { BaseSaga, SagaStep, SagaError } from './saga-base';
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

const DEFAULT_RETRY = { maxRetries: 3, retryDelayMs: 1000, timeoutMs: 30000 };

export class NotificationDeliverySaga extends BaseSaga<NotificationDeliveryContext> {
  constructor(
    notification: Notification,
    private notificationRepository: INotificationRepository,
    private preferenceRepository: INotificationPreferenceRepository,
    private validationService: NotificationValidationService,
    private sendViaChannel: (notification: Notification) => Promise<void>,
    private recordMetrics: (notificationId: string, channel: string) => Promise<void>
  ) {
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
    super(`notification-delivery-${correlationId}`, context);
    this.initializeSteps();
  }

  private initializeSteps(): void {
    this.addStep(this.validateDeliveryAddressStep());
    this.addStep(this.checkUserPreferencesStep());
    this.addStep(this.renderTemplateStep());
    this.addStep(this.sendViaChannelStep());
    this.addStep(this.updateNotificationStatusStep());
    this.addStep(this.recordDeliveryMetricsStep());
  }

  private validateDeliveryAddressStep(): SagaStep<NotificationDeliveryContext> {
    return {
      name: 'ValidateDeliveryAddress',
      execute: async (ctx) => {
        if (ctx.notification.deliveryAddress) {
          this.validationService.validateDeliveryAddress(ctx.notification.deliveryAddress, ctx.channel);
        }
        ctx.addressValidated = true;
      },
      compensate: async (ctx) => {
        if (ctx.addressValidated) ctx.addressValidated = false;
      },
      options: DEFAULT_RETRY
    };
  }

  private checkUserPreferencesStep(): SagaStep<NotificationDeliveryContext> {
    return {
      name: 'CheckUserPreferences',
      execute: async (ctx) => {
        const prefs = await this.preferenceRepository.findByUserAndChannel(ctx.userId, ctx.channel);
        if (prefs && !prefs.canSend(ctx.notification)) {
          throw new SagaError('User preferences do not allow this notification', { userId: ctx.userId });
        }
        ctx.preferencesChecked = true;
      },
      compensate: async (ctx) => {
        if (ctx.preferencesChecked) ctx.preferencesChecked = false;
      },
      options: DEFAULT_RETRY
    };
  }

  private renderTemplateStep(): SagaStep<NotificationDeliveryContext> {
    return {
      name: 'RenderTemplate',
      execute: async (ctx) => {
        // Template rendering is optional; if no templateId in metadata, skip
        ctx.templateRendered = true;
      },
      compensate: async (ctx) => {
        if (ctx.templateRendered) ctx.templateRendered = false;
      },
      options: DEFAULT_RETRY
    };
  }

  private sendViaChannelStep(): SagaStep<NotificationDeliveryContext> {
    return {
      name: 'SendViaChannelProvider',
      execute: async (ctx) => {
        await this.sendViaChannel(ctx.notification);
        ctx.sentViaProvider = true;
      },
      compensate: async (ctx) => {
        if (ctx.sentViaProvider) {
          logger.info('Compensating send: mark as failed', { notificationId: ctx.notificationId });
          const failed = ctx.notification.markAsFailed('Compensated after saga failure');
          await this.notificationRepository.update(failed);
          ctx.sentViaProvider = false;
        }
      },
      options: DEFAULT_RETRY
    };
  }

  private updateNotificationStatusStep(): SagaStep<NotificationDeliveryContext> {
    return {
      name: 'UpdateNotificationStatus',
      execute: async (ctx) => {
        const sent = ctx.notification.markAsSent();
        await this.notificationRepository.update(sent);
        ctx.notification = sent;
        ctx.statusUpdated = true;
      },
      compensate: async (ctx) => {
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
      },
      options: DEFAULT_RETRY
    };
  }

  private recordDeliveryMetricsStep(): SagaStep<NotificationDeliveryContext> {
    return {
      name: 'RecordDeliveryMetrics',
      execute: async (ctx) => {
        await this.recordMetrics(ctx.notificationId, ctx.channel);
        ctx.metricsRecorded = true;
      },
      compensate: async (ctx) => {
        if (ctx.metricsRecorded) ctx.metricsRecorded = false;
      },
      options: { maxRetries: 2, retryDelayMs: 500, timeoutMs: 10000 }
    };
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
    notification,
    notificationRepository,
    preferenceRepository,
    validationService,
    sendViaChannel,
    recordMetrics
  );
  await saga.execute();
  logger.info('Notification delivery saga completed', { notificationId: notification.id });
}
