import { EnablerController } from '../enabler.controller';
import { Request, Response } from 'express';

const mockRegisterUseCase = { execute: jest.fn() } as any;
const mockApproveUseCase = { execute: jest.fn() } as any;

describe('EnablerController', () => {
    let controller: EnablerController;
    let req: Partial<Request>;
    let res: Partial<Response>;

    beforeEach(() => {
        jest.clearAllMocks();
        controller = new EnablerController(mockRegisterUseCase, mockApproveUseCase);
        req = { body: {}, params: {} };
        res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    });

    it('should register enabler', async () => {
        req.body = { userId: 'u1', type: 'courier' };
        mockRegisterUseCase.execute.mockResolvedValue({ id: 'e1' });
        await controller.register(req as Request, res as Response);
        expect(res.status).toHaveBeenCalledWith(201);
    });

    it('should approve enabler', async () => {
        req.params = { id: 'e1' };
        await controller.approve(req as Request, res as Response);
        expect(mockApproveUseCase.execute).toHaveBeenCalledWith('e1');
    });
});
