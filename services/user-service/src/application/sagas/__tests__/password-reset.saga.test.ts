import { PasswordResetSaga, executePasswordResetSaga } from '../password-reset.saga';
import { logger } from '../../../infrastructure/services/logger.service';

jest.mock('../../../infrastructure/services/logger.service');

describe('PasswordResetSaga', () => {
  const mockEmailService = {
    sendPasswordChangeNotification: jest.fn().mockResolvedValue(undefined)
  };
  const mockNotificationClient = {
    sendPushNotification: jest.fn().mockResolvedValue(undefined)
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('executePasswordResetSaga', () => {
    const event = {
      eventId: 'evt-1',
      aggregateId: 'user-1',
      metadata: { correlationId: 'corr-1' }
    };

    test('starts orchestration with correct context', async () => {
      const startSpy = jest.spyOn(PasswordResetSaga.prototype, 'start').mockResolvedValue('saga-1');

      await executePasswordResetSaga(event as any, mockEmailService as any, mockNotificationClient as any);

      expect(startSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          event,
          metadata: expect.objectContaining({ userId: 'user-1' })
        }),
        'corr-1'
      );
    });

    test('handles saga start failure', async () => {
      jest.spyOn(PasswordResetSaga.prototype, 'start').mockRejectedValue(new Error('Fail'));

      await expect(executePasswordResetSaga(event as any, mockEmailService as any, mockNotificationClient as any))
        .rejects.toThrow('Fail');

      expect(logger.error).toHaveBeenCalled();
    });
  });
});
