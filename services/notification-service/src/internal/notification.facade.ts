import { logger } from '../infrastructure/services/logger.service';
import { SendNotificationUseCase } from '../application/use-cases/send-notification.use-case';
import { NotificationValidationService } from '../domain/services/notification-validation.service';
import { NotificationDeliveryPolicy } from '../domain/policies/notification-delivery.policy';
import { PrismaNotificationRepository } from '../infrastructure/repositories/prisma-notification.repository';
import { PrismaPreferenceRepository } from '../infrastructure/repositories/prisma-preference.repository';
import { PrismaDeliveryLogRepository } from '../infrastructure/repositories/prisma-delivery-log.repository';
import { PrismaPushTokenRepository } from '../infrastructure/repositories/prisma-push-token.repository';
import { executeNotificationDeliverySaga } from '../application/sagas/notification-delivery.saga';
import { Notification } from '../domain/entities/notification.entity';
import type { ISmsProvider } from '../sms/infrastructure/providers/sms-provider.interface';
import type { CreateNotificationDto } from '../application/dto/notification.dto';

const notificationRepository = new PrismaNotificationRepository();
const preferenceRepository = new PrismaPreferenceRepository();
const deliveryLogRepository = new PrismaDeliveryLogRepository();
const pushTokenRepository = new PrismaPushTokenRepository();
const validationService = new NotificationValidationService();
const deliveryPolicy = new NotificationDeliveryPolicy();

async function sendViaChannel(notification: Notification): Promise<void> {
  const content = notification.content.getValue();
  const subject = notification.subject;
  if (notification.channel === 'email' && notification.deliveryAddress) {
    const { EmailProviderAdapter } = await import('../infrastructure/adapters/email-provider.adapter');
    const email = new EmailProviderAdapter();
    await email.send(notification.deliveryAddress.getValue(), subject, content);
  } else if (notification.channel === 'sms' && notification.deliveryAddress) {
    const { container } = await import('../sms/infrastructure/container');
    const { TYPES } = await import('../sms/infrastructure/types');
    const provider = container.get<ISmsProvider>(TYPES.SmsProvider);
    const response = await provider.send(notification.deliveryAddress.getValue(), content);
    if (!response.isSuccess()) {
      throw new Error(`SMS send failed: ${response.getErrorMessage() || 'Unknown error'}`);
    }
  } else if (notification.channel === 'push') {
    const { PushProviderAdapter } = await import('../infrastructure/adapters/push-provider.adapter');
    const push = new PushProviderAdapter();
    if (notification.deliveryAddress) {
      await push.send(notification.deliveryAddress.getValue(), { title: subject, body: content });
      return;
    }
    const tokens = await pushTokenRepository.listActiveTokensByUserId(notification.userId);
    if (tokens.length === 0) {
      throw new Error('No push tokens registered for user');
    }
    await push.sendBatch(
      tokens.map((t) => ({
        deviceToken: t.token,
        payload: { title: subject, body: content }
      }))
    );
  }
}

async function recordMetrics(notificationId: string, channel: string): Promise<void> {
  await deliveryLogRepository.create({
    notificationId,
    provider: channel,
    status: 'sent'
  });
  logger.debug('Record delivery metrics', { notificationId, channel });
}

async function triggerDeliverySaga(notification: Notification): Promise<void> {
  await executeNotificationDeliverySaga(
    notification,
    notificationRepository,
    preferenceRepository,
    validationService,
    sendViaChannel,
    recordMetrics
  );
}

const sendNotificationUseCase = new SendNotificationUseCase(
  notificationRepository,
  preferenceRepository,
  validationService,
  deliveryPolicy,
  triggerDeliverySaga
);

export async function sendNotificationInternal(dto: CreateNotificationDto) {
  return sendNotificationUseCase.execute(dto);
}
