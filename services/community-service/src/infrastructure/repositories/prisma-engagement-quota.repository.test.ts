import { PrismaEngagementQuotaRepository } from './prisma-engagement-quota.repository';
import { EngagementQuota } from '../../domain/value-objects/engagement-quota.value-object';

describe('PrismaEngagementQuotaRepository', () => {
  it('findByUserAndType returns null when record is missing', async () => {
    const prisma = {
      community_EngagementQuota: {
        findUnique: jest.fn().mockResolvedValue(null),
        upsert: jest.fn()
      }
    };
    const repository = new PrismaEngagementQuotaRepository(prisma as never);

    await expect(repository.findByUserAndType('u1', 'POST')).resolves.toBeNull();
  });

  it('findByUserAndType maps persistence record to domain object', async () => {
    const record = {
      userId: 'u1',
      quotaType: 'POST',
      dailyLimit: 5,
      weeklyLimit: 20,
      dailyRemaining: 4,
      weeklyRemaining: 10,
      dailyResetAt: new Date('2026-03-10T00:00:00.000Z'),
      weeklyResetAt: new Date('2026-03-16T00:00:00.000Z'),
      qualityBonusEarned: 1
    };
    const prisma = {
      community_EngagementQuota: {
        findUnique: jest.fn().mockResolvedValue(record),
        upsert: jest.fn()
      }
    };
    const repository = new PrismaEngagementQuotaRepository(prisma as never);

    const result = await repository.findByUserAndType('u1', 'POST');

    expect(prisma.community_EngagementQuota.findUnique).toHaveBeenCalledWith({
      where: {
        userId_quotaType: {
          userId: 'u1',
          quotaType: 'POST'
        }
      }
    });
    expect(result).toBeInstanceOf(EngagementQuota);
    expect(result?.userId).toBe('u1');
    expect(result?.quotaType).toBe('POST');
  });

  it('save upserts quota and returns mapped domain object', async () => {
    const upsertRecord = {
      userId: 'u2',
      quotaType: 'COMMENT',
      dailyLimit: 20,
      weeklyLimit: 100,
      dailyRemaining: 19,
      weeklyRemaining: 99,
      dailyResetAt: new Date('2026-03-10T00:00:00.000Z'),
      weeklyResetAt: new Date('2026-03-16T00:00:00.000Z'),
      qualityBonusEarned: 0
    };
    const prisma = {
      community_EngagementQuota: {
        findUnique: jest.fn(),
        upsert: jest.fn().mockResolvedValue(upsertRecord)
      }
    };
    const repository = new PrismaEngagementQuotaRepository(prisma as never);
    const quota = new EngagementQuota({
      userId: 'u2',
      quotaType: 'COMMENT',
      dailyLimit: 20,
      weeklyLimit: 100,
      dailyRemaining: 19,
      weeklyRemaining: 99,
      dailyResetAt: new Date('2026-03-10T00:00:00.000Z'),
      weeklyResetAt: new Date('2026-03-16T00:00:00.000Z'),
      qualityBonusEarned: 0
    });

    const saved = await repository.save(quota);

    expect(prisma.community_EngagementQuota.upsert).toHaveBeenCalledWith({
      where: {
        userId_quotaType: {
          userId: 'u2',
          quotaType: 'COMMENT'
        }
      },
      create: expect.objectContaining({
        userId: 'u2',
        quotaType: 'COMMENT',
        dailyLimit: 20,
        weeklyLimit: 100,
        qualityBonusEarned: 0,
        updatedAt: expect.any(Date)
      }),
      update: expect.objectContaining({
        userId: 'u2',
        quotaType: 'COMMENT',
        updatedAt: expect.any(Date)
      })
    });
    expect(saved).toBeInstanceOf(EngagementQuota);
    expect(saved.userId).toBe('u2');
  });
});
