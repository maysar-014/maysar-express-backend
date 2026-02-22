import { ReputationEngine } from '../reputation-engine';

describe('ReputationEngine', () => {
    let engine: ReputationEngine;

    beforeEach(() => {
        engine = new ReputationEngine();
    });

    it('should calculate reputation', () => {
        const start = performance.now();
        const score = engine.calculateReputation({ posts: 10, likes: 50, comments: 20 });
        const duration = performance.now() - start;
        
        expect(score).toBeGreaterThan(0);
        expect(duration).toBeLessThan(10);
    });
});
