import { executeTwoFactorSetupSaga, TwoFactorSetupEvent } from '../two-factor-setup.saga';
import { notificationClient, auditClient } from '../service-clients';
import { logger } from '../../../infrastructure/services/logger.service';

jest.mock('../service-clients');
jest.mock('../../../infrastructure/services/logger.service');

describe('Two Factor Setup Saga', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (auditClient.recordEvent as jest.Mock).mockResolvedValue(undefined);
    (notificationClient.sendEmail as jest.Mock).mockResolvedValue(undefined);
  });

  test('executes all steps for TOTP method', async () => {
    const event: TwoFactorSetupEvent = {
      eventId: 'evt-1',
      aggregateId: 'agg-1',
      userId: 'user-1',
      method: 'totp',
      timestamp: new Date()
    };

    await executeTwoFactorSetupSaga(event);

    expect(logger.info).toHaveBeenCalledWith('Registering 2FA device', expect.objectContaining({ method: 'totp' }));
    expect(logger.info).toHaveBeenCalledWith('Generating backup codes', expect.any(Object));
    expect(auditClient.recordEvent).toHaveBeenCalledWith('user-1', '2fa_setup', expect.any(Object));
    expect(notificationClient.sendEmail).toHaveBeenCalledWith('user-1', '2fa_enabled', expect.any(Object));
  });

  test('executes all steps for SMS method', async () => {
    const event: TwoFactorSetupEvent = {
      eventId: 'evt-2',
      aggregateId: 'agg-2',
      userId: 'user-2',
      method: 'sms',
      deviceId: 'device-123',
      timestamp: new Date()
    };

    await executeTwoFactorSetupSaga(event);

    expect(logger.info).toHaveBeenCalledWith('Registering 2FA device', expect.objectContaining({ method: 'sms' }));
    expect(auditClient.recordEvent).toHaveBeenCalledWith('user-2', '2fa_setup', expect.objectContaining({
      method: 'sms',
      deviceId: 'device-123'
    }));
  });

  test('executes all steps for SMS method without device ID', async () => {
    const event: TwoFactorSetupEvent = {
      eventId: 'evt-3',
      aggregateId: 'agg-3',
      userId: 'user-3',
      method: 'sms',
      timestamp: new Date()
    };

    await executeTwoFactorSetupSaga(event);

    expect(logger.info).toHaveBeenCalledWith('Registering 2FA device', expect.any(Object));
    expect(auditClient.recordEvent).toHaveBeenCalled();
  });

  test('handles backup code generation failure', async () => {
    const event: TwoFactorSetupEvent = {
      eventId: 'evt-4',
      aggregateId: 'agg-4',
      userId: 'user-4',
      method: 'totp',
      timestamp: new Date()
    };

    (auditClient.recordEvent as jest.Mock).mockRejectedValueOnce(new Error('Backup code error'));

    await expect(executeTwoFactorSetupSaga(event)).rejects.toThrow('Backup code error');
  });

  test('handles email notification failure', async () => {
    const event: TwoFactorSetupEvent = {
      eventId: 'evt-5',
      aggregateId: 'agg-5',
      userId: 'user-5',
      method: 'totp',
      timestamp: new Date()
    };

    (notificationClient.sendEmail as jest.Mock).mockRejectedValueOnce(new Error('Email error'));

    await expect(executeTwoFactorSetupSaga(event)).rejects.toThrow('Email error');
  });

  test('logs compensation steps on failure', async () => {
    const event: TwoFactorSetupEvent = {
      eventId: 'evt-6',
      aggregateId: 'agg-6',
      userId: 'user-6',
      method: 'totp',
      timestamp: new Date()
    };

    (auditClient.recordEvent as jest.Mock).mockRejectedValueOnce(new Error('Audit error'));

    try {
      await executeTwoFactorSetupSaga(event);
    } catch (e) {
      // Expected
    }

    expect(logger.info).toHaveBeenCalledWith('Unregistering 2FA device', expect.any(Object));
    expect(logger.info).toHaveBeenCalledWith('Invalidating backup codes', expect.any(Object));
  });

  test('records audit event with method and device ID', async () => {
    const event: TwoFactorSetupEvent = {
      eventId: 'evt-7',
      aggregateId: 'agg-7',
      userId: 'user-7',
      method: 'sms',
      deviceId: 'device-456',
      timestamp: new Date()
    };

    await executeTwoFactorSetupSaga(event);

    expect(auditClient.recordEvent).toHaveBeenCalledWith('user-7', '2fa_setup', expect.objectContaining({
      method: 'sms',
      deviceId: 'device-456'
    }));
  });

  test('sends confirmation email with method', async () => {
    const event: TwoFactorSetupEvent = {
      eventId: 'evt-8',
      aggregateId: 'agg-8',
      userId: 'user-8',
      method: 'totp',
      timestamp: new Date()
    };

    await executeTwoFactorSetupSaga(event);

    expect(notificationClient.sendEmail).toHaveBeenCalledWith('user-8', '2fa_enabled', expect.objectContaining({
      method: 'totp'
    }));
  });

  test('handles device registration failure', async () => {
    const event: TwoFactorSetupEvent = {
      eventId: 'evt-9',
      aggregateId: 'agg-9',
      userId: 'user-9',
      method: 'sms',
      timestamp: new Date()
    };

    (auditClient.recordEvent as jest.Mock).mockRejectedValueOnce(new Error('Device registration error'));

    await expect(executeTwoFactorSetupSaga(event)).rejects.toThrow('Device registration error');
  });
});
