import { Notification, NotificationType, NotificationStatus } from '../notification.entity';
import { NotificationContent } from '../../value-objects/notification-content.value-object';
import { NotificationMetadata } from '../../value-objects/notification-metadata.value-object';

describe('Notification Entity', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const createValidNotification = (overrides = {}) => {
    const content = NotificationContent.create({
      body: 'Test notification body',
      data: {}
    });

    return Notification.create({
      id: 'notif-1',
      userId: 'user-1',
      type: 'email' as NotificationType,
      channel: 'email' as NotificationType,
      subject: 'Test Subject',
      content,
      ...overrides
    });
  };

  describe('create', () => {
    it('should create notification with default values', () => {
      const notification = createValidNotification();

      expect(notification.id).toBe('notif-1');
      expect(notification.userId).toBe('user-1');
      expect(notification.status).toBe('pending');
      expect(notification.priority).toBe('medium');
      expect(notification.retryCount).toBe(0);
      expect(notification.maxRetries).toBe(3);
      expect(notification.createdAt).toBeInstanceOf(Date);
    });

    it('should create notification with custom priority', () => {
      const notification = createValidNotification({ priority: 'high' });
      expect(notification.priority).toBe('high');
    });

    it('should create notification with custom max retries', () => {
      const notification = createValidNotification({ maxRetries: 5 });
      expect(notification.maxRetries).toBe(5);
    });

    it('should create notification with scheduled time', () => {
      const scheduledAt = new Date(Date.now() + 3600000);
      const notification = createValidNotification({ scheduledAt });
      expect(notification.scheduledAt).toEqual(scheduledAt);
    });
  });

  describe('markAsSent', () => {
    it('should transition to sent status', () => {
      const notification = createValidNotification();
      const sent = notification.markAsSent();

      expect(sent.status).toBe('sent');
      expect(sent.sentAt).toBeInstanceOf(Date);
      expect(sent.updatedAt).toBeInstanceOf(Date);
    });

    it('should preserve other properties', () => {
      const notification = createValidNotification();
      const sent = notification.markAsSent();

      expect(sent.id).toBe(notification.id);
      expect(sent.userId).toBe(notification.userId);
      expect(sent.retryCount).toBe(notification.retryCount);
    });
  });

  describe('markAsDelivered', () => {
    it('should transition to delivered status', () => {
      const notification = createValidNotification().markAsSent();
      const delivered = notification.markAsDelivered();

      expect(delivered.status).toBe('delivered');
      expect(delivered.deliveredAt).toBeInstanceOf(Date);
    });
  });

  describe('markAsRead', () => {
    it('should transition to read status', () => {
      const notification = createValidNotification().markAsSent().markAsDelivered();
      const read = notification.markAsRead();

      expect(read.status).toBe('read');
      expect(read.readAt).toBeInstanceOf(Date);
    });
  });

  describe('markAsFailed', () => {
    it('should transition to failed status with error', () => {
      const notification = createValidNotification();
      const failed = notification.markAsFailed('Connection timeout');

      expect(failed.status).toBe('failed');
      expect(failed.lastError).toBe('Connection timeout');
      expect(failed.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe('canRetry', () => {
    it('should allow retry when failed and under max retries', () => {
      const notification = createValidNotification().markAsFailed('Error');
      expect(notification.canRetry()).toBe(true);
    });

    it('should not allow retry when max retries reached', () => {
      let notification = createValidNotification({ maxRetries: 2 });
      notification = notification.markAsFailed('Error').incrementRetryCount();
      notification = notification.markAsFailed('Error').incrementRetryCount();
      
      expect(notification.retryCount).toBe(2);
      expect(notification.canRetry()).toBe(false);
    });

    it('should not allow retry when status is not failed', () => {
      const notification = createValidNotification();
      expect(notification.canRetry()).toBe(false);
    });
  });

  describe('incrementRetryCount', () => {
    it('should increment retry count and reset to pending', () => {
      const notification = createValidNotification().markAsFailed('Error');
      const retried = notification.incrementRetryCount();

      expect(retried.retryCount).toBe(1);
      expect(retried.status).toBe('pending');
    });

    it('should preserve error message', () => {
      const notification = createValidNotification().markAsFailed('Original error');
      const retried = notification.incrementRetryCount();

      expect(retried.lastError).toBe('Original error');
    });
  });

  describe('isExpired', () => {
    it('should return false when no scheduled time', () => {
      const notification = createValidNotification();
      expect(notification.isExpired()).toBe(false);
    });

    it('should return false when within expiry window', () => {
      const scheduledAt = new Date(Date.now() - 3600000); // 1 hour ago
      const notification = createValidNotification({ scheduledAt });
      expect(notification.isExpired()).toBe(false);
    });

    it('should return true when beyond expiry window', () => {
      const scheduledAt = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000); // 8 days ago
      const notification = createValidNotification({ scheduledAt });
      expect(notification.isExpired()).toBe(true);
    });
  });

  describe('validate', () => {
    it('should validate correct notification', () => {
      const notification = createValidNotification();
      const result = notification.validate();

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect missing user ID', () => {
      const content = NotificationContent.create({ body: 'Test', data: {} });
      const notification = new Notification({
        id: 'notif-1',
        userId: '',
        type: 'email',
        channel: 'email',
        status: 'pending',
        priority: 'medium',
        subject: 'Test',
        content,
        metadata: NotificationMetadata.create({}),
        retryCount: 0,
        maxRetries: 3,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      const result = notification.validate();
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('User ID is required');
    });

    it('should detect negative retry count', () => {
      const content = NotificationContent.create({ body: 'Test', data: {} });
      const notification = new Notification({
        id: 'notif-1',
        userId: 'user-1',
        type: 'email',
        channel: 'email',
        status: 'pending',
        priority: 'medium',
        subject: 'Test',
        content,
        metadata: NotificationMetadata.create({}),
        retryCount: -1,
        maxRetries: 3,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      const result = notification.validate();
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Retry count cannot be negative');
    });
  });
});
