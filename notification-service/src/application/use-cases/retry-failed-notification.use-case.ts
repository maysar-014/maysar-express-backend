import { Notification } from '../../domain/entities/notification.entity';
import { INotificationRepository } from '../../domain/repositories';
import { NotificationDeliveryPolicy } from '../../domain/policies/notification-delivery.policy';
import { NotificationNotFoundError, NotificationValidationError } from '../../domain/errors/notification.errors';

export class RetryFailedNotificationUseCase {
  constructor(
    private notificationRepository: INotificationRepository,
    private deliveryPolicy: NotificationDeliveryPolicy,
    private triggerDeliverySaga: (notification: Notification) => Promise<void>
  ) {}

  async execute(notificationId: string): Promise<Notification> {
    const notification = await this.notificationRepository.findById(notificationId);
    if (!notification) {
      throw new NotificationNotFoundError(`Notification ${notificationId} not found`);
    }
    if (!this.deliveryPolicy.shouldRetry(notification)) {
      throw new NotificationValidationError('Notification cannot be retried');
    }
    const withIncrementedRetry = notification.incrementRetryCount();
    const updated = await this.notificationRepository.update(withIncrementedRetry);
    await this.triggerDeliverySaga(updated);
    return updated;
  }
}
