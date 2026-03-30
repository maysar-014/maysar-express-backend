import { KnowledgeDiscoveryEngine } from '../knowledge-discovery-engine';

describe('KnowledgeDiscoveryEngine', () => {
    it('should discover content', () => {
        const result = KnowledgeDiscoveryEngine.discoverContent(
            { 
                userId: 'u1',
                businessGoals: [],
                learningObjectives: [],
                expertiseAreas: [], 
                industryExperience: [],
                recentInteractions: []
            }, 
            []
        );
        expect(Array.isArray(result)).toBe(true);
    });
});
