import { PaymentController } from '../payment.controller';
import { Request, Response } from 'express';

const mockProcessUseCase = { execute: jest.fn() } as any;
const mockRefundUseCase = { execute: jest.fn() } as any;
const mockStatusUseCase = { execute: jest.fn() } as any;

describe('PaymentController', () => {
    let controller: PaymentController;
    let req: Partial<Request>;
    let res: Partial<Response>;

    beforeEach(() => {
        jest.clearAllMocks();
        controller = new PaymentController(mockProcessUseCase, mockRefundUseCase, mockStatusUseCase);
        req = { body: {}, params: {} };
        res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    });

    it('should process payment', async () => {
        req.body = { amount: 100, currency: 'USD' };
        mockProcessUseCase.execute.mockResolvedValue({ success: true, id: 'p1' });
        await controller.process(req as Request, res as Response);
        expect(res.status).toHaveBeenCalledWith(201);
    });

    it('should refund payment', async () => {
        req.params = { id: 'p1' };
        await controller.refund(req as Request, res as Response);
        expect(mockRefundUseCase.execute).toHaveBeenCalledWith('p1');
    });

    it('should get payment status', async () => {
        req.params = { id: 'p1' };
        mockStatusUseCase.execute.mockResolvedValue({ status: 'completed' });
        await controller.getStatus(req as Request, res as Response);
        expect(res.json).toHaveBeenCalled();
    });
});
