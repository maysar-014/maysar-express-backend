import { EngagementQuota, QuotaConfig } from '../domain/value-objects/engagement-quota.value-object';

describe('EngagementQuota', () => {
    const config: QuotaConfig = {
        daily: 5,
        weekly: 20,
        qualityBonus: 2
    };

    it('should create an engagement quota with default values', () => {
        const quota = EngagementQuota.create('user-1', 'POST', config);
        expect(quota.dailyRemaining).toBe(5);
        expect(quota.weeklyRemaining).toBe(20);
        expect(quota.canPerformAction()).toBe(true);
    });

    it('should consume quota correctly', () => {
        const quota = EngagementQuota.create('user-1', 'POST', config);
        quota.consumeQuota();
        expect(quota.dailyRemaining).toBe(4);
        expect(quota.weeklyRemaining).toBe(19);
    });

    it('should consume from quality bonus first', () => {
        const quota = EngagementQuota.create('user-1', 'POST', config);
        quota.awardQualityBonus(2);
        expect(quota.dailyRemaining).toBe(7); // 5 + 2

        quota.consumeQuota();
        expect(quota.qualityBonusEarned).toBe(1);
        expect(quota.dailyRemaining).toBe(6); // 5 + 1
        expect(quota.weeklyRemaining).toBe(21); // 20 + 1 (wait, weeklyRemaining getter also adds it)
    });

    it('should throw error when quota is exceeded', () => {
        const smallConfig: QuotaConfig = { daily: 1, weekly: 5, qualityBonus: 0 };
        const quota = EngagementQuota.create('user-1', 'POST', smallConfig);

        quota.consumeQuota();
        expect(quota.canPerformAction()).toBe(false);
        expect(() => quota.consumeQuota()).toThrow('Quota exceeded');
    });

    it('should reset daily quota when reset time passes', () => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);

        const pastDate = new Date();
        pastDate.setDate(pastDate.getDate() - 1);

        const quota = new EngagementQuota({
            userId: 'user-1',
            quotaType: 'POST',
            dailyRemaining: 0,
            weeklyRemaining: 10,
            dailyLimit: 5,
            weeklyLimit: 20,
            dailyResetAt: pastDate,
            weeklyResetAt: tomorrow,
            qualityBonusEarned: 0
        });

        expect(quota.dailyRemaining).toBe(5); // Should reset on access
    });

    it('should calculate remaining percentage correctly', () => {
        const quota = EngagementQuota.create('user-1', 'POST', config);
        quota.consumeQuota(); // 4/5 daily, 19/20 weekly

        const percentages = quota.getRemainingPercentage();
        expect(percentages.daily).toBe(80);
        expect(percentages.weekly).toBe(95);
    });

    it('should award quality bonus', () => {
        const quota = EngagementQuota.create('user-1', 'POST', config);
        quota.awardQualityBonus(5);
        expect(quota.qualityBonusEarned).toBe(5);
    });
});
