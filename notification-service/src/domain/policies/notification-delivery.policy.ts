import { DomainPolicy } from '../interfaces';
import { Notification } from '../entities/notification.entity';
import { NotificationPreference } from '../entities/notification-preference.entity';

/**
 * Notification Delivery Policy
 * Implements delivery rules, retry logic, rate limits, and consent
 */
export class NotificationDeliveryPolicy implements DomainPolicy {
  public readonly name = 'NotificationDeliveryPolicy';

  private static readonly RATE_LIMIT_PER_CHANNEL = 100; // per hour per user
  private static readonly RETRYABLE_ERRORS = ['TIMEOUT', 'RATE_LIMIT', 'SERVICE_UNAVAILABLE'];

  canSendNotification(
    _user: { id: string },
    notification: Notification,
    preference: NotificationPreference | null,
    sentCountLastHour: number
  ): { allowed: boolean; reason?: string } {
    if (!preference?.enabled) {
      return { allowed: false, reason: 'User has disabled this channel' };
    }
    if (preference.channel !== notification.channel) {
      return { allowed: false, reason: 'Channel mismatch' };
    }
    if (!preference.canSend(notification)) {
      return { allowed: false, reason: 'User preferences do not allow this notification' };
    }
    if (sentCountLastHour >= NotificationDeliveryPolicy.RATE_LIMIT_PER_CHANNEL) {
      return { allowed: false, reason: 'Rate limit exceeded for this channel' };
    }
    return { allowed: true };
  }

  shouldRetry(notification: Notification): boolean {
    if (notification.status !== 'failed') return false;
    if (notification.retryCount >= notification.maxRetries) return false;
    const lastError = (notification.lastError || '').toUpperCase();
    return NotificationDeliveryPolicy.RETRYABLE_ERRORS.some(e => lastError.includes(e));
  }

  getRetryDelay(retryCount: number): number {
    const baseMs = 1000;
    return baseMs * Math.pow(2, Math.min(retryCount, 5));
  }

  isWithinRateLimit(userId: string, _channel: string, sentCountLastHour: number): boolean {
    return sentCountLastHour < NotificationDeliveryPolicy.RATE_LIMIT_PER_CHANNEL;
  }

  requiresUserConsent(notificationType: string): boolean {
    const marketingTypes = ['promotion', 'newsletter', 'marketing'];
    return marketingTypes.includes(notificationType.toLowerCase());
  }

  evaluate(...args: any[]): boolean {
    if (args.length >= 4) {
      const result = this.canSendNotification(args[0], args[1], args[2], args[3]);
      return result.allowed;
    }
    return false;
  }
}
