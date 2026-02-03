import { SendNotificationUseCase } from '../send-notification.use-case';
import { Notification } from '../../../domain/entities/notification.entity';
import { NotificationContent } from '../../../domain/value-objects/notification-content.value-object';
import { NotificationMetadata } from '../../../domain/value-objects/notification-metadata.value-object';
import { NotificationPreference } from '../../../domain/entities/notification-preference.entity';
import { NotificationValidationError, RateLimitExceededError } from '../../../domain/errors/notification.errors';

describe('SendNotificationUseCase', () => {
  const content = NotificationContent.create('Test body');
  const metadata = NotificationMetadata.create({});

  const mockNotificationRepository = {
    findById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    findByUserId: jest.fn(),
    findByStatus: jest.fn(),
    findPending: jest.fn(),
    search: jest.fn(),
    markAsSent: jest.fn(),
    markAsDelivered: jest.fn(),
    markAsRead: jest.fn(),
    recordFailure: jest.fn(),
    getSentCountLastHour: jest.fn().mockResolvedValue(0)
  };

  const mockPreferenceRepository = {
    findById: jest.fn(),
    findByUserId: jest.fn(),
    findByUserAndChannel: jest.fn().mockResolvedValue(
      NotificationPreference.create({
        id: 'pref_1',
        userId: 'user_1',
        channel: 'email',
        enabled: true
      })
    ),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn()
  };

  const mockValidationService = {
    validateNotification: jest.fn().mockReturnValue({ isValid: true, errors: [] }),
    validateTemplate: jest.fn(),
    validateDeliveryAddress: jest.fn()
  };

  const mockDeliveryPolicy = {
    canSendNotification: jest.fn().mockReturnValue({ allowed: true }),
    shouldRetry: jest.fn(),
    getRetryDelay: jest.fn(),
    isWithinRateLimit: jest.fn(),
    requiresUserConsent: jest.fn(),
    evaluate: jest.fn()
  };

  const mockTriggerSaga = jest.fn().mockResolvedValue(undefined);

  let useCase: SendNotificationUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new SendNotificationUseCase(
      mockNotificationRepository as any,
      mockPreferenceRepository as any,
      mockValidationService as any,
      mockDeliveryPolicy as any,
      mockTriggerSaga
    );
  });

  it('should throw ValidationError when userId is missing', async () => {
    await expect(
      useCase.execute({
        userId: '',
        type: 'email',
        channel: 'email',
        subject: 'Test',
        content: 'Body'
      })
    ).rejects.toThrow(NotificationValidationError);
  });

  it('should throw ValidationError when content is missing', async () => {
    await expect(
      useCase.execute({
        userId: 'user_1',
        type: 'email',
        channel: 'email',
        subject: 'Test',
        content: ''
      })
    ).rejects.toThrow(NotificationValidationError);
  });

  it('should throw when policy denies send', async () => {
    mockDeliveryPolicy.canSendNotification.mockReturnValueOnce({ allowed: false, reason: 'Rate limit exceeded' });
    mockPreferenceRepository.findByUserAndChannel.mockResolvedValue(
      NotificationPreference.create({ id: 'p1', userId: 'user_1', channel: 'email', enabled: true })
    );
    mockNotificationRepository.create.mockImplementation((n: Notification) => Promise.resolve(n));

    await expect(
      useCase.execute({
        userId: 'user_1',
        type: 'email',
        channel: 'email',
        subject: 'Test',
        content: 'Body'
      })
    ).rejects.toThrow();
  });

  it('should create notification and trigger saga when allowed', async () => {
    mockNotificationRepository.create.mockImplementation((n: Notification) => Promise.resolve(n));

    const result = await useCase.execute({
      userId: 'user_1',
      type: 'email',
      channel: 'email',
      subject: 'Test',
      content: 'Body'
    });

    expect(result.notification).toBeDefined();
    expect(result.sagaTriggered).toBe(true);
    expect(mockNotificationRepository.create).toHaveBeenCalled();
    expect(mockTriggerSaga).toHaveBeenCalled();
  });
});
