import { Notification } from '../../domain/entities/notification.entity';
import { NotificationValidationService } from '../../domain/services/notification-validation.service';
import { NotificationDeliveryPolicy } from '../../domain/policies/notification-delivery.policy';
import { INotificationRepository } from '../../domain/repositories';
import { INotificationPreferenceRepository } from '../../domain/repositories';
import { CreateNotificationDto } from '../dto/notification.dto';
import { NotificationMapper } from '../mappers/notification-mapper';
import {
  NotificationValidationError,
  RateLimitExceededError,
  NotificationNotFoundError
} from '../../domain/errors/notification.errors';

export interface SendNotificationResult {
  notification: Notification;
  sagaTriggered: boolean;
}

export class SendNotificationUseCase {
  constructor(
    private notificationRepository: INotificationRepository,
    private preferenceRepository: INotificationPreferenceRepository,
    private validationService: NotificationValidationService,
    private deliveryPolicy: NotificationDeliveryPolicy,
    private triggerDeliverySaga: (notification: Notification) => Promise<void>
  ) {}

  async execute(dto: CreateNotificationDto): Promise<SendNotificationResult> {
    this.validateInput(dto);

    const preference = await this.preferenceRepository.findByUserAndChannel(dto.userId, dto.channel);
    const sentCount = await this.notificationRepository.getSentCountLastHour(dto.userId, dto.channel);
    const notification = NotificationMapper.toEntity(dto);

    const canSend = this.deliveryPolicy.canSendNotification(
      { id: dto.userId },
      notification,
      preference ?? null,
      sentCount
    );
    if (!canSend.allowed) {
      if (canSend.reason?.includes('Rate limit')) {
        throw new RateLimitExceededError(canSend.reason);
      }
      throw new NotificationValidationError(canSend.reason ?? 'Cannot send notification');
    }

    this.validationService.validateNotification(notification);

    const created = await this.notificationRepository.create(notification);
    await this.triggerDeliverySaga(created);

    return { notification: created, sagaTriggered: true };
  }

  private validateInput(dto: CreateNotificationDto): void {
    if (!dto.userId?.trim()) throw new NotificationValidationError('UserId is required');
    if (!dto.type) throw new NotificationValidationError('Type is required');
    if (!dto.channel) throw new NotificationValidationError('Channel is required');
    if (!dto.subject?.trim()) throw new NotificationValidationError('Subject is required');
    if (!dto.content?.trim()) throw new NotificationValidationError('Content is required');
  }
}
