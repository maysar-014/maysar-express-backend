import { ReputationEngine } from '../reputation-engine';
import { ReputationTier } from '../../entities/business-profile.entity';

describe('ReputationEngine', () => {
    it('should calculate reputation', () => {
        const result = ReputationEngine.calculateReputation({ 
            contributionScore: 600, 
            expertiseBadges: 1, 
            peerEndorsements: 2, 
            helpfulAnswers: 5, 
            knowledgeShared: 3, 
            mentorshipHours: 0, 
            articlesPublished: 1, 
            challengesSolved: 1 
        });
        expect(result.score).toBeDefined();
        expect(result.tier).toBe(ReputationTier.CONTRIBUTOR);
    });
});
