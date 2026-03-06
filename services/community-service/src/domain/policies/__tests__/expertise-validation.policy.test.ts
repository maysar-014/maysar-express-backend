import { ExpertiseValidationPolicy } from '../expertise-validation.policy';
import { ExpertiseLevel } from '../../value-objects/expertise-badge.value-object';
import { ReputationTier } from '../../engines/reputation-engine';

describe('ExpertiseValidationPolicy', () => {
    it('should validate beginner expertise', () => {
        const result = ExpertiseValidationPolicy.canEarnBadge(ExpertiseLevel.BEGINNER, { 
            peerEndorsements: 0, 
            trainingCompletions: 0, 
            businessVerified: false, 
            contributionScore: 0, 
            reputationTier: ReputationTier.NEWCOMER 
        });
        expect(result.eligible).toBe(true);
    });

    it('should reject expert level without requirements', () => {
        const result = ExpertiseValidationPolicy.canEarnBadge(ExpertiseLevel.EXPERT, { 
            peerEndorsements: 0, 
            trainingCompletions: 0, 
            businessVerified: false, 
            contributionScore: 0, 
            reputationTier: ReputationTier.NEWCOMER 
        });
        expect(result.eligible).toBe(false);
    });
});
