export type QuotaType = 'POST' | 'COMMENT' | 'THREAD' | 'ARTICLE' | 'CHALLENGE';

export interface QuotaConfig {
    daily: number;
    weekly: number;
    qualityBonus: number;
}

export interface EngagementQuotaProps {
    userId: string;
    quotaType: QuotaType;
    dailyRemaining: number;
    weeklyRemaining: number;
    dailyLimit: number;
    weeklyLimit: number;
    dailyResetAt: Date;
    weeklyResetAt: Date;
    qualityBonusEarned: number;
}

export class EngagementQuota {
    private props: EngagementQuotaProps;

    constructor(props: EngagementQuotaProps) {
        this.props = props;
        this.validate();
    }

    private validate(): void {
        if (!this.props.userId) {
            throw new Error('Engagement quota must have a userId');
        }

        if (this.props.dailyLimit < 0) {
            throw new Error('Daily limit cannot be negative');
        }

        if (this.props.weeklyLimit < 0) {
            throw new Error('Weekly limit cannot be negative');
        }

        if (this.props.dailyRemaining < 0) {
            throw new Error('Daily remaining cannot be negative');
        }

        if (this.props.weeklyRemaining < 0) {
            throw new Error('Weekly remaining cannot be negative');
        }

        if (this.props.qualityBonusEarned < 0) {
            throw new Error('Quality bonus cannot be negative');
        }
    }

    // Getters
    get userId(): string {
        return this.props.userId;
    }

    get quotaType(): QuotaType {
        return this.props.quotaType;
    }

    get dailyRemaining(): number {
        this.checkAndResetDaily();
        return this.props.dailyRemaining + this.props.qualityBonusEarned;
    }

    get weeklyRemaining(): number {
        this.checkAndResetWeekly();
        return this.props.weeklyRemaining + this.props.qualityBonusEarned;
    }

    get dailyLimit(): number {
        return this.props.dailyLimit;
    }

    get weeklyLimit(): number {
        return this.props.weeklyLimit;
    }

    get dailyResetAt(): Date {
        return this.props.dailyResetAt;
    }

    get weeklyResetAt(): Date {
        return this.props.weeklyResetAt;
    }

    get qualityBonusEarned(): number {
        return this.props.qualityBonusEarned;
    }

    // Business methods
    private checkAndResetDaily(): void {
        if (new Date() >= this.props.dailyResetAt) {
            this.resetDaily();
        }
    }

    private checkAndResetWeekly(): void {
        if (new Date() >= this.props.weeklyResetAt) {
            this.resetWeekly();
        }
    }

    private resetDaily(): void {
        this.props.dailyRemaining = this.props.dailyLimit;

        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);
        this.props.dailyResetAt = tomorrow;
    }

    private resetWeekly(): void {
        this.props.weeklyRemaining = this.props.weeklyLimit;

        const nextWeek = new Date();
        nextWeek.setDate(nextWeek.getDate() + 7);
        nextWeek.setHours(0, 0, 0, 0);
        this.props.weeklyResetAt = nextWeek;
    }

    canPerformAction(): boolean {
        this.checkAndResetDaily();
        this.checkAndResetWeekly();

        const effectiveDailyRemaining = this.props.dailyRemaining + this.props.qualityBonusEarned;
        const effectiveWeeklyRemaining = this.props.weeklyRemaining + this.props.qualityBonusEarned;

        return effectiveDailyRemaining > 0 && effectiveWeeklyRemaining > 0;
    }

    consumeQuota(): void {
        if (!this.canPerformAction()) {
            throw new Error('Quota exceeded');
        }

        // First consume from quality bonus if available
        if (this.props.qualityBonusEarned > 0) {
            this.props.qualityBonusEarned -= 1;
        } else {
            this.props.dailyRemaining -= 1;
            this.props.weeklyRemaining -= 1;
        }

        this.validate();
    }

    awardQualityBonus(amount: number): void {
        if (amount <= 0) {
            throw new Error('Quality bonus must be positive');
        }

        this.props.qualityBonusEarned += amount;
    }

    updateLimits(dailyLimit: number, weeklyLimit: number): void {
        if (dailyLimit < 0 || weeklyLimit < 0) {
            throw new Error('Limits must be non-negative');
        }

        this.props.dailyLimit = dailyLimit;
        this.props.weeklyLimit = weeklyLimit;

        // Adjust remaining if new limits are lower
        this.props.dailyRemaining = Math.min(this.props.dailyRemaining, dailyLimit);
        this.props.weeklyRemaining = Math.min(this.props.weeklyRemaining, weeklyLimit);
    }

    getRemainingPercentage(): { daily: number; weekly: number } {
        this.checkAndResetDaily();
        this.checkAndResetWeekly();

        const dailyPercent = this.props.dailyLimit === 0
            ? 100
            : Math.floor((this.dailyRemaining / this.props.dailyLimit) * 100);

        const weeklyPercent = this.props.weeklyLimit === 0
            ? 100
            : Math.floor((this.weeklyRemaining / this.props.weeklyLimit) * 100);

        return {
            daily: dailyPercent,
            weekly: weeklyPercent,
        };
    }

    getTimeUntilReset(): { daily: number; weekly: number } {
        const now = new Date().getTime();

        return {
            daily: Math.max(0, this.props.dailyResetAt.getTime() - now),
            weekly: Math.max(0, this.props.weeklyResetAt.getTime() - now),
        };
    }

    toJSON(): EngagementQuotaProps {
        return { ...this.props };
    }

    static create(userId: string, quotaType: QuotaType, config: QuotaConfig): EngagementQuota {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);

        const nextWeek = new Date();
        nextWeek.setDate(nextWeek.getDate() + 7);
        nextWeek.setHours(0, 0, 0, 0);

        return new EngagementQuota({
            userId,
            quotaType,
            dailyRemaining: config.daily,
            weeklyRemaining: config.weekly,
            dailyLimit: config.daily,
            weeklyLimit: config.weekly,
            dailyResetAt: tomorrow,
            weeklyResetAt: nextWeek,
            qualityBonusEarned: 0,
        });
    }

    static getDefaultConfig(quotaType: QuotaType): QuotaConfig {
        const configs: Record<QuotaType, QuotaConfig> = {
            POST: { daily: 5, weekly: 20, qualityBonus: 2 },
            COMMENT: { daily: 20, weekly: 100, qualityBonus: 5 },
            THREAD: { daily: 3, weekly: 10, qualityBonus: 1 },
            ARTICLE: { daily: 1, weekly: 5, qualityBonus: 1 },
            CHALLENGE: { daily: 2, weekly: 7, qualityBonus: 1 },
        };

        return configs[quotaType];
    }
}
