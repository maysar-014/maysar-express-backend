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

    it('should get payment status for the owning payer', async () => {
        req.headers = { 'x-user-id': 'usr_buyer' } as never;
        req.params = { id: 'p1' };
        mockStatusUseCase.execute.mockResolvedValue({ status: 'completed', userId: 'usr_buyer' });
        await controller.checkStatus(req as Request, res as Response);
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalled();
    });

    it('should return the persisted payment for an order id', async () => {
        req.headers = { 'x-user-id': 'usr_buyer' } as never;
        req.params = { orderId: 'ORD-20300101-3C8B' };
        mockStatusUseCase.execute.mockResolvedValue({ status: 'completed', paymentId: 'p1', userId: 'usr_buyer' });

        await controller.getPaymentByOrderId(req as Request, res as Response);

        expect(mockStatusUseCase.execute).toHaveBeenCalledWith({ orderId: 'ORD-20300101-3C8B' });
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({
            success: true,
            data: { status: 'completed', paymentId: 'p1', userId: 'usr_buyer' }
        });
    });

    it('should return 404 when the order has no payment record', async () => {
        req.headers = { 'x-user-id': 'usr_buyer' } as never;
        req.params = { orderId: 'ORD-20300101-3C8B' };
        mockStatusUseCase.execute.mockResolvedValue(null);

        await controller.getPaymentByOrderId(req as Request, res as Response);

        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            success: false,
            error: expect.any(String),
            data: { orderId: 'ORD-20300101-3C8B' }
        }));
    });

    it('should return 500 when the order lookup fails', async () => {
        req.headers = { 'x-user-id': 'usr_buyer' } as never;
        req.params = { orderId: 'ORD-20300101-3C8B' };
        mockStatusUseCase.execute.mockRejectedValue(new Error('db down'));

        await controller.getPaymentByOrderId(req as Request, res as Response);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            success: false,
            message: 'db down'
        }));
    });

    describe('read authorization (DEF-012)', () => {
        it('should reject anonymous reads without touching the payment record', async () => {
            req.headers = {} as never;
            req.params = { id: 'p1' };

            await controller.getPayment(req as Request, res as Response);

            expect(mockStatusUseCase.execute).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: false,
                error: expect.objectContaining({ code: 'UNAUTHORIZED' })
            }));
        });

        it('should return 403 when another user reads a payment by id', async () => {
            req.headers = { 'x-user-id': 'usr_seller', 'x-user-roles': 'seller' } as never;
            req.params = { id: 'p1' };
            mockStatusUseCase.execute.mockResolvedValue({
                paymentId: 'p1',
                userId: 'usr_buyer',
                status: 'completed'
            });

            await controller.getPayment(req as Request, res as Response);

            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: false,
                error: expect.objectContaining({ code: 'FORBIDDEN' })
            }));
            expect(res.json).not.toHaveBeenCalledWith(expect.objectContaining({ success: true }));
        });

        it('should return 403 when another user polls the status of a payment', async () => {
            req.headers = { 'x-user-id': 'usr_enabler', 'x-user-roles': 'enabler' } as never;
            req.params = { id: 'p1' };
            mockStatusUseCase.execute.mockResolvedValue({ status: 'completed', userId: 'usr_buyer' });

            await controller.checkStatus(req as Request, res as Response);

            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.status).not.toHaveBeenCalledWith(200);
        });

        it('should return 403 when another user reads a payment by order id', async () => {
            req.headers = { 'x-user-id': 'usr_supplier', 'x-user-roles': 'supplier' } as never;
            req.params = { orderId: 'ORD-20300101-3C8B' };
            mockStatusUseCase.execute.mockResolvedValue({ paymentId: 'p1', userId: 'usr_buyer' });

            await controller.getPaymentByOrderId(req as Request, res as Response);

            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.status).not.toHaveBeenCalledWith(200);
        });

        it('should allow admin callers to read any payment', async () => {
            req.headers = { 'x-user-id': 'usr_admin', 'x-user-roles': 'admin' } as never;
            req.params = { id: 'p1' };
            mockStatusUseCase.execute.mockResolvedValue({ paymentId: 'p1', userId: 'usr_buyer' });

            await controller.getPayment(req as Request, res as Response);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: { paymentId: 'p1', userId: 'usr_buyer' }
            });
        });

        it('should allow an authenticated internal service to read any payment', async () => {
            (req as any).service = { serviceKey: 'order-service-key', serviceId: 'order-service' };
            req.headers = {} as never;
            req.params = { orderId: 'ORD-20300101-3C8B' };
            mockStatusUseCase.execute.mockResolvedValue({ paymentId: 'p1', userId: 'usr_buyer' });

            await controller.getPaymentByOrderId(req as Request, res as Response);

            expect(res.status).toHaveBeenCalledWith(200);
        });
    });

});
