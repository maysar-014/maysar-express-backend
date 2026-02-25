import { Notification_NotificationStatus, Notification_NotificationType, Notification_DeliveryStatus } from '@prisma/client';

// Enum type mappers to handle Prisma enum differences

export function mapNotificationStatus(status: string): Notification_NotificationStatus {
  const mapping: Record<string, string> = {
    'pending': 'PENDING',
    'sent': 'SENT',
    'delivered': 'DELIVERED',
    'failed': 'FAILED',
    'read': 'READ',
  };
  return (mapping[status] || status) as Notification_NotificationStatus;
}

export function mapNotificationType(type: string): Notification_NotificationType {
  const mapping: Record<string, string> = {
    'in-app': 'in_app',
    'email': 'email',
    'sms': 'sms',
    'push': 'push',
  };
  return (mapping[type] || type) as Notification_NotificationType;
}

export function mapProviderStatus(status: string): Notification_DeliveryStatus {
  const mapping: Record<string, string> = {
    'sent': 'SENT',
    'delivered': 'DELIVERED',
    'failed': 'FAILED',
  };
  return (mapping[status] || status) as Notification_DeliveryStatus;
}
