import { Request, Response, NextFunction } from 'express';
import { EngagementQuota, QuotaType } from '../../domain/value-objects/engagement-quota.value-object';
import { ReputationTier } from '../../domain/entities/business-profile.entity';
import { EngagementPolicy } from '../../domain/policies/engagement-policy';

export interface QuotaRepository {
    findByUserAndType(userId: string, quotaType: QuotaType): Promise<EngagementQuota | null>;
    save(quota: EngagementQuota): Promise<EngagementQuota>;
}

export interface ProfileRepository {
    findByUserId(userId: string): Promise<{
        reputationTier: ReputationTier;
    } | null>;
}

export class QuotaEnforcementMiddleware {
    constructor(
        private readonly quotaRepository: QuotaRepository,
        private readonly profileRepository: ProfileRepository
    ) { }

    /**
     * Middleware to enforce engagement quotas
     */
    enforce(quotaType: QuotaType) {
        return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
            try {
                const userId = (req as any).user?.id;
                if (!userId) {
                    res.status(401).json({ error: 'Unauthorized' });
                    return;
                }

                // Get user's profile for reputation tier
                const profile = await this.profileRepository.findByUserId(userId);
                if (!profile) {
                    res.status(404).json({ error: 'User profile not found' });
                    return;
                }

                // Get or create quota
                let quota = await this.quotaRepository.findByUserAndType(userId, quotaType);
                if (!quota) {
                    const config = EngagementQuota.getDefaultConfig(quotaType);
                    const dailyLimit = EngagementPolicy.getDailyLimitForTier(profile.reputationTier, quotaType);
                    const weeklyLimit = dailyLimit * EngagementPolicy.getWeeklyLimitMultiplier(profile.reputationTier);

                    quota = EngagementQuota.create(userId, quotaType, {
                        daily: dailyLimit,
                        weekly: weeklyLimit,
                        qualityBonus: config.qualityBonus,
                    });
                }

                // Check if user can create content
                const check = EngagementPolicy.canCreateContent(quota, profile.reputationTier);
                if (!check.allowed) {
                    res.status(429).json({
                        error: 'Quota exceeded',
                        message: check.reason,
                        resetDaily: quota.dailyResetAt,
                        resetWeekly: quota.weeklyResetAt,
                    });
                    return;
                }

                // Attach quota to request for controller to consume after successful creation
                (req as any).quota = quota;

                next();
            } catch (error) {
                next(error);
            }
        };
    }

    /**
     * Middleware to check if cooling period is active
     */
    checkCoolingPeriod(quotaType: QuotaType) {
        return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
            try {
                const userId = (req as any).user?.id;
                if (!userId) {
                    res.status(401).json({ error: 'Unauthorized' });
                    return;
                }

                const profile = await this.profileRepository.findByUserId(userId);
                if (!profile) {
                    res.status(404).json({ error: 'User profile not found' });
                    return;
                }

                // Check cooling period (would need to track last action time - simplified here)
                const coolingPeriod = EngagementPolicy.getCoolingPeriodMinutes(profile.reputationTier, quotaType);

                // In production, check against last action timestamp
                // For now, just pass through
                next();
            } catch (error) {
                next(error);
            }
        };
    }
}
