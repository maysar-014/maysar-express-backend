import { Notification_NotificationType, Notification_NotificationStatus, Notification_NotificationPriority } from '@prisma/client';
import { NotificationType, NotificationStatus, NotificationPriority } from '../../domain/entities/notification.entity';

export class NotificationTypeMapper {
  static toPrisma(domainType: NotificationType): Notification_NotificationType {
    const mapping: Record<NotificationType, Notification_NotificationType> = {
      'email': 'email',
      'sms': 'sms',
      'push': 'push',
      'in-app': 'in_app'
    };
    return mapping[domainType];
  }

  static toDomain(prismaType: Notification_NotificationType): NotificationType {
    const mapping: Record<string, NotificationType> = {
      'email': 'email',
      'sms': 'sms',
      'push': 'push',
      'in_app': 'in-app',
      'webhook': 'push'
    };
    return mapping[prismaType] || 'email';
  }
}

export class NotificationStatusMapper {
  static toPrisma(domainStatus: NotificationStatus): Notification_NotificationStatus {
    const mapping: Record<NotificationStatus, Notification_NotificationStatus> = {
      'pending': 'pending',
      'sent': 'sent',
      'delivered': 'delivered',
      'failed': 'failed',
      'read': 'delivered'
    };
    return mapping[domainStatus];
  }

  static toDomain(prismaStatus: Notification_NotificationStatus): NotificationStatus {
    const mapping: Record<string, NotificationStatus> = {
      'pending': 'pending',
      'sent': 'sent',
      'delivered': 'delivered',
      'failed': 'failed',
      'cancelled': 'failed'
    };
    return mapping[prismaStatus] || 'pending';
  }
}

export class NotificationPriorityMapper {
  static toPrisma(domainPriority: NotificationPriority): Notification_NotificationPriority {
    const mapping: Record<NotificationPriority, Notification_NotificationPriority> = {
      'low': 'low',
      'medium': 'low',
      'high': 'high',
      'urgent': 'high'
    };
    return mapping[domainPriority];
  }

  static toDomain(prismaPriority: Notification_NotificationPriority): NotificationPriority {
    const mapping: Record<string, NotificationPriority> = {
      'low': 'low',
      'high': 'high'
    };
    return mapping[prismaPriority] || 'low';
  }
}
