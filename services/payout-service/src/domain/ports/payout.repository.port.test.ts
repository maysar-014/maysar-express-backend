import type { Payout } from '../entities/payout.entity';
import type { IPayoutRepository } from './payout.repository.port';

describe('IPayoutRepository port', () => {
  it('supports persistence and query operations', async () => {
    const payout = { id: 'po-1' } as unknown as Payout;
    const repo: IPayoutRepository = {
      save: jest.fn().mockResolvedValue(undefined),
      findById: jest.fn().mockResolvedValue(payout),
      findByUserId: jest.fn().mockResolvedValue([payout]),
      findByUserIdAndRole: jest.fn().mockResolvedValue([payout]),
      update: jest.fn().mockResolvedValue(undefined)
    };

    await repo.save(payout);
    expect(await repo.findById('po-1')).toBe(payout);
    expect((await repo.findByUserId('user-1')).length).toBe(1);
    expect((await repo.findByUserIdAndRole('user-1', 'seller')).length).toBe(1);
    await repo.update(payout);
    expect(repo.update).toHaveBeenCalledWith(payout);
  });
});
