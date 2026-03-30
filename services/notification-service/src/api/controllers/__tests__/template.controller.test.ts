import { TemplateController } from '../template.controller';
import { Request, Response } from 'express';

const mockCreateUseCase = { execute: jest.fn() } as any;
const mockRepository = { findById: jest.fn(), update: jest.fn(), delete: jest.fn() } as any;

describe('TemplateController', () => {
    let controller: TemplateController;
    let req: Partial<Request>;
    let res: Partial<Response>;

    beforeEach(() => {
        jest.clearAllMocks();
        controller = new TemplateController(mockCreateUseCase, mockRepository);
        req = {
            body: {},
            params: {},
            headers: {},
            user: { userId: 'user-123' }
        } as Partial<Request> & { user?: { userId: string } };
        res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    });

    it('should create template', async () => {
        req.body = { name: 'Welcome', type: 'email', channel: 'email', subject: 'Welcome!', bodyTemplate: 'Hello' };
        mockCreateUseCase.execute.mockResolvedValue({ id: 't1' });

        await controller.createTemplate(req as Request, res as Response);

        expect(res.status).toHaveBeenCalledWith(201);
        expect(mockCreateUseCase.execute).toHaveBeenCalledWith(expect.objectContaining({
            createdBy: 'user-123',
            name: 'Welcome',
            type: 'email',
            channel: 'email'
        }));
    });
});
