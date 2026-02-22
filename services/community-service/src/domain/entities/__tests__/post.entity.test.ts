import { Post } from '../post.entity';

describe('Post', () => {
    it('should create post', () => {
        const post = Post.create({ id: 'p1', authorId: 'u1', content: 'Test post' });
        expect(post.getId()).toBe('p1');
    });

    it('should add like', () => {
        const post = Post.create({ id: 'p1', authorId: 'u1', content: 'Test' });
        post.addLike('u2');
        expect(post.getLikeCount()).toBe(1);
    });

    it('should add comment', () => {
        const post = Post.create({ id: 'p1', authorId: 'u1', content: 'Test' });
        post.addComment({ id: 'c1', authorId: 'u2', content: 'Comment' });
        expect(post.getCommentCount()).toBe(1);
    });
});
