import { ExpertiseValidationPolicy } from '../expertise-validation.policy';
import { ReputationTier } from '../../entities/business-profile.entity';

describe('ExpertiseValidationPolicy', () => {
    it('should validate beginner expertise', () => {
        const result = ExpertiseValidationPolicy.canEarnBadge('BEGINNER', { 
            peerEndorsements: 0, 
            trainingCompletions: 0, 
            businessVerified: false, 
            contributionScore: 0, 
            reputationTier: ReputationTier.NEWCOMER 
        });
        expect(result.eligible).toBe(true);
    });

    it('should reject expert level without requirements', () => {
        const result = ExpertiseValidationPolicy.canEarnBadge('EXPERT', { 
            peerEndorsements: 0, 
            trainingCompletions: 0, 
            businessVerified: false, 
            contributionScore: 0, 
            reputationTier: ReputationTier.NEWCOMER 
        });
        expect(result.eligible).toBe(false);
    });
});
