import { ContributionScore } from '../domain/value-objects/contribution-score.value-object';

describe('ContributionScore', () => {
    it('should create a default contribution score', () => {
        const score = ContributionScore.create();
        expect(score.rawScore).toBe(0);
        expect(score.qualityMultiplier).toBe(1.0);
        expect(score.getTier()).toBe('BRONZE');
    });

    it('should add contribution points with multiplier', () => {
        const score = new ContributionScore({
            score: 100,
            answerAcceptanceRate: 0.5,
            peerUpvotes: 10,
            expertEndorsements: 2,
            lastContributionAt: new Date(),
            qualityMultiplier: 1.5
        });

        score.addContribution(100);
        expect(score.rawScore).toBe(250); // 100 + floor(100 * 1.5)
    });

    it('should apply decay after DECAY_DAYS', () => {
        const DECAY_DAYS = 90;
        const oldDate = new Date();
        oldDate.setDate(oldDate.getDate() - (DECAY_DAYS + 1));

        const score = new ContributionScore({
            score: 1000,
            answerAcceptanceRate: 0.8,
            peerUpvotes: 50,
            expertEndorsements: 5,
            lastContributionAt: oldDate,
            qualityMultiplier: 1.0
        });

        expect(score.score).toBeLessThan(1000);
        expect(score.score).toBe(900); // 10% decay
    });

    it('should transition through tiers correctly', () => {
        const score = ContributionScore.create();

        score.addContribution(500);
        expect(score.getTier()).toBe('SILVER');

        score.addContribution(1500);
        expect(score.getTier()).toBe('GOLD');

        score.addContribution(3000);
        expect(score.getTier()).toBe('PLATINUM');

        score.addContribution(5000);
        expect(score.getTier()).toBe('DIAMOND');
    });

    it('should update quality multiplier based on metrics', () => {
        const score = new ContributionScore({
            score: 100,
            answerAcceptanceRate: 1.0, // +0.5 multiplier
            peerUpvotes: 100, // +0.2 multiplier
            expertEndorsements: 20, // +0.3 multiplier
            lastContributionAt: new Date(),
            qualityMultiplier: 1.0
        });

        score.updateQualityMultiplier();
        expect(score.qualityMultiplier).toBe(2.0); // 1.0 + 0.5 + 0.2 + 0.3
    });

    it('should throw error for invalid points', () => {
        const score = ContributionScore.create();
        expect(() => score.addContribution(-10)).toThrow('Contribution points must be positive');
    });

    it('should throw error for invalid acceptance rate', () => {
        expect(() => new ContributionScore({
            score: 0,
            answerAcceptanceRate: 1.5,
            peerUpvotes: 0,
            expertEndorsements: 0,
            lastContributionAt: new Date(),
            qualityMultiplier: 1.0
        })).toThrow('Answer acceptance rate must be between 0 and 1');
    });
});
