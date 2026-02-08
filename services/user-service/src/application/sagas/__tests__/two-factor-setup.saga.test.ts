import { TwoFactorSetupSaga, executeTwoFactorSetupSaga } from '../two-factor-setup.saga';
import { logger } from '../../../infrastructure/services/logger.service';

jest.mock('../../../infrastructure/services/logger.service');

describe('TwoFactorSetupSaga', () => {
  const mockEmailService = {
    sendEmail: jest.fn().mockResolvedValue(undefined)
  };
  const mockNotificationClient = {
    sendEmail: jest.fn().mockResolvedValue(undefined)
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('executeTwoFactorSetupSaga', () => {
    const event = {
      eventId: 'evt-1',
      aggregateId: 'user-1',
      userId: 'user-1',
      method: 'totp',
      timestamp: new Date(),
      metadata: { correlationId: 'corr-1' }
    };

    test('starts orchestration with correct payload', async () => {
      const startSpy = jest.spyOn(TwoFactorSetupSaga.prototype, 'start').mockResolvedValue('saga-1');

      await executeTwoFactorSetupSaga(event as any, mockEmailService as any, mockNotificationClient as any);

      expect(startSpy).toHaveBeenCalledWith(
        event,
        'corr-1'
      );
    });

    test('handles saga start failure', async () => {
      jest.spyOn(TwoFactorSetupSaga.prototype, 'start').mockRejectedValue(new Error('Fail'));

      await expect(executeTwoFactorSetupSaga(event as any, mockEmailService as any, mockNotificationClient as any))
        .rejects.toThrow('Fail');

      expect(logger.error).toHaveBeenCalled();
    });
  });
});
