import { PhoneVerificationSaga, executePhoneVerificationSaga } from '../phone-verification.saga';
import { logger } from '../../../infrastructure/services/logger.service';

jest.mock('../../../infrastructure/services/logger.service');

describe('PhoneVerificationSaga', () => {
  const mockEmailService = {};
  const mockNotificationClient = {
    sendSMS: jest.fn().mockResolvedValue(undefined)
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('executePhoneVerificationSaga', () => {
    const event = {
      eventId: 'evt-1',
      aggregateId: 'user-1',
      userId: 'user-1',
      phoneNumber: '+1234567890',
      verificationMethod: 'otp',
      timestamp: new Date(),
      metadata: { correlationId: 'corr-1' }
    };

    test('starts orchestration with correct payload', async () => {
      const startSpy = jest.spyOn(PhoneVerificationSaga.prototype, 'start').mockResolvedValue('saga-1');

      await executePhoneVerificationSaga(event as any, mockEmailService as any, mockNotificationClient as any);

      expect(startSpy).toHaveBeenCalledWith(
        event,
        'corr-1'
      );
    });

    test('handles saga start failure', async () => {
      jest.spyOn(PhoneVerificationSaga.prototype, 'start').mockRejectedValue(new Error('Fail'));

      await expect(executePhoneVerificationSaga(event as any, mockEmailService as any, mockNotificationClient as any))
        .rejects.toThrow('Fail');

      expect(logger.error).toHaveBeenCalled();
    });
  });
});
