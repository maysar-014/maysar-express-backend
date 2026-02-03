import { Notification } from '../../entities/notification.entity';
import { NotificationContent } from '../../value-objects/notification-content.value-object';
import { NotificationMetadata } from '../../value-objects/notification-metadata.value-object';

describe('Notification Entity', () => {
  const content = NotificationContent.create('Hello world');
  const metadata = NotificationMetadata.create({});

  describe('create', () => {
    it('should create notification with required fields', () => {
      const n = Notification.create({
        id: 'notif_1',
        userId: 'user_1',
        type: 'email',
        channel: 'email',
        subject: 'Test',
        content,
        metadata
      });
      expect(n.id).toBe('notif_1');
      expect(n.userId).toBe('user_1');
      expect(n.type).toBe('email');
      expect(n.channel).toBe('email');
      expect(n.status).toBe('pending');
      expect(n.priority).toBe('medium');
      expect(n.retryCount).toBe(0);
      expect(n.maxRetries).toBe(3);
    });

    it('should create with custom priority and maxRetries', () => {
      const n = Notification.create({
        id: 'notif_2',
        userId: 'user_2',
        type: 'sms',
        channel: 'sms',
        subject: 'Alert',
        content,
        metadata,
        priority: 'urgent',
        maxRetries: 5
      });
      expect(n.priority).toBe('urgent');
      expect(n.maxRetries).toBe(5);
    });
  });

  describe('markAsSent', () => {
    it('should return new instance with status sent and sentAt', () => {
      const n = Notification.create({
        id: 'notif_1',
        userId: 'user_1',
        type: 'email',
        channel: 'email',
        subject: 'Test',
        content,
        metadata
      });
      const sent = n.markAsSent();
      expect(sent.status).toBe('sent');
      expect(sent.sentAt).toBeDefined();
      expect(sent).not.toBe(n);
    });
  });

  describe('markAsFailed', () => {
    it('should set status failed and lastError', () => {
      const n = Notification.create({
        id: 'notif_1',
        userId: 'user_1',
        type: 'email',
        channel: 'email',
        subject: 'Test',
        content,
        metadata
      });
      const failed = n.markAsFailed('Connection timeout');
      expect(failed.status).toBe('failed');
      expect(failed.lastError).toBe('Connection timeout');
    });
  });

  describe('canRetry', () => {
    it('should return true when failed and retryCount < maxRetries', () => {
      const n = Notification.create({
        id: 'notif_1',
        userId: 'user_1',
        type: 'email',
        channel: 'email',
        subject: 'Test',
        content,
        metadata,
        maxRetries: 3
      });
      const failed = n.markAsFailed('Error');
      expect(failed.canRetry()).toBe(true);
    });

    it('should return false when retryCount >= maxRetries', () => {
      const n = new Notification({
        id: 'notif_1',
        userId: 'user_1',
        type: 'email',
        channel: 'email',
        status: 'failed',
        priority: 'medium',
        subject: 'Test',
        content,
        metadata,
        retryCount: 3,
        maxRetries: 3,
        lastError: 'Error',
        createdAt: new Date(),
        updatedAt: new Date()
      });
      expect(n.canRetry()).toBe(false);
    });
  });

  describe('incrementRetryCount', () => {
    it('should return new instance with retryCount incremented', () => {
      const n = new Notification({
        id: 'notif_1',
        userId: 'user_1',
        type: 'email',
        channel: 'email',
        status: 'failed',
        priority: 'medium',
        subject: 'Test',
        content,
        metadata,
        retryCount: 1,
        maxRetries: 3,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      const next = n.incrementRetryCount();
      expect(next.retryCount).toBe(2);
      expect(next.status).toBe('pending');
    });
  });

  describe('validate', () => {
    it('should return valid for correct notification', () => {
      const n = Notification.create({
        id: 'notif_1',
        userId: 'user_1',
        type: 'email',
        channel: 'email',
        subject: 'Test',
        content,
        metadata
      });
      const result = n.validate();
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return errors for missing required fields', () => {
      const n = new Notification({
        id: '',
        userId: '',
        type: 'email',
        channel: 'email',
        status: 'pending',
        priority: 'medium',
        subject: '',
        content,
        metadata,
        retryCount: 0,
        maxRetries: 3,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      const result = n.validate();
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });
});
