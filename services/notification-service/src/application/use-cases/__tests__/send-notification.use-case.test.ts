import { SendNotificationUseCase } from '../send-notification.use-case';
import { Notification } from '../../../domain/entities/notification.entity';
import { NotificationValidationError, RateLimitExceededError } from '../../../domain/errors/notification.errors';

describe('SendNotificationUseCase', () => {
  let useCase: SendNotificationUseCase;
  let mockNotificationRepository: any;
  let mockPreferenceRepository: any;
  let mockValidationService: any;
  let mockDeliveryPolicy: any;
  let mockTriggerDeliverySaga: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    mockNotificationRepository = {
      create: jest.fn(),
      getSentCountLastHour: jest.fn().mockResolvedValue(0)
    };

    mockPreferenceRepository = {
      findByUserAndChannel: jest.fn().mockResolvedValue(null)
    };

    mockValidationService = {
      validateNotification: jest.fn()
    };

    mockDeliveryPolicy = {
      canSendNotification: jest.fn().mockReturnValue({ allowed: true })
    };

    mockTriggerDeliverySaga = jest.fn().mockResolvedValue(undefined);

    useCase = new SendNotificationUseCase(
      mockNotificationRepository,
      mockPreferenceRepository,
      mockValidationService,
      mockDeliveryPolicy,
      mockTriggerDeliverySaga
    );
  });

  const validDto = {
    userId: 'user-1',
    type: 'email' as const,
    channel: 'email' as const,
    subject: 'Test Subject',
    content: 'Test content',
    priority: 'medium' as const
  };

  describe('execute', () => {
    it('should send notification successfully', async () => {
      const mockNotification = { id: 'notif-1', ...validDto } as any;
      mockNotificationRepository.create.mockResolvedValue(mockNotification);

      const result = await useCase.execute(validDto);

      expect(result.notification).toEqual(mockNotification);
      expect(result.sagaTriggered).toBe(true);
      expect(mockNotificationRepository.create).toHaveBeenCalled();
      expect(mockTriggerDeliverySaga).toHaveBeenCalledWith(mockNotification);
    });

    it('should throw error when userId is missing', async () => {
      const invalidDto = { ...validDto, userId: '' };

      await expect(useCase.execute(invalidDto)).rejects.toThrow(NotificationValidationError);
      await expect(useCase.execute(invalidDto)).rejects.toThrow('UserId is required');
    });

    it('should throw error when type is missing', async () => {
      const invalidDto = { ...validDto, type: undefined as any };

      await expect(useCase.execute(invalidDto)).rejects.toThrow(NotificationValidationError);
    });

    it('should throw error when channel is missing', async () => {
      const invalidDto = { ...validDto, channel: undefined as any };

      await expect(useCase.execute(invalidDto)).rejects.toThrow(NotificationValidationError);
    });

    it('should throw error when subject is missing', async () => {
      const invalidDto = { ...validDto, subject: '' };

      await expect(useCase.execute(invalidDto)).rejects.toThrow(NotificationValidationError);
      await expect(useCase.execute(invalidDto)).rejects.toThrow('Subject is required');
    });

    it('should throw error when content is missing', async () => {
      const invalidDto = { ...validDto, content: '' };

      await expect(useCase.execute(invalidDto)).rejects.toThrow(NotificationValidationError);
      await expect(useCase.execute(invalidDto)).rejects.toThrow('Content is required');
    });

    it('should throw RateLimitExceededError when rate limit exceeded', async () => {
      mockDeliveryPolicy.canSendNotification.mockReturnValue({
        allowed: false,
        reason: 'Rate limit exceeded'
      });

      await expect(useCase.execute(validDto)).rejects.toThrow(RateLimitExceededError);
    });

    it('should throw NotificationValidationError when delivery not allowed', async () => {
      mockDeliveryPolicy.canSendNotification.mockReturnValue({
        allowed: false,
        reason: 'User opted out'
      });

      await expect(useCase.execute(validDto)).rejects.toThrow(NotificationValidationError);
      await expect(useCase.execute(validDto)).rejects.toThrow('User opted out');
    });

    it('should check user preferences', async () => {
      const mockPreference = { channel: 'email', enabled: true };
      mockPreferenceRepository.findByUserAndChannel.mockResolvedValue(mockPreference);
      mockNotificationRepository.create.mockResolvedValue({ id: 'notif-1' } as any);

      await useCase.execute(validDto);

      expect(mockPreferenceRepository.findByUserAndChannel).toHaveBeenCalledWith('user-1', 'email');
      expect(mockDeliveryPolicy.canSendNotification).toHaveBeenCalledWith(
        { id: 'user-1' },
        expect.any(Object),
        mockPreference,
        0
      );
    });

    it('should check sent count for rate limiting', async () => {
      mockNotificationRepository.getSentCountLastHour.mockResolvedValue(5);
      mockNotificationRepository.create.mockResolvedValue({ id: 'notif-1' } as any);

      await useCase.execute(validDto);

      expect(mockNotificationRepository.getSentCountLastHour).toHaveBeenCalledWith('user-1', 'email');
      expect(mockDeliveryPolicy.canSendNotification).toHaveBeenCalledWith(
        { id: 'user-1' },
        expect.any(Object),
        null,
        5
      );
    });

    it('should validate notification before saving', async () => {
      mockNotificationRepository.create.mockResolvedValue({ id: 'notif-1' } as any);

      await useCase.execute(validDto);

      expect(mockValidationService.validateNotification).toHaveBeenCalled();
    });

    it('should handle validation service errors', async () => {
      mockValidationService.validateNotification.mockImplementation(() => {
        throw new NotificationValidationError('Invalid notification format');
      });

      await expect(useCase.execute(validDto)).rejects.toThrow('Invalid notification format');
    });
  });
});
