import { INotificationAdapter } from '../../domain/ports';
import { logger } from '../services/logger.service';

/**
 * Notification Adapter - Calls notification service in-process API
 */
export class NotificationAdapter implements INotificationAdapter {
  async sendNotification(params: {
    userId: string;
    channel: 'email' | 'sms' | 'push' | 'in-app';
    subject: string;
    content: string;
    contentHtml?: string;
    deliveryAddress?: string;
    metadata?: Record<string, string | number | boolean>;
  }): Promise<void> {
    const deliveryAddressType: 'email' | 'phone' | 'device_token' | undefined =
      params.channel === 'email'
        ? 'email'
        : params.channel === 'push'
          ? 'device_token'
          : params.deliveryAddress
            ? 'phone'
            : undefined;

    const body = {
      userId: params.userId,
      type: params.channel,
      channel: params.channel,
      subject: params.subject,
      content: params.content,
      contentHtml: params.contentHtml,
      deliveryAddress: params.deliveryAddress,
      deliveryAddressType,
      metadata: params.metadata ?? {}
    };

    try {
      const { sendNotificationInternal } = await import('../../../../notification-service/src/internal/notification.facade');
      await sendNotificationInternal(body);

      logger.debug('Notification sent', { userId: params.userId, channel: params.channel });
    } catch (error) {
      logger.warn('NotificationAdapter: failed to send', {
        userId: params.userId,
        channel: params.channel,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }
}
