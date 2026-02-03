import { INotificationAdapter } from '../../domain/ports';
import { logger } from '../services/logger.service';

const NOTIFICATION_SERVICE_URL = process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3004';

/**
 * Notification Adapter - Calls notification service HTTP API
 */
export class NotificationAdapter implements INotificationAdapter {
  constructor(private readonly baseUrl: string = NOTIFICATION_SERVICE_URL) {}

  async sendNotification(params: {
    userId: string;
    channel: 'email' | 'sms' | 'push' | 'in-app';
    subject: string;
    content: string;
    contentHtml?: string;
    deliveryAddress?: string;
    metadata?: Record<string, string | number | boolean>;
  }): Promise<void> {
    const url = `${this.baseUrl}/api/v1/notifications`;
    const body = {
      userId: params.userId,
      type: params.channel,
      channel: params.channel,
      subject: params.subject,
      content: params.content,
      contentHtml: params.contentHtml,
      deliveryAddress: params.deliveryAddress,
      deliveryAddressType: params.deliveryAddress?.includes('@') ? 'email' : 'phone',
      metadata: params.metadata ?? {}
    };

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Notification service error ${res.status}: ${errText}`);
      }

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
