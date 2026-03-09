import { PrismaBadgeRepository } from './prisma-badge.repository';

describe('PrismaBadgeRepository', () => {
  it('saves badge via upsert and queries by learner/type', async () => {
    const upsert = jest.fn().mockResolvedValue(undefined);
    const findMany = jest
      .fn()
      .mockResolvedValueOnce([{ id: 'b1', learnerId: 'l1', type: 'T1', reason: 'r', awardedAt: new Date() }])
      .mockResolvedValueOnce([{ id: 'b2', learnerId: 'l2', type: 'T2', reason: 'r2', awardedAt: new Date() }]);
    const repo = new PrismaBadgeRepository({ badge: { upsert, findMany } } as never);

    await repo.save({
      id: 'b1',
      learnerId: 'l1',
      type: 'T1',
      reason: 'reason',
      metadata: { x: 1 },
      awardedAt: new Date('2026-03-08T00:00:00.000Z')
    });
    const byLearner = await repo.findByLearnerId('l1');
    const byType = await repo.findByType('T2');

    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'b1' },
        create: expect.objectContaining({ learnerId: 'l1', type: 'T1' })
      })
    );
    expect(findMany).toHaveBeenNthCalledWith(1, { where: { learnerId: 'l1' } });
    expect(findMany).toHaveBeenNthCalledWith(2, { where: { type: 'T2' } });
    expect(byLearner[0].id).toBe('b1');
    expect(byType[0].id).toBe('b2');
  });

  it('throws when badge delegate is unavailable', async () => {
    const repo = new PrismaBadgeRepository({} as never);

    await expect(repo.findByType('X')).rejects.toThrow(
      'Badge delegate is not configured on prisma client'
    );
  });
});
