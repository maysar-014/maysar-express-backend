import type { ILeaderboardRepository, LeaderboardEntry } from './leaderboard.repository';

describe('ILeaderboardRepository contract', () => {
  it('supports update and rank retrieval operations', async () => {
    const entry: LeaderboardEntry = {
      learnerId: 'learner-4',
      totalScore: 980,
      modulesCount: 7,
      badgesCount: 3,
      updatedAt: new Date('2026-03-08T03:00:00.000Z')
    };
    const repository: ILeaderboardRepository = {
      updateEntry: jest.fn().mockResolvedValue(undefined),
      getTop: jest.fn().mockResolvedValue([entry]),
      getLearnerRank: jest.fn().mockResolvedValue(1),
      getEntry: jest.fn().mockResolvedValue(entry)
    };

    await repository.updateEntry({ learnerId: 'learner-4', totalScore: 981 });
    const top = await repository.getTop(10);
    const rank = await repository.getLearnerRank('learner-4');
    const current = await repository.getEntry('learner-4');

    expect(top).toHaveLength(1);
    expect(rank).toBe(1);
    expect(current?.totalScore).toBe(980);
  });
});
