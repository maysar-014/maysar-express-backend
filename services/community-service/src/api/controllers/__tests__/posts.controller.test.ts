import { PostsController } from '../posts.controller';
import { Request, Response } from 'express';

const mockCreateUseCase = { execute: jest.fn() } as any;
const mockGetUseCase = { execute: jest.fn() } as any;

describe('PostsController', () => {
    let controller: PostsController;
    let req: Partial<Request>;
    let res: Partial<Response>;

    beforeEach(() => {
        jest.clearAllMocks();
        controller = new PostsController(mockCreateUseCase, mockGetUseCase);
        req = { body: {}, params: {} };
        res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    });

    it('should create post', async () => {
        req.body = { authorId: 'u1', content: 'Test post' };
        mockCreateUseCase.execute.mockResolvedValue({ id: 'p1' });
        await controller.create(req as Request, res as Response);
        expect(res.status).toHaveBeenCalledWith(201);
    });

    it('should get posts', async () => {
        mockGetUseCase.execute.mockResolvedValue([{ id: 'p1' }]);
        await controller.list(req as Request, res as Response);
        expect(res.json).toHaveBeenCalled();
    });
});
