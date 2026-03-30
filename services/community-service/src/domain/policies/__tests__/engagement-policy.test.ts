import { EngagementPolicy } from '../engagement-policy';
import { ReputationTier } from '../../entities/business-profile.entity';

describe('EngagementPolicy', () => {
    it('should get daily limit for tier', () => {
        const limit = EngagementPolicy.getDailyLimitForTier(ReputationTier.CONTRIBUTOR, 'POST');
        expect(limit).toBeGreaterThan(0);
    });

    it('should check minimum quality score', () => {
        const result = EngagementPolicy.meetsMinimumQualityScore(70, ReputationTier.CONTRIBUTOR);
        expect(result).toBe(true);
    });
});
