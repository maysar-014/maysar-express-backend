import { KnowledgeDiscoveryEngine } from '../knowledge-discovery-engine';

describe('KnowledgeDiscoveryEngine', () => {
    let engine: KnowledgeDiscoveryEngine;

    beforeEach(() => {
        engine = new KnowledgeDiscoveryEngine();
    });

    it('should discover knowledge', () => {
        const start = performance.now();
        const results = engine.discover({ query: 'farming', limit: 10 });
        const duration = performance.now() - start;
        
        expect(results).toBeDefined();
        expect(duration).toBeLessThan(10);
    });
});
