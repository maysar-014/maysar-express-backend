import { PrismaLeaderboardRepository } from './prisma-leaderboard.repository';

describe('PrismaLeaderboardRepository', () => {
  it('updates entries with fallback defaults and returns top leaderboard', async () => {
    const upsert = jest.fn().mockResolvedValue(undefined);
    const findMany = jest.fn().mockResolvedValue([{ learnerId: 'l1', totalScore: 100, modulesCount: 2, badgesCount: 1 }]);
    const repo = new PrismaLeaderboardRepository({
      leaderboardEntry: {
        upsert,
        findMany,
        findUnique: jest.fn(),
        count: jest.fn()
      }
    } as never);

    await repo.updateEntry({ learnerId: 'l1' });
    const top = await repo.getTop(5);

    expect(upsert).toHaveBeenCalledWith({
      where: { learnerId: 'l1' },
      update: {},
      create: {
        learnerId: 'l1',
        totalScore: 0,
        modulesCount: 0,
        badgesCount: 0
      }
    });
    expect(findMany).toHaveBeenCalledWith({
      take: 5,
      orderBy: { totalScore: 'desc' }
    });
    expect(top[0].learnerId).toBe('l1');
  });

  it('computes learner rank from higher-score count and returns 0 when missing', async () => {
    const findUnique = jest
      .fn()
      .mockResolvedValueOnce({ learnerId: 'l2', totalScore: 77, modulesCount: 3, badgesCount: 2 })
      .mockResolvedValueOnce(null);
    const count = jest.fn().mockResolvedValue(4);
    const repo = new PrismaLeaderboardRepository({
      leaderboardEntry: {
        upsert: jest.fn(),
        findMany: jest.fn(),
        findUnique,
        count
      }
    } as never);

    const rank = await repo.getLearnerRank('l2');
    const missingRank = await repo.getLearnerRank('missing');

    expect(count).toHaveBeenCalledWith({
      where: {
        totalScore: { gt: 77 }
      }
    });
    expect(rank).toBe(5);
    expect(missingRank).toBe(0);
  });

  it('returns entry by learner and uses fallback when leaderboard delegate is missing', async () => {
    const repo = new PrismaLeaderboardRepository({
      training_LeaderboardEntry: {
        upsert: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn().mockResolvedValue({ learnerId: 'l7', totalScore: 50 }),
        count: jest.fn()
      }
    } as never);
    const entry = await repo.getEntry('l7');
    expect(entry?.learnerId).toBe('l7');

    const repoWithoutDelegate = new PrismaLeaderboardRepository({} as never);
    await repoWithoutDelegate.updateEntry({
      learnerId: 'l9',
      totalScore: 50,
      modulesCount: 1,
      badgesCount: 0
    });
    const top = await repoWithoutDelegate.getTop(1);
    expect(top).toHaveLength(1);
    expect(top[0].learnerId).toBe('l9');
  });
});

