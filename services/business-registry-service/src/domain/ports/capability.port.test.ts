import type { ICapabilityAdapter } from './capability.port';

describe('ICapabilityAdapter contract', () => {
  it('supports capability enable/disable signatures', async () => {
    const adapter: ICapabilityAdapter = {
      enableCapabilities: jest.fn().mockResolvedValue(['cap-1']),
      disableCapabilities: jest.fn().mockResolvedValue(undefined)
    };

    await expect(
      adapter.enableCapabilities({
        businessId: 'biz-1',
        ownerId: 'owner-1',
        capabilities: ['orders'],
        correlationId: 'corr-1'
      })
    ).resolves.toEqual(['cap-1']);

    await expect(
      adapter.disableCapabilities({
        businessId: 'biz-1',
        capabilityIds: ['cap-1'],
        correlationId: 'corr-1'
      })
    ).resolves.toBeUndefined();
  });
});
