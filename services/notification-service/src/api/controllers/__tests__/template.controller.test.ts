import { TemplateController } from '../template.controller';
import { Request, Response } from 'express';

const mockCreateUseCase = { execute: jest.fn() } as any;
const mockUpdateUseCase = { execute: jest.fn() } as any;

describe('TemplateController', () => {
    let controller: TemplateController;
    let req: Partial<Request>;
    let res: Partial<Response>;

    beforeEach(() => {
        jest.clearAllMocks();
        controller = new TemplateController(mockCreateUseCase, mockUpdateUseCase);
        req = { body: {}, params: {} };
        res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    });

    it('should create template', async () => {
        req.body = { name: 'Welcome', type: 'email', subject: 'Welcome!', body: 'Hello' };
        mockCreateUseCase.execute.mockResolvedValue({ id: 't1' });

        await controller.create(req as Request, res as Response);

        expect(res.status).toHaveBeenCalledWith(201);
    });
});
