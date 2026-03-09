import { EngagementQuota } from './engagement-quota.value-object';

describe('EngagementQuota', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-01-01T10:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('creates defaults and exposes config helpers', () => {
    const config = EngagementQuota.getDefaultConfig('POST');
    const quota = EngagementQuota.create('user-1', 'POST', config);

    expect(config).toEqual({ daily: 5, weekly: 20, qualityBonus: 2 });
    expect(quota.userId).toBe('user-1');
    expect(quota.quotaType).toBe('POST');
    expect(quota.dailyLimit).toBe(5);
    expect(quota.weeklyLimit).toBe(20);
    expect(quota.dailyRemaining).toBe(5);
  });

  it('consumes quality bonus first then daily and weekly quota', () => {
    const quota = new EngagementQuota({
      userId: 'user-1',
      quotaType: 'COMMENT',
      dailyRemaining: 2,
      weeklyRemaining: 3,
      dailyLimit: 2,
      weeklyLimit: 3,
      dailyResetAt: new Date('2026-01-02T00:00:00.000Z'),
      weeklyResetAt: new Date('2026-01-08T00:00:00.000Z'),
      qualityBonusEarned: 1
    });

    quota.consumeQuota();
    expect(quota.qualityBonusEarned).toBe(0);
    expect(quota.dailyRemaining).toBe(2);

    quota.consumeQuota();
    expect(quota.dailyRemaining).toBe(1);
    expect(quota.weeklyRemaining).toBe(2);
  });

  it('resets daily and weekly remaining when reset times are reached', () => {
    const quota = new EngagementQuota({
      userId: 'user-1',
      quotaType: 'THREAD',
      dailyRemaining: 0,
      weeklyRemaining: 0,
      dailyLimit: 3,
      weeklyLimit: 10,
      dailyResetAt: new Date('2026-01-01T09:00:00.000Z'),
      weeklyResetAt: new Date('2026-01-01T09:00:00.000Z'),
      qualityBonusEarned: 0
    });

    expect(quota.canPerformAction()).toBe(true);
    expect(quota.dailyRemaining).toBe(3);
    expect(quota.weeklyRemaining).toBe(10);
  });

  it('validates updates and percentages', () => {
    const quota = EngagementQuota.create('user-1', 'ARTICLE', { daily: 4, weekly: 8, qualityBonus: 0 });
    quota.awardQualityBonus(2);
    quota.updateLimits(2, 6);

    expect(quota.dailyLimit).toBe(2);
    expect(quota.weeklyLimit).toBe(6);
    expect(quota.getRemainingPercentage().daily).toBeGreaterThanOrEqual(100);
    expect(quota.getTimeUntilReset().daily).toBeGreaterThan(0);
    expect(() => quota.awardQualityBonus(0)).toThrow('Quality bonus must be positive');
  });
});
