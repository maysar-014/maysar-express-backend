import { DiscussionsController } from '../discussions.controller';
import { Request, Response } from 'express';

const mockCreateUseCase = { execute: jest.fn() } as any;
const mockGetUseCase = { execute: jest.fn() } as any;

describe('DiscussionsController', () => {
    let controller: DiscussionsController;
    let req: Partial<Request>;
    let res: Partial<Response>;

    beforeEach(() => {
        jest.clearAllMocks();
        controller = new DiscussionsController(mockCreateUseCase, mockGetUseCase);
        req = { body: {}, params: {} };
        res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    });

    it('should create discussion', async () => {
        req.body = { title: 'Test', authorId: 'u1' };
        mockCreateUseCase.execute.mockResolvedValue({ id: 't1' });
        await controller.create(req as Request, res as Response);
        expect(res.status).toHaveBeenCalledWith(201);
    });

    it('should get discussions', async () => {
        mockGetUseCase.execute.mockResolvedValue([{ id: 't1' }]);
        await controller.list(req as Request, res as Response);
        expect(res.json).toHaveBeenCalled();
    });
});
