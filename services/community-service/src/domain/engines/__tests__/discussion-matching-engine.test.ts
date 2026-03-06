import { DiscussionMatchingEngine } from '../discussion-matching-engine';
import { ExpertiseLevel } from '../../value-objects/expertise-badge.value-object';

describe('DiscussionMatchingEngine', () => {
    it('should match experts to thread', () => {
        const result = DiscussionMatchingEngine.matchExpertsToThread(
            { 
                topic: 'farming', 
                category: 'GENERAL', 
                expertiseLevel: ExpertiseLevel.BEGINNER, 
                industryTags: ['agriculture'] 
            }, 
            []
        );
        expect(Array.isArray(result)).toBe(true);
    });
});
