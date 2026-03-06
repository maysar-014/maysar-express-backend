import { KnowledgeDiscoveryEngine } from '../knowledge-discovery-engine';

describe('KnowledgeDiscoveryEngine', () => {
    it('should discover content', () => {
        const result = KnowledgeDiscoveryEngine.discoverContent(
            { 
                interests: [], 
                expertiseAreas: [], 
                industryTags: [], 
                recentActivity: [] 
            }, 
            []
        );
        expect(Array.isArray(result)).toBe(true);
    });
});
