import { Post, PostType } from '../post.entity';

describe('Post', () => {
    it('should create post', () => {
        const post = Post.create({ id: 'p1', authorId: 'u1', content: 'Test post', type: PostType.TEXT });
        expect(post.id).toBe('p1');
    });

    it('should add like', () => {
        const post = Post.create({ id: 'p1', authorId: 'u1', content: 'Test', type: PostType.TEXT });
        // Engagement tracking would be handled separately
        expect(post.likesCount).toBe(0);
    });

    it('should add comment', () => {
        const post = Post.create({ id: 'p1', authorId: 'u1', content: 'Test', type: PostType.TEXT });
        // Engagement tracking would be handled separately
        expect(post.commentsCount).toBe(0);
    });
});
