import { DiscussionThread } from '../discussion-thread.entity';

describe('DiscussionThread', () => {
    it('should create thread', () => {
        const thread = DiscussionThread.create({ id: 't1', title: 'Test', authorId: 'u1' });
        expect(thread.getId()).toBe('t1');
    });

    it('should add reply', () => {
        const thread = DiscussionThread.create({ id: 't1', title: 'Test', authorId: 'u1' });
        thread.addReply({ id: 'r1', authorId: 'u2', content: 'Reply' });
        expect(thread.getReplyCount()).toBe(1);
    });
});
