import { executePhoneVerificationSaga, PhoneVerificationEvent } from '../phone-verification.saga';
import { notificationClient, auditClient } from '../service-clients';
import { logger } from '../../../infrastructure/services/logger.service';

jest.mock('../service-clients');
jest.mock('../../../infrastructure/services/logger.service');

describe('Phone Verification Saga', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (auditClient.recordEvent as jest.Mock).mockResolvedValue(undefined);
    (notificationClient.sendSMS as jest.Mock).mockResolvedValue(undefined);
  });

  test('executes all steps successfully with OTP method', async () => {
    const event: PhoneVerificationEvent = {
      eventId: 'evt-1',
      aggregateId: 'agg-1',
      userId: 'user-1',
      phoneNumber: '+1234567890',
      verificationMethod: 'otp',
      timestamp: new Date()
    };

    await executePhoneVerificationSaga(event);

    expect(logger.info).toHaveBeenCalledWith('Validating OTP', expect.objectContaining({ userId: 'user-1', method: 'otp' }));
    expect(logger.info).toHaveBeenCalledWith('Updating phone verification status', expect.any(Object));
    expect(auditClient.recordEvent).toHaveBeenCalledWith('user-1', 'phone_verified', expect.any(Object));
    expect(notificationClient.sendSMS).toHaveBeenCalled();
  });

  test('executes all steps successfully with call method', async () => {
    const event: PhoneVerificationEvent = {
      eventId: 'evt-2',
      aggregateId: 'agg-2',
      userId: 'user-2',
      phoneNumber: '+9876543210',
      verificationMethod: 'call',
      timestamp: new Date()
    };

    await executePhoneVerificationSaga(event);

    expect(logger.info).toHaveBeenCalledWith('Validating OTP', expect.objectContaining({ method: 'call' }));
    expect(auditClient.recordEvent).toHaveBeenCalledWith('user-2', 'phone_verified', expect.any(Object));
  });

  test('handles audit recording failure', async () => {
    const event: PhoneVerificationEvent = {
      eventId: 'evt-3',
      aggregateId: 'agg-3',
      userId: 'user-3',
      phoneNumber: '+1111111111',
      verificationMethod: 'otp',
      timestamp: new Date()
    };

    (auditClient.recordEvent as jest.Mock).mockRejectedValueOnce(new Error('Audit error'));

    await expect(executePhoneVerificationSaga(event)).rejects.toThrow('Audit error');
  });

  test('handles SMS notification failure', async () => {
    const event: PhoneVerificationEvent = {
      eventId: 'evt-4',
      aggregateId: 'agg-4',
      userId: 'user-4',
      phoneNumber: '+2222222222',
      verificationMethod: 'otp',
      timestamp: new Date()
    };

    (notificationClient.sendSMS as jest.Mock).mockRejectedValueOnce(new Error('SMS error'));

    await expect(executePhoneVerificationSaga(event)).rejects.toThrow('SMS error');
  });

  test('logs compensation steps on failure', async () => {
    const event: PhoneVerificationEvent = {
      eventId: 'evt-5',
      aggregateId: 'agg-5',
      userId: 'user-5',
      phoneNumber: '+3333333333',
      verificationMethod: 'call',
      timestamp: new Date()
    };

    (auditClient.recordEvent as jest.Mock).mockRejectedValueOnce(new Error('Audit error'));

    try {
      await executePhoneVerificationSaga(event);
    } catch (e) {
      // Expected
    }

    expect(logger.info).toHaveBeenCalledWith('Invalidating OTP', expect.any(Object));
    expect(logger.info).toHaveBeenCalledWith('Reverting phone verification status', expect.any(Object));
  });
});
