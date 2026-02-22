import { EngagementPolicy } from '../engagement-policy';

describe('EngagementPolicy', () => {
    let policy: EngagementPolicy;

    beforeEach(() => {
        policy = new EngagementPolicy();
    });

    it('should calculate engagement score', () => {
        const score = policy.calculateScore({ likes: 10, comments: 5, shares: 2 });
        expect(score).toBeGreaterThan(0);
    });

    it('should determine trending content', () => {
        const isTrending = policy.isTrending({ score: 100, timeframe: 'hour' });
        expect(isTrending).toBeDefined();
    });
});
