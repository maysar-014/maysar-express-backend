import { NotificationProvider } from './NotificationProvider';

describe('NotificationProvider', () => {
  it('logs outgoing alert details', async () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    const provider = new NotificationProvider();

    await provider.sendAlert('user-1', 'capacity threshold reached');

    expect(logSpy).toHaveBeenCalledWith(
      '[NotificationProvider] Sending alert to user-1: capacity threshold reached'
    );
    logSpy.mockRestore();
  });
});
