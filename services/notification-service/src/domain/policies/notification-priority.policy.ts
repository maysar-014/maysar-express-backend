import { DomainPolicy } from '../interfaces';
import { Notification, NotificationPriority } from '../entities/notification.entity';

/**
 * Notification Priority Policy
 * Priority-based delivery rules and SLA windows
 */
export class NotificationPriorityPolicy implements DomainPolicy {
  public readonly name = 'NotificationPriorityPolicy';

  private static readonly PRIORITY_SCORE: Record<NotificationPriority, number> = {
    low: 1,
    medium: 2,
    high: 3,
    urgent: 4
  };

  private static readonly SLA_MINUTES: Record<NotificationPriority, number> = {
    low: 1440,    // 24h
    medium: 60,   // 1h
    high: 15,     // 15min
    urgent: 5      // 5min
  };

  getPriority(notification: Notification): number {
    return NotificationPriorityPolicy.PRIORITY_SCORE[notification.priority] ?? 0;
  }

  shouldBypassQuietHours(notification: Notification): boolean {
    return notification.priority === 'urgent' || notification.priority === 'high';
  }

  getDeliveryWindow(priority: NotificationPriority): number {
    return NotificationPriorityPolicy.SLA_MINUTES[priority] ?? 60;
  }

  evaluate(...args: any[]): boolean {
    if (args.length >= 1 && typeof args[0]?.priority !== 'undefined') {
      return this.getPriority(args[0]) > 0;
    }
    return false;
  }
}
