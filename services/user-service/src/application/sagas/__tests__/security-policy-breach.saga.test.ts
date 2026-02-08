import { SecurityPolicyBreachSaga, executeSecurityPolicyBreachSaga } from '../security-policy-breach.saga';
import { logger } from '../../../infrastructure/services/logger.service';

jest.mock('../../../infrastructure/services/logger.service');

describe('SecurityPolicyBreachSaga', () => {
  const mockEmailService = {
    sendSecurityAlert: jest.fn().mockResolvedValue(undefined)
  };
  const mockNotificationClient = {
    sendPushNotification: jest.fn().mockResolvedValue(undefined)
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('executeSecurityPolicyBreachSaga', () => {
    const event = {
      eventId: 'evt-1',
      aggregateId: 'user-1',
      userId: 'user-1',
      breachType: 'suspicious_login',
      severity: 'high',
      details: {},
      timestamp: new Date(),
      metadata: { correlationId: 'corr-1' }
    };

    test('starts orchestration with correct payload', async () => {
      const startSpy = jest.spyOn(SecurityPolicyBreachSaga.prototype, 'start').mockResolvedValue('saga-1');

      await executeSecurityPolicyBreachSaga(event as any, mockEmailService as any, mockNotificationClient as any);

      expect(startSpy).toHaveBeenCalledWith(
        event,
        'corr-1'
      );
    });

    test('handles saga start failure', async () => {
      jest.spyOn(SecurityPolicyBreachSaga.prototype, 'start').mockRejectedValue(new Error('Fail'));

      await expect(executeSecurityPolicyBreachSaga(event as any, mockEmailService as any, mockNotificationClient as any))
        .rejects.toThrow('Fail');

      expect(logger.error).toHaveBeenCalled();
    });
  });
});
