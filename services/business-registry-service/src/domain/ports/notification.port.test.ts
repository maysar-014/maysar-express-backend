import type { INotificationAdapter } from './notification.port';

describe('INotificationAdapter contract', () => {
  it('supports notification sending signature', async () => {
    const adapter: INotificationAdapter = {
      sendNotification: jest.fn().mockResolvedValue(undefined)
    };

    await expect(
      adapter.sendNotification({
        userId: 'user-1',
        channel: 'in-app',
        subject: 'Business Registered',
        content: 'Your business is registered',
        metadata: { businessId: 'biz-1', priority: 'high' }
      })
    ).resolves.toBeUndefined();
  });
});
