import { SmsMessage, SmsStatus } from '../sms-message.entity';
import { ProviderResponse } from '../../value-objects/provider-response.value-object';
import { InvalidStateTransitionError } from '../../errors/sms.errors';

describe('SmsMessage Entity', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create SMS message with default values', () => {
      const message = SmsMessage.create({
        id: 'sms-1',
        phoneNumber: '+255712345678',
        content: 'Test message',
        userId: 'user-1'
      });

      expect(message.getId()).toBe('sms-1');
      expect(message.getPhoneNumber().getValue()).toBe('+255712345678');
      expect(message.getStatus()).toBe(SmsStatus.QUEUED);
      expect(message.getRetryCount()).toBe(0);
      expect(message.getMaxRetries()).toBe(3);
      expect(message.getDomainEvents()).toHaveLength(1);
    });

    it('should create SMS with custom max retries', () => {
      const message = SmsMessage.create({
        id: 'sms-1',
        phoneNumber: '+255712345678',
        content: 'Test',
        maxRetries: 5
      });

      expect(message.getMaxRetries()).toBe(5);
    });

    it('should create SMS with scheduled time', () => {
      const scheduledAt = new Date(Date.now() + 3600000);
      const message = SmsMessage.create({
        id: 'sms-1',
        phoneNumber: '+255712345678',
        content: 'Test',
        scheduledAt
      });

      expect(message.getScheduledAt()).toEqual(scheduledAt);
    });
  });

  describe('markAsSending', () => {
    it('should transition from QUEUED to SENDING', () => {
      const message = SmsMessage.create({
        id: 'sms-1',
        phoneNumber: '+255712345678',
        content: 'Test'
      });

      message.markAsSending('africastalking');

      expect(message.getStatus()).toBe(SmsStatus.SENDING);
      expect(message.getProviderId()).toBe('africastalking');
    });

    it('should throw error for invalid transition', () => {
      const message = SmsMessage.create({
        id: 'sms-1',
        phoneNumber: '+255712345678',
        content: 'Test'
      });
      message.markAsSending('provider');
      const providerResponse = ProviderResponse.createSuccess('msg-123');
      message.markAsSent(providerResponse);

      expect(() => message.markAsSending('provider')).toThrow(InvalidStateTransitionError);
    });
  });

  describe('markAsSent', () => {
    it('should transition from SENDING to SENT', () => {
      const message = SmsMessage.create({
        id: 'sms-1',
        phoneNumber: '+255712345678',
        content: 'Test'
      });
      message.markAsSending('provider');

      const providerResponse = ProviderResponse.createSuccess('msg-123');
      message.markAsSent(providerResponse);

      expect(message.getStatus()).toBe(SmsStatus.SENT);
      expect(message.getProviderMessageId()).toBe('msg-123');
      expect(message.getSentAt()).toBeInstanceOf(Date);
    });
  });

  describe('markAsDelivered', () => {
    it('should transition from SENT to DELIVERED', () => {
      const message = SmsMessage.create({
        id: 'sms-1',
        phoneNumber: '+255712345678',
        content: 'Test'
      });
      message.markAsSending('provider');
      const providerResponse = ProviderResponse.createSuccess('msg-123');
      message.markAsSent(providerResponse);

      message.markAsDelivered();

      expect(message.getStatus()).toBe(SmsStatus.DELIVERED);
      expect(message.getDeliveredAt()).toBeInstanceOf(Date);
      expect(message.isTerminal()).toBe(true);
    });
  });

  describe('markAsUndelivered', () => {
    it('should transition from SENT to UNDELIVERED', () => {
      const message = SmsMessage.create({
        id: 'sms-1',
        phoneNumber: '+255712345678',
        content: 'Test'
      });
      message.markAsSending('provider');
      const providerResponse = ProviderResponse.createSuccess('msg-123');
      message.markAsSent(providerResponse);

      message.markAsUndelivered('Invalid number');

      expect(message.getStatus()).toBe(SmsStatus.UNDELIVERED);
      expect(message.getLastError()).toBe('Invalid number');
      expect(message.isTerminal()).toBe(true);
    });
  });

  describe('markAsFailed', () => {
    it('should transition from SENDING to FAILED', () => {
      const message = SmsMessage.create({
        id: 'sms-1',
        phoneNumber: '+255712345678',
        content: 'Test'
      });
      message.markAsSending('provider');

      message.markAsFailed('Network error');

      expect(message.getStatus()).toBe(SmsStatus.FAILED);
      expect(message.getLastError()).toBe('Network error');
      expect(message.getFailedAt()).toBeInstanceOf(Date);
    });
  });

  describe('markAsCancelled', () => {
    it('should transition from QUEUED to CANCELLED', () => {
      const message = SmsMessage.create({
        id: 'sms-1',
        phoneNumber: '+255712345678',
        content: 'Test'
      });

      message.markAsCancelled('User requested cancellation');

      expect(message.getStatus()).toBe(SmsStatus.CANCELLED);
      expect(message.getLastError()).toBe('User requested cancellation');
      expect(message.isTerminal()).toBe(true);
    });
  });

  describe('canRetry', () => {
    it('should allow retry when failed and under max retries', () => {
      const message = SmsMessage.create({
        id: 'sms-1',
        phoneNumber: '+255712345678',
        content: 'Test',
        maxRetries: 3
      });
      message.markAsSending('provider');
      message.markAsFailed('Error');

      expect(message.canRetry()).toBe(true);
    });

    it('should not allow retry when max retries reached', () => {
      const message = SmsMessage.create({
        id: 'sms-1',
        phoneNumber: '+255712345678',
        content: 'Test',
        maxRetries: 1
      });
      message.markAsSending('provider');
      message.markAsFailed('Error');
      message.incrementRetryCount();
      message.markAsSending('provider');
      message.markAsFailed('Error again');

      expect(message.getRetryCount()).toBe(1);
      expect(message.canRetry()).toBe(false);
    });

    it('should not allow retry when not in FAILED status', () => {
      const message = SmsMessage.create({
        id: 'sms-1',
        phoneNumber: '+255712345678',
        content: 'Test'
      });

      expect(message.canRetry()).toBe(false);
    });
  });

  describe('incrementRetryCount', () => {
    it('should increment retry count and reset to QUEUED', () => {
      const message = SmsMessage.create({
        id: 'sms-1',
        phoneNumber: '+255712345678',
        content: 'Test'
      });
      message.markAsSending('provider');
      message.markAsFailed('Error');

      message.incrementRetryCount();

      expect(message.getRetryCount()).toBe(1);
      expect(message.getStatus()).toBe(SmsStatus.QUEUED);
      expect(message.getLastError()).toBeUndefined();
    });

    it('should throw error when max retries exceeded', () => {
      const message = SmsMessage.create({
        id: 'sms-1',
        phoneNumber: '+255712345678',
        content: 'Test',
        maxRetries: 0
      });
      message.markAsSending('provider');
      message.markAsFailed('Error');

      expect(() => message.incrementRetryCount()).toThrow('Cannot retry');
    });
  });

  describe('status checks', () => {
    it('should correctly identify status', () => {
      const message = SmsMessage.create({
        id: 'sms-1',
        phoneNumber: '+255712345678',
        content: 'Test'
      });

      expect(message.isQueued()).toBe(true);
      expect(message.isSending()).toBe(false);

      message.markAsSending('provider');
      expect(message.isSending()).toBe(true);

      const providerResponse = ProviderResponse.createSuccess('msg-123');
      message.markAsSent(providerResponse);
      expect(message.isSent()).toBe(true);

      message.markAsDelivered();
      expect(message.isDelivered()).toBe(true);
      expect(message.isTerminal()).toBe(true);
    });
  });

  describe('domain events', () => {
    it('should emit SmsQueued event on creation', () => {
      const message = SmsMessage.create({
        id: 'sms-1',
        phoneNumber: '+255712345678',
        content: 'Test'
      });

      const events = message.getDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0].eventType).toBe('SmsQueued');
    });

    it('should emit SmsSent event on sent', () => {
      const message = SmsMessage.create({
        id: 'sms-1',
        phoneNumber: '+255712345678',
        content: 'Test'
      });
      message.clearDomainEvents();
      message.markAsSending('provider');
      const providerResponse = ProviderResponse.createSuccess('msg-123');
      message.markAsSent(providerResponse);

      const events = message.getDomainEvents();
      expect(events.some(e => e.eventType === 'SmsSent')).toBe(true);
    });

    it('should clear domain events', () => {
      const message = SmsMessage.create({
        id: 'sms-1',
        phoneNumber: '+255712345678',
        content: 'Test'
      });

      message.clearDomainEvents();
      expect(message.getDomainEvents()).toHaveLength(0);
    });
  });
});
