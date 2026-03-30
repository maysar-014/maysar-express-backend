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
        controller = new PaymentController(mockProcessUseCase, mockStatusUseCase, mockRefundUseCase);
        req = { body: {}, params: {} };
        res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    });

    it('should create payment', async () => {
        req.body = { orderId: 'o1', userId: 'u1', amount: 100, currency: 'USD', method: 'CARD' };
        req.headers = {
            'x-device-fingerprint': 'fingerprint-1',
            'user-agent': 'jest'
        } as never;
        mockProcessUseCase.execute.mockResolvedValue({
            success: true,
            paymentId: 'p1',
            status: 'PENDING',
            redirectUrl: 'https://example.com/pay',
            providerReference: 'ref-1',
            message: 'ok'
        });
        await controller.createPayment(req as Request, res as Response);
        expect(res.status).toHaveBeenCalledWith(201);
    });

    it('should refund payment', async () => {
        req.headers = { 'x-user-id': 'u1' } as never;
        req.params = { id: 'p1' };
        req.body = { amount: 100, reason: 'customer request' };

        mockRefundUseCase.execute.mockResolvedValue({
            success: true,
            refundId: 'r1',
            status: 'PROCESSING',
            refundAmount: 100,
            message: 'refund initiated'
        });

        await controller.refundPayment(req as Request, res as Response);
        expect(mockRefundUseCase.execute).toHaveBeenCalledWith(expect.objectContaining({
            paymentId: 'p1',
            requestedBy: 'u1'
        }));
    });

    it('should get payment status', async () => {
        req.params = { id: 'p1' };
        mockStatusUseCase.execute.mockResolvedValue({ status: 'completed' });
        await controller.checkStatus(req as Request, res as Response);
        expect(res.json).toHaveBeenCalled();
    });
});
