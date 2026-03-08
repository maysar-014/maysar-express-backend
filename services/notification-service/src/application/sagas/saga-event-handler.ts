import { NotificationCreatedEvent, NotificationFailedEvent } from '../../domain/events';
import { Notification } from '../../domain/entities/notification.entity';
import { INotificationRepository } from '../../domain/repositories';
import { INotificationPreferenceRepository } from '../../domain/repositories';
import { NotificationValidationService } from '../../domain/services/notification-validation.service';
import { executeNotificationDeliverySaga } from './notification-delivery.saga';
import { logger } from '../../infrastructure/services/logger.service';
import { EventEnvelope, IEventBus } from '@shared/events/eventBus';

export interface UserRegisteredEventPayload {
  aggregateId: string;
  email?: string;
  role?: string;
  metadata?: Record<string, any>;
}

export class SagaEventHandler {
  constructor(
    private notificationRepository: INotificationRepository,
    private preferenceRepository: INotificationPreferenceRepository,
    private validationService: NotificationValidationService,
    private sendViaChannel: (n: Notification) => Promise<void>,
    private recordMetrics: (id: string, ch: string) => Promise<void>
  ) {}

  setupSubscriptions(eventBus: IEventBus): void {
    eventBus.subscribe('NotificationCreated', async (envelope: EventEnvelope) => {
      await this.handleNotificationCreatedEvent(envelope.data as NotificationCreatedEvent);
    });

    eventBus.subscribe('NotificationFailed', async (envelope: EventEnvelope) => {
      await this.handleNotificationFailedEvent(envelope.data as NotificationFailedEvent);
    });

    eventBus.subscribe('UserRegistered', async (envelope: EventEnvelope) => {
      await this.handleUserRegisteredEvent(envelope.data as UserRegisteredEventPayload);
    });
  }

  async handleNotificationCreatedEvent(event: NotificationCreatedEvent): Promise<void> {
    try {
      logger.info('Handling NotificationCreatedEvent', { eventId: event.eventId });
      const notification = await this.notificationRepository.findById(event.aggregateId);
      if (!notification) {
        logger.warn('Notification not found for created event', { aggregateId: event.aggregateId });
        return;
      }
      await executeNotificationDeliverySaga(
        notification,
        this.notificationRepository,
        this.preferenceRepository,
        this.validationService,
        this.sendViaChannel,
        this.recordMetrics
      );
    } catch (error) {
      logger.error('Failed to handle NotificationCreatedEvent', { eventId: event.eventId, error });
      throw error;
    }
  }

  async handleNotificationFailedEvent(event: NotificationFailedEvent): Promise<void> {
    try {
      logger.info('Handling NotificationFailedEvent', { eventId: event.eventId });
      const notification = await this.notificationRepository.findById(event.aggregateId);
      if (!notification || !notification.canRetry()) return;
      await executeNotificationDeliverySaga(
        notification,
        this.notificationRepository,
        this.preferenceRepository,
        this.validationService,
        this.sendViaChannel,
        this.recordMetrics
      );
    } catch (error) {
      logger.error('Failed to handle NotificationFailedEvent', { eventId: event.eventId, error });
      throw error;
    }
  }

  async handleUserRegisteredEvent(payload: UserRegisteredEventPayload): Promise<void> {
    try {
      logger.info('Handling UserRegisteredEvent (welcome notification)', { userId: payload.aggregateId });
      // In a full implementation: create welcome notification and trigger delivery saga
      // For now we only log; actual creation would use SendNotificationUseCase
    } catch (error) {
      logger.error('Failed to handle UserRegisteredEvent', { userId: payload.aggregateId, error });
      throw error;
    }
  }
}
