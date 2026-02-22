import { FeedEngine } from '../feed-engine';

describe('FeedEngine', () => {
    let engine: FeedEngine;

    beforeEach(() => {
        engine = new FeedEngine();
    });

    it('should generate feed', () => {
        const start = performance.now();
        const feed = engine.generateFeed({ userId: 'u1', limit: 20 });
        const duration = performance.now() - start;
        
        expect(feed).toBeDefined();
        expect(duration).toBeLessThan(10);
    });
});
