import { DiscussionMatchingEngine } from '../discussion-matching-engine';

describe('DiscussionMatchingEngine', () => {
    let engine: DiscussionMatchingEngine;

    beforeEach(() => {
        engine = new DiscussionMatchingEngine();
    });

    it('should match discussions', () => {
        const start = performance.now();
        const matches = engine.match({ interests: ['farming'], location: 'Kenya' });
        const duration = performance.now() - start;
        
        expect(matches).toBeDefined();
        expect(duration).toBeLessThan(10);
    });
});
