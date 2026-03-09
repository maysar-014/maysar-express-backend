import type { IUserServiceAdapter } from './user-service.port';

describe('IUserServiceAdapter contract', () => {
  it('supports business registration notification signature', async () => {
    const adapter: IUserServiceAdapter = {
      notifyBusinessRegistered: jest.fn().mockResolvedValue(undefined)
    };

    await expect(
      adapter.notifyBusinessRegistered({
        ownerId: 'owner-1',
        businessId: 'biz-1',
        businessName: 'Acme',
        correlationId: 'corr-1'
      })
    ).resolves.toBeUndefined();
  });
});
