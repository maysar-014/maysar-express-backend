const walletLoggerInfoMock = jest.fn();
const businessLoggerDebugMock = jest.fn();
const businessLoggerWarnMock = jest.fn();

jest.mock('../services/logger.service', () => ({
  logger: {
    info: walletLoggerInfoMock,
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
  }
}));

jest.mock('../../../../business-registry-service/src/infrastructure/services/logger.service', () => ({
  logger: {
    debug: businessLoggerDebugMock,
    warn: businessLoggerWarnMock,
    info: jest.fn(),
    error: jest.fn()
  }
}));

jest.mock('../../../../notification-service/src/internal/notification.facade', () => ({
  sendNotificationInternal: jest.fn().mockResolvedValue(undefined)
}));

import { NotificationAdapter as WalletNotificationAdapter } from './notification.adapter';

describe('notification adapters', () => {
  const fetchMock = jest.fn();
  const previousFetch = global.fetch;
  const previousEnv = { ...process.env };

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    process.env = { ...previousEnv };
    global.fetch = previousFetch;
    jest.resetModules();
  });

  it('logs wallet notifications through wallet adapter', async () => {
    const adapter = new WalletNotificationAdapter();

    await adapter.sendWalletNotification('user-1', 'wallet_credited', {
      amount: 50,
      currency: 'TZS'
    });

    expect(walletLoggerInfoMock).toHaveBeenCalledWith(
      'Sending wallet notification to user user-1',
      expect.objectContaining({
        notificationType: 'wallet_credited'
      })
    );
  });

  it('sends business-registry notifications over HTTP and logs success/failure', async () => {
    process.env.PLATFORM_BASE_URL = 'http://platform.local';

    const businessModule = await import('../../../../business-registry-service/src/infrastructure/adapters/notification.adapter');
    const notificationFacade = await import('../../../../notification-service/src/internal/notification.facade');
    const adapter = new businessModule.NotificationAdapter();

    await adapter.sendNotification({
      userId: 'user-2',
      channel: 'email',
      subject: 'Welcome',
      content: 'Hello'
    });
    expect(notificationFacade.sendNotificationInternal).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-2',
        channel: 'email',
        subject: 'Welcome',
        content: 'Hello'
      })
    );
    expect(businessLoggerDebugMock).toHaveBeenCalled();

    (notificationFacade.sendNotificationInternal as jest.Mock).mockRejectedValueOnce(new Error('server error'));

    await expect(
      adapter.sendNotification({
        userId: 'user-2',
        channel: 'sms',
        subject: 'Alert',
        content: 'Body'
      })
    ).rejects.toThrow('server error');
    expect(businessLoggerWarnMock).toHaveBeenCalled();
  });
});
