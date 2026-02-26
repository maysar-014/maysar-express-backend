import { SendSmsUseCase } from '../send-sms.use-case';
import { SmsMessage, SmsStatus } from '../../../domain/entities/sms-message.entity';
import { ProviderResponse } from '../../../domain/value-objects/provider-response.value-object';
import { RateLimitExceededError } from '../../../domain/errors/sms.errors';

describe('SendSmsUseCase', () => {
  let useCase: SendSmsUseCase;
  let mockRepository: any;
  let mockProvider: any;
  let mockRateLimitPolicy: any;
  let mockEventPublisher: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockRepository = {
      create: jest.fn(),
      update: jest.fn(),
      getMessageCountInWindow: jest.fn().mockResolvedValue(0)
    };

    mockProvider = {
      send: jest.fn(),
      getName: jest.fn().mockReturnValue('africastalking')
    };

    mockRateLimitPolicy = {
      getTimeWindows: jest.fn().mockReturnValue({
        minute: { windowStart: new Date(Date.now() - 60000), windowEnd: new Date() },
        hour: { windowStart: new Date(Date.now() - 3600000), windowEnd: new Date() },
        day: { windowStart: new Date(Date.now() - 86400000), windowEnd: new Date() }
      }),
      isRateLimitExceeded: jest.fn().mockReturnValue({ exceeded: false }),
      isUserRateLimitExceeded: jest.fn().mockReturnValue({ exceeded: false }),
      isPhoneNumberRateLimitExceeded: jest.fn().mockReturnValue({ exceeded: false }),
      getConfig: jest.fn().mockReturnValue({
        maxMessagesPerMinute: 100,
        perUserLimitPerHour: 50,
        perPhoneNumberLimitPerDay: 10
      })
    };

    mockEventPublisher = {
      publish: jest.fn().mockResolvedValue(undefined)
    };

    useCase = new SendSmsUseCase(
      mockRepository,
      mockProvider,
      mockRateLimitPolicy,
      mockEventPublisher
    );
  });

  const validDto = {
    phoneNumber: '+255712345678',
    message: 'Test SMS message',
    userId: 'user-1'
  };

  describe('execute', () => {
    it('should send SMS successfully', async () => {
      const mockMessage = { getId: () => 'sms-1', getStatus: () => SmsStatus.SENT, getContent: () => ({ getSegmentCount: () => 1 }) } as any;
      mockRepository.create.mockResolvedValue(mockMessage);
      mockRepository.update.mockResolvedValue(mockMessage);

      const providerResponse = ProviderResponse.create({
        success: true,
        providerMessageId: 'msg-123',
        status: 'sent'
      });
      mockProvider.send.mockResolvedValue(providerResponse);

      const result = await useCase.execute(validDto);

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('sms-1');
      expect(result.status).toBe(SmsStatus.SENT);
      expect(mockProvider.send).toHaveBeenCalledWith('+255712345678', 'Test SMS message');
    });

    it('should throw error when phone number is missing', async () => {
      const invalidDto = { ...validDto, phoneNumber: '' };

      await expect(useCase.execute(invalidDto)).rejects.toThrow('Phone number is required');
    });

    it('should throw error when message is missing', async () => {
      const invalidDto = { ...validDto, message: '' };

      await expect(useCase.execute(invalidDto)).rejects.toThrow('Message content is required');
    });

    it('should throw RateLimitExceededError when global rate limit exceeded', async () => {
      mockRateLimitPolicy.isRateLimitExceeded.mockReturnValue({
        exceeded: true,
        retryAfter: 30000
      });

      await expect(useCase.execute(validDto)).rejects.toThrow(RateLimitExceededError);
    });

    it('should throw RateLimitExceededError when user rate limit exceeded', async () => {
      mockRateLimitPolicy.isUserRateLimitExceeded.mockReturnValue({ exceeded: true });

      await expect(useCase.execute(validDto)).rejects.toThrow(RateLimitExceededError);
    });

    it('should throw RateLimitExceededError when phone number rate limit exceeded', async () => {
      mockRateLimitPolicy.isPhoneNumberRateLimitExceeded.mockReturnValue({ exceeded: true });

      await expect(useCase.execute(validDto)).rejects.toThrow(RateLimitExceededError);
    });

    it('should handle provider failure', async () => {
      const mockMessage = {
        getId: () => 'sms-1',
        getStatus: () => SmsStatus.FAILED,
        getContent: () => ({ getSegmentCount: () => 1 }),
        markAsSending: jest.fn(),
        markAsFailed: jest.fn(),
        getDomainEvents: jest.fn().mockReturnValue([]),
        clearDomainEvents: jest.fn()
      } as any;
      mockRepository.create.mockResolvedValue(mockMessage);
      mockRepository.update.mockResolvedValue(mockMessage);

      const providerResponse = ProviderResponse.create({
        success: false,
        errorMessage: 'Invalid phone number',
        status: 'failed'
      });
      mockProvider.send.mockResolvedValue(providerResponse);

      const result = await useCase.execute(validDto);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Invalid phone number');
      expect(mockMessage.markAsFailed).toHaveBeenCalledWith('Invalid phone number');
    });

    it('should handle provider exception', async () => {
      const mockMessage = {
        getId: () => 'sms-1',
        getStatus: () => SmsStatus.FAILED,
        getContent: () => ({ getSegmentCount: () => 1 }),
        markAsSending: jest.fn(),
        markAsFailed: jest.fn(),
        getDomainEvents: jest.fn().mockReturnValue([]),
        clearDomainEvents: jest.fn()
      } as any;
      mockRepository.create.mockResolvedValue(mockMessage);
      mockRepository.update.mockResolvedValue(mockMessage);

      mockProvider.send.mockRejectedValue(new Error('Network timeout'));

      const result = await useCase.execute(validDto);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Network timeout');
      expect(mockMessage.markAsFailed).toHaveBeenCalledWith('Network timeout');
    });

    it('should persist message in QUEUED state before sending', async () => {
      const mockMessage = {
        getId: () => 'sms-1',
        getStatus: () => SmsStatus.SENT,
        getContent: () => ({ getSegmentCount: () => 1 }),
        markAsSending: jest.fn(),
        markAsSent: jest.fn(),
        getDomainEvents: jest.fn().mockReturnValue([]),
        clearDomainEvents: jest.fn()
      } as any;
      mockRepository.create.mockResolvedValue(mockMessage);
      mockRepository.update.mockResolvedValue(mockMessage);

      const providerResponse = ProviderResponse.create({
        success: true,
        providerMessageId: 'msg-123',
        status: 'sent'
      });
      mockProvider.send.mockResolvedValue(providerResponse);

      await useCase.execute(validDto);

      expect(mockRepository.create).toHaveBeenCalled();
      expect(mockMessage.markAsSending).toHaveBeenCalledWith('africastalking');
    });

    it('should publish domain events', async () => {
      const mockEvent = { eventType: 'SmsQueued', payload: {} };
      const mockMessage = {
        getId: () => 'sms-1',
        getStatus: () => SmsStatus.SENT,
        getContent: () => ({ getSegmentCount: () => 1 }),
        markAsSending: jest.fn(),
        markAsSent: jest.fn(),
        getDomainEvents: jest.fn().mockReturnValue([mockEvent]),
        clearDomainEvents: jest.fn()
      } as any;
      mockRepository.create.mockResolvedValue(mockMessage);
      mockRepository.update.mockResolvedValue(mockMessage);

      const providerResponse = ProviderResponse.create({
        success: true,
        providerMessageId: 'msg-123',
        status: 'sent'
      });
      mockProvider.send.mockResolvedValue(providerResponse);

      await useCase.execute(validDto);

      expect(mockEventPublisher.publish).toHaveBeenCalledWith('SmsQueued', {});
      expect(mockMessage.clearDomainEvents).toHaveBeenCalled();
    });

    it('should check rate limits for all windows', async () => {
      const mockMessage = {
        getId: () => 'sms-1',
        getStatus: () => SmsStatus.SENT,
        getContent: () => ({ getSegmentCount: () => 1 }),
        markAsSending: jest.fn(),
        markAsSent: jest.fn(),
        getDomainEvents: jest.fn().mockReturnValue([]),
        clearDomainEvents: jest.fn()
      } as any;
      mockRepository.create.mockResolvedValue(mockMessage);
      mockRepository.update.mockResolvedValue(mockMessage);

      const providerResponse = ProviderResponse.create({
        success: true,
        providerMessageId: 'msg-123',
        status: 'sent'
      });
      mockProvider.send.mockResolvedValue(providerResponse);

      await useCase.execute(validDto);

      expect(mockRepository.getMessageCountInWindow).toHaveBeenCalledTimes(3);
      expect(mockRateLimitPolicy.isRateLimitExceeded).toHaveBeenCalled();
      expect(mockRateLimitPolicy.isUserRateLimitExceeded).toHaveBeenCalled();
      expect(mockRateLimitPolicy.isPhoneNumberRateLimitExceeded).toHaveBeenCalled();
    });
  });
});
