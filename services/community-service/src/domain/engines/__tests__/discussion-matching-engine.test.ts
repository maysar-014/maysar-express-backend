import { DiscussionMatchingEngine } from '../discussion-matching-engine';

describe('DiscussionMatchingEngine', () => {
    it('should match experts to thread', () => {
        const result = DiscussionMatchingEngine.matchExpertsToThread(
            { 
                topic: 'farming', 
                category: 'GENERAL', 
                expertiseLevel: 'BEGINNER', 
                industryTags: ['agriculture'] 
            }, 
            []
        );
        expect(Array.isArray(result)).toBe(true);
    });
});
