import { ProfileUpdateSaga, executeProfileUpdateSaga } from '../profile-update.saga';
import { logger } from '../../../infrastructure/services/logger.service';

jest.mock('../../../infrastructure/services/logger.service');

describe('ProfileUpdateSaga', () => {
  const mockEmailService = {
    sendEmail: jest.fn().mockResolvedValue(undefined)
  };
  const mockNotificationClient = {
    sendEmail: jest.fn().mockResolvedValue(undefined)
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('executeProfileUpdateSaga', () => {
    const event = {
      eventId: 'evt-1',
      aggregateId: 'user-1',
      changes: ['firstName'],
      oldValues: { firstName: 'John' },
      newValues: { firstName: 'Jane' },
      updatedBy: 'user-1',
      metadata: { correlationId: 'corr-1' }
    };

    test('starts orchestration with correct payload', async () => {
      const startSpy = jest.spyOn(ProfileUpdateSaga.prototype, 'start').mockResolvedValue('saga-1');

      await executeProfileUpdateSaga(event as any, mockEmailService as any, mockNotificationClient as any);

      expect(startSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          event: event,
          metadata: expect.objectContaining({
            correlationId: 'corr-1',
            userId: 'user-1'
          })
        }),
        'corr-1'
      );
    });

    test('handles saga start failure', async () => {
      jest.spyOn(ProfileUpdateSaga.prototype, 'start').mockRejectedValue(new Error('Fail'));

      await expect(executeProfileUpdateSaga(event as any, mockEmailService as any, mockNotificationClient as any))
        .rejects.toThrow('Fail');

      expect(logger.error).toHaveBeenCalled();
    });
  });
});
