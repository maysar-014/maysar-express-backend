import type { Badge, IBadgeRepository } from './badge.repository';

describe('IBadgeRepository contract', () => {
  it('supports save and query operations', async () => {
    const badge: Badge = {
      id: 'badge-2',
      learnerId: 'learner-3',
      type: 'ROAD_EXPERT',
      reason: 'Top score',
      awardedAt: new Date('2026-03-08T02:00:00.000Z')
    };
    const repository: IBadgeRepository = {
      save: jest.fn().mockResolvedValue(undefined),
      findByLearnerId: jest.fn().mockResolvedValue([badge]),
      findByType: jest.fn().mockResolvedValue([badge])
    };

    await repository.save(badge);
    const byLearner = await repository.findByLearnerId('learner-3');
    const byType = await repository.findByType('ROAD_EXPERT');

    expect(byLearner).toHaveLength(1);
    expect(byType[0].id).toBe('badge-2');
  });
});
