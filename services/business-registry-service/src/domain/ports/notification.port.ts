/**
 * Notification Port - Domain interface for sending notifications
 * Implemented by infrastructure adapters (notification-service HTTP, etc.)
 */
export interface INotificationAdapter {
  sendNotification(params: {
    userId: string;
    channel: 'email' | 'sms' | 'push' | 'in-app';
    subject: string;
    content: string;
    contentHtml?: string;
    deliveryAddress?: string;
    metadata?: Record<string, string | number | boolean>;
  }): Promise<void>;
}
