import { DiscussionThread, ThreadStatus, ExpertiseLevel } from '../discussion-thread.entity';

describe('DiscussionThread', () => {
    it('should create thread', () => {
        const thread = DiscussionThread.create({ 
            id: 't1', 
            authorId: 'u1', 
            topic: 'Test Topic', 
            content: 'This is a detailed discussion content that needs to be at least fifty characters long.',
            category: 'GENERAL',
            expertiseLevel: ExpertiseLevel.BEGINNER,
            businessContext: {
                industry: ['agriculture'],
                businessStage: 'startup',
                tags: ['farming']
            }
        });
        expect(thread.id).toBe('t1');
    });

    it('should resolve thread', () => {
        const thread = DiscussionThread.create({ 
            id: 't1', 
            authorId: 'u1', 
            topic: 'Test Topic', 
            content: 'This is a detailed discussion content that needs to be at least fifty characters long.',
            category: 'GENERAL',
            expertiseLevel: ExpertiseLevel.BEGINNER,
            businessContext: {
                industry: ['agriculture'],
                businessStage: 'startup',
                tags: ['farming']
            }
        });
        thread.resolve('a1');
        expect(thread.status).toBe(ThreadStatus.RESOLVED);
    });
});
