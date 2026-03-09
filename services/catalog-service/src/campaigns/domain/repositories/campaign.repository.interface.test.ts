import type { Campaign } from '../entities/campaign.entity';
import type { ICampaignRepository } from './campaign.repository.interface';

describe('ICampaignRepository contract', () => {
  it('supports campaign persistence and query operations', async () => {
    const campaign = { getId: () => 'camp-1' } as unknown as Campaign;
    const repo: ICampaignRepository = {
      findById: jest.fn().mockResolvedValue(campaign),
      save: jest.fn().mockResolvedValue(undefined),
      delete: jest.fn().mockResolvedValue(undefined),
      findAll: jest.fn().mockResolvedValue([campaign]),
      findBySellerId: jest.fn().mockResolvedValue([campaign])
    };

    expect(await repo.findById('camp-1')).toBe(campaign);
    await repo.save(campaign);
    await repo.delete('camp-1');
    expect((await repo.findAll()).length).toBe(1);
    expect((await repo.findBySellerId('seller-1')).length).toBe(1);
  });
});
