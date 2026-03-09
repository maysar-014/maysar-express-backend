import type { EnablerEntity } from '../entities/enabler.entity';
import type { IEnablerRepository } from './enabler.repository.interface';

describe('IEnablerRepository contract', () => {
  it('supports enabler lookup and persistence operations', async () => {
    const enabler = { id: 'enabler-1' } as unknown as EnablerEntity;
    const repo: IEnablerRepository = {
      findById: jest.fn().mockResolvedValue(enabler),
      findByUserId: jest.fn().mockResolvedValue(enabler),
      findByStatus: jest.fn().mockResolvedValue([enabler]),
      save: jest.fn().mockResolvedValue(undefined),
      update: jest.fn().mockResolvedValue(undefined)
    };

    expect(await repo.findById('enabler-1')).toBe(enabler);
    expect(await repo.findByUserId('user-1')).toBe(enabler);
    expect((await repo.findByStatus('ACTIVE' as never)).length).toBe(1);
  });
});
