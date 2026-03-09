import { InAppProviderAdapter } from './in-app-provider.adapter';

describe('InAppProviderAdapter', () => {
  const originalNodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    jest.restoreAllMocks();
  });

  it('creates deterministic in-app id format and skips debug logging in test env', async () => {
    process.env.NODE_ENV = 'test';
    jest.spyOn(Date, 'now').mockReturnValue(1700000000000);
    jest.spyOn(Math, 'random').mockReturnValue(0.123456789);
    const debugSpy = jest.spyOn(console, 'debug').mockImplementation(() => undefined);
    const adapter = new InAppProviderAdapter();

    const id = await adapter.create('user-1', { subject: 'Hello', body: 'Body' });

    expect(id).toMatch(/^inapp_1700000000000_[a-z0-9]+$/);
    expect(debugSpy).not.toHaveBeenCalled();
  });

  it('logs debug calls outside test environment for create and markAsRead', async () => {
    process.env.NODE_ENV = 'production';
    const debugSpy = jest.spyOn(console, 'debug').mockImplementation(() => undefined);
    const adapter = new InAppProviderAdapter();

    const id = await adapter.create('user-2', { subject: 'Subject', body: 'Content', data: { x: 1 } });
    await adapter.markAsRead(id);

    expect(debugSpy).toHaveBeenCalledTimes(2);
    expect(debugSpy).toHaveBeenNthCalledWith(
      1,
      'InAppProvider.create',
      expect.objectContaining({ userId: 'user-2', id: expect.any(String) })
    );
    expect(debugSpy).toHaveBeenNthCalledWith(
      2,
      'InAppProvider.markAsRead',
      expect.objectContaining({ notificationId: id })
    );
  });
});

