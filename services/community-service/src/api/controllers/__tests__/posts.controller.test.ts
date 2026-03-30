import { Request, Response } from 'express';
import { PostsController } from '../posts.controller';
import { FeedEngine } from '../../../domain/engines/feed-engine';
import { PostStatus, PostType } from '../../../domain/entities/post.entity';

const mockCreateUseCase = { execute: jest.fn() } as any;
const mockPostRepository = {
    save: jest.fn(),
    findById: jest.fn(),
    findByAuthorId: jest.fn(),
    findPublished: jest.fn(),
    searchPosts: jest.fn(),
    findRelatedPosts: jest.fn()
} as any;

describe('PostsController', () => {
    let controller: PostsController;
    let req: Partial<Request>;
    let res: Partial<Response>;

    beforeEach(() => {
        jest.clearAllMocks();
        controller = new PostsController(mockCreateUseCase, mockPostRepository, FeedEngine as any);
        req = { body: {}, params: {}, query: {}, headers: {} };
        res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    });

    it('should create post', async () => {
        req.body = { authorId: 'u1', content: 'Test post content', type: PostType.TEXT };
        mockCreateUseCase.execute.mockResolvedValue({
            postId: 'p1',
            status: PostStatus.PUBLISHED,
            requiresModeration: false,
            message: 'Post published successfully'
        });

        await controller.createPost(req as Request, res as Response);

        expect(res.status).toHaveBeenCalledWith(201);
        expect(mockCreateUseCase.execute).toHaveBeenCalledWith(expect.objectContaining({
            authorId: 'u1',
            content: 'Test post content',
            type: PostType.TEXT
        }));
    });

    it('should get published posts', async () => {
        mockPostRepository.findPublished.mockResolvedValue([]);

        await controller.getPublishedPosts(req as Request, res as Response);

        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            posts: [],
            pagination: expect.objectContaining({
                count: 0,
                limit: 50,
                offset: 0
            })
        }));
    });
});
