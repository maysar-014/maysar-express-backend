import { AppError, ErrorSeverity, ErrorType } from '../../domain/errors';

jest.mock('./logger', () => ({
  appLogger: {
    warn: jest.fn(),
    info: jest.fn(),
    error: jest.fn()
  }
}));

import {
  AlertManager,
  alertManager,
  alertCriticalError,
  alertHighPriority,
  alertMediumPriority,
  handleCriticalError
} from './alerting';
import { appLogger } from './logger';

describe('AlertManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (AlertManager as unknown as { instance?: AlertManager }).instance = undefined;
    (globalThis as unknown as { fetch?: jest.Mock }).fetch = jest.fn();
  });

  it('returns disabled result when alerting is turned off', async () => {
    const manager = AlertManager.getInstance({
      enabled: false,
      channels: { console: true }
    });

    const result = await manager.sendAlert({
      severity: ErrorSeverity.HIGH,
      title: 'Disabled Alert',
      message: 'Should not send',
      context: { service: 'order-service' }
    });

    expect(result).toEqual([
      { success: false, channel: 'disabled', error: 'Alerting disabled' }
    ]);
  });

  it('sends alert to configured channels and stores it', async () => {
    const fetchMock = (globalThis as unknown as { fetch: jest.Mock }).fetch;
    fetchMock.mockResolvedValue({ ok: true, status: 200, statusText: 'OK' });
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    jest.spyOn(console, 'log').mockImplementation(() => undefined);

    const manager = AlertManager.getInstance({
      enabled: true,
      channels: {
        console: true,
        webhook: { url: 'https://alerts.local/webhook', headers: { 'x-key': 'k1' } },
        email: {
          smtp: {
            host: 'smtp.local',
            port: 587,
            secure: false,
            auth: { user: 'u', pass: 'p' }
          },
          from: 'alerts@local',
          to: ['ops@local']
        }
      }
    });

    const result = await manager.sendAlert({
      severity: ErrorSeverity.CRITICAL,
      title: 'Database Down',
      message: 'Primary DB unavailable',
      context: { service: 'order-service', operation: 'checkout' }
    });

    expect(result).toEqual([
      { success: true, channel: 'console' },
      { success: true, channel: 'webhook' },
      { success: true, channel: 'email' }
    ]);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://alerts.local/webhook',
      expect.objectContaining({ method: 'POST' })
    );
    expect(manager.getRecentAlerts(1)[0]).toEqual(
      expect.objectContaining({
        title: 'Database Down',
        severity: ErrorSeverity.CRITICAL
      })
    );
  });

  it('returns webhook failure when endpoint responds with error status', async () => {
    const fetchMock = (globalThis as unknown as { fetch: jest.Mock }).fetch;
    fetchMock.mockResolvedValue({ ok: false, status: 500, statusText: 'Internal Server Error' });
    jest.spyOn(console, 'error').mockImplementation(() => undefined);

    const manager = AlertManager.getInstance({
      enabled: true,
      channels: {
        console: true,
        webhook: { url: 'https://alerts.local/webhook' }
      }
    });

    const result = await manager.sendAlert({
      severity: ErrorSeverity.HIGH,
      title: 'Webhook Fail',
      message: 'simulate failure',
      context: { service: 'order-service' }
    });

    expect(result).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          success: false,
          channel: 'webhook',
          error: 'Webhook returned 500: Internal Server Error'
        })
      ])
    );
  });

  it('detects duplicate alerts in the recent window', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const manager = AlertManager.getInstance({
      enabled: true,
      channels: { console: true }
    });

    await manager.sendAlert({
      severity: ErrorSeverity.HIGH,
      title: 'Same Alert',
      message: 'first',
      context: { service: 'order-service' }
    });

    const duplicate = manager.isDuplicateAlert({
      severity: ErrorSeverity.HIGH,
      title: 'Same Alert',
      message: 'second',
      context: { service: 'order-service' }
    });

    expect(duplicate).toBe(true);
  });

  it('enforces alert store cap and clears alerts', async () => {
    const manager = AlertManager.getInstance({
      enabled: true,
      channels: { console: false }
    });

    for (let i = 0; i < 1002; i++) {
      await manager.sendAlert({
        severity: ErrorSeverity.LOW,
        title: `Alert-${i}`,
        message: 'bulk',
        context: { service: 'order-service' }
      });
    }

    expect((manager as unknown as { alerts: Map<string, unknown> }).alerts.size).toBe(1000);
    manager.clearAlerts();
    expect(manager.getRecentAlerts()).toHaveLength(0);
  });

  it('wraps common priority helpers and critical alert payloads', async () => {
    const manager = AlertManager.getInstance({
      enabled: true,
      channels: { console: false }
    });
    const sendSpy = jest.spyOn(manager, 'sendAlert').mockResolvedValue([]);

    const appError = new AppError(
      'fatal checkout error',
      ErrorType.INTERNAL_ERROR,
      ErrorSeverity.CRITICAL,
      { operation: 'checkout' }
    );

    await manager.sendCriticalAlert('Critical Checkout', appError, { region: 'eu' });
    await manager.sendHighAlert('High Priority', 'high message', { x: 1 });
    await manager.sendMediumAlert('Medium Priority', 'medium message', { y: 2 });

    expect(sendSpy).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        severity: ErrorSeverity.CRITICAL,
        title: 'Critical Checkout',
        context: expect.objectContaining({
          error: expect.objectContaining({
            type: ErrorType.INTERNAL_ERROR,
            severity: ErrorSeverity.CRITICAL
          })
        })
      })
    );
    expect(sendSpy).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ severity: ErrorSeverity.HIGH, title: 'High Priority' })
    );
    expect(sendSpy).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({ severity: ErrorSeverity.MEDIUM, title: 'Medium Priority' })
    );
  });

  it('handles critical errors with duplicate suppression and result logging', async () => {
    const warnSpy = (appLogger as unknown as { warn: jest.Mock }).warn;
    const infoSpy = (appLogger as unknown as { info: jest.Mock }).info;
    const errorSpy = (appLogger as unknown as { error: jest.Mock }).error;

    jest.spyOn(alertManager, 'isDuplicateAlert').mockReturnValueOnce(true);
    await handleCriticalError(new Error('duplicate failure'));
    expect(warnSpy).toHaveBeenCalledWith(
      'Duplicate critical alert suppressed',
      expect.objectContaining({ title: 'Critical System Error' })
    );

    jest.spyOn(alertManager, 'isDuplicateAlert').mockReturnValue(false);
    jest.spyOn(alertManager, 'sendCriticalAlert').mockResolvedValue([
      { success: true, channel: 'console' },
      { success: false, channel: 'webhook', error: 'network' }
    ]);

    await handleCriticalError(new Error('fresh failure'));

    expect(infoSpy).toHaveBeenCalledWith('Critical alert sent successfully to 1 channels');
    expect(errorSpy).toHaveBeenCalledWith(
      'Failed to send critical alert to 1 channels',
      expect.objectContaining({
        failedChannels: ['webhook'],
        errors: ['network']
      })
    );
  });

  it('exports convenience alert helpers bound to global alert manager', async () => {
    const criticalSpy = jest.spyOn(alertManager, 'sendCriticalAlert').mockResolvedValue([]);
    const highSpy = jest.spyOn(alertManager, 'sendHighAlert').mockResolvedValue([]);
    const mediumSpy = jest.spyOn(alertManager, 'sendMediumAlert').mockResolvedValue([]);

    await alertCriticalError('c', new Error('err'));
    await alertHighPriority('h', 'msg');
    await alertMediumPriority('m', 'msg');

    expect(criticalSpy).toHaveBeenCalled();
    expect(highSpy).toHaveBeenCalled();
    expect(mediumSpy).toHaveBeenCalled();
  });
});
