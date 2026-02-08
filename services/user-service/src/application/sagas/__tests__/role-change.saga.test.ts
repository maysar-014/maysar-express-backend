import { RoleChangeSaga, executeRoleChangeSaga } from '../role-change.saga';
import { logger } from '../../../infrastructure/services/logger.service';

jest.mock('../../../infrastructure/services/logger.service');

describe('RoleChangeSaga', () => {
  const mockEmailService = {
    sendEmail: jest.fn().mockResolvedValue(undefined)
  };
  const mockNotificationClient = {
    sendEmail: jest.fn().mockResolvedValue(undefined)
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('executeRoleChangeSaga', () => {
    const event = {
      eventId: 'evt-1',
      aggregateId: 'user-1',
      userId: 'user-1',
      oldRole: 'buyer',
      newRole: 'seller',
      changedBy: 'admin-1',
      metadata: { correlationId: 'corr-1' }
    };

    test('starts orchestration with correct payload', async () => {
      const startSpy = jest.spyOn(RoleChangeSaga.prototype, 'start').mockResolvedValue('saga-1');

      await executeRoleChangeSaga(event as any, mockEmailService as any, mockNotificationClient as any);

      expect(startSpy).toHaveBeenCalledWith(
        event,
        'corr-1'
      );
    });

    test('handles saga start failure', async () => {
      jest.spyOn(RoleChangeSaga.prototype, 'start').mockRejectedValue(new Error('Fail'));

      await expect(executeRoleChangeSaga(event as any, mockEmailService as any, mockNotificationClient as any))
        .rejects.toThrow('Fail');

      expect(logger.error).toHaveBeenCalled();
    });
  });
});
