import { CommunityFactory } from './factories/community.factory';
import { PostType, PostStatus, PostVisibility } from '../domain/entities/post.entity';

describe('Post Entity', () => {
    it('should create a draft post', () => {
        const post = CommunityFactory.createPost({
            content: 'Hello World',
            type: PostType.TEXT
        });

        expect(post.status).toBe(PostStatus.DRAFT);
        expect(post.isPublished()).toBe(false);
    });

    it('should publish a draft post', () => {
        const post = CommunityFactory.createPost();
        post.publish();

        expect(post.status).toBe(PostStatus.PUBLISHED);
        expect(post.isPublished()).toBe(true);
        expect(post.publishedAt).toBeDefined();
    });

    it('should throw error when publishing non-draft post', () => {
        const post = CommunityFactory.createPost({ status: PostStatus.PUBLISHED });
        expect(() => post.publish()).toThrow('Only draft posts can be published');
    });

    it('should determine visibility correctly', () => {
        const authorId = 'author-1';
        const otherUser = 'user-2';

        const publicPost = CommunityFactory.createPost({
            authorId,
            status: PostStatus.PUBLISHED,
            visibility: PostVisibility.PUBLIC
        });
        const privatePost = CommunityFactory.createPost({
            authorId,
            status: PostStatus.PUBLISHED,
            visibility: PostVisibility.PRIVATE
        });

        expect(publicPost.isVisibleTo(otherUser, authorId, false)).toBe(true);
        expect(privatePost.isVisibleTo(otherUser, authorId, false)).toBe(false);
        expect(privatePost.isVisibleTo(authorId, authorId, false)).toBe(true);
    });

    it('should handle moderation', () => {
        const post = CommunityFactory.createPost();
        post.moderate('moderator-1', 'Offensive language');

        expect(post.moderatedBy).toBe('moderator-1');
        expect(post.moderationReason).toBe('Offensive language');
        expect(post.moderatedAt).toBeDefined();
    });

    it('should identify commercial and system posts', () => {
        const commercial = CommunityFactory.createPost({ type: PostType.PROMOTION });
        const system = CommunityFactory.createPost({ type: PostType.SYSTEM_NOTICE });

        expect(commercial.isCommercialPost()).toBe(true);
        expect(system.isSystemPost()).toBe(true);
        expect(commercial.requiresModeration()).toBe(true);
    });

    it('should handle deletion', () => {
        const post = CommunityFactory.createPost();
        post.delete();

        expect(post.status).toBe(PostStatus.DELETED);
        expect(() => post.updateContent('New content')).toThrow('Cannot update deleted posts');
    });
});
