import { executeUserRegistrationSaga, UserRegistrationSaga } from '../user-registration.saga';
import { logger } from '../../../infrastructure/services/logger.service';

jest.mock('../../../infrastructure/services/logger.service');

describe('User Registration Saga', () => {
  const mockEmailService = {
    sendWelcomeEmail: jest.fn().mockResolvedValue(undefined),
    sendVerificationEmail: jest.fn().mockResolvedValue(undefined),
    sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
    sendSecurityAlert: jest.fn().mockResolvedValue(undefined)
  };
  const mockNotificationClient = {
    sendPushNotification: jest.fn().mockResolvedValue(undefined),
    sendSMS: jest.fn().mockResolvedValue(undefined),
    sendEmail: jest.fn().mockResolvedValue(undefined)
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('UserRegistrationSaga initialization', () => {
    test('creates saga with dependencies', () => {
      const saga = new UserRegistrationSaga(mockEmailService as any, mockNotificationClient as any);
      expect(saga).toBeDefined();
    });
  });

  describe('executeUserRegistrationSaga', () => {
    const event = {
      eventId: 'evt-1',
      aggregateId: 'user-1',
      email: 'test@example.com',
      role: 'buyer',
      metadata: { correlationId: 'corr-1' }
    };

    test('executes registration saga and starts orchestration', async () => {
      // Spy on the start method of the saga instance
      const startSpy = jest.spyOn(UserRegistrationSaga.prototype, 'start').mockResolvedValue('saga-123');

      await executeUserRegistrationSaga(event as any, mockEmailService as any, mockNotificationClient as any);

      expect(startSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          event,
          metadata: expect.objectContaining({
            userId: 'user-1'
          })
        }),
        'corr-1'
      );
    });

    test('generates correlation ID if not provided', async () => {
      const eventNoCorr = { ...event, metadata: undefined };
      const startSpy = jest.spyOn(UserRegistrationSaga.prototype, 'start').mockResolvedValue('saga-123');

      await executeUserRegistrationSaga(eventNoCorr as any, mockEmailService as any, mockNotificationClient as any);

      expect(startSpy).toHaveBeenCalledWith(
        expect.any(Object),
        expect.any(String) // Auto-generated UUID
      );
    });

    test('handles saga start failure', async () => {
      const startSpy = jest.spyOn(UserRegistrationSaga.prototype, 'start').mockRejectedValue(new Error('Start failed'));

      await expect(executeUserRegistrationSaga(event as any, mockEmailService as any, mockNotificationClient as any))
        .rejects.toThrow('Start failed');

      expect(logger.error).toHaveBeenCalledWith('User registration saga failed to start', expect.objectContaining({
        error: 'Start failed',
        userId: 'user-1'
      }));
    });
  });
});
