import { PaymentAdminController } from '../payment-admin.controller';
import { Request, Response } from 'express';
import {
    Payment,
    PaymentStatus,
    PaymentMethod,
    PaymentProvider,
} from '../../../domain/entities/payment.entity';

const makePayment = (overrides: Record<string, unknown> = {}) =>
    new Payment({
        id: 'pay-1',
        orderId: 'ord-1',
        userId: 'usr-1',
        amount: 33000,
        currency: 'TZS',
        method: PaymentMethod.MPESA,
        provider: PaymentProvider.PAYMENT_GATEWAY,
        status: PaymentStatus.PROCESSING,
        metadata: {},
        createdAt: new Date('2026-09-01T10:00:00Z'),
        updatedAt: new Date('2026-09-01T10:00:00Z'),
        ...overrides,
    } as any);

describe('PaymentAdminController', () => {
    let controller: PaymentAdminController;
    let mockBlockUseCase: any;
    let mockFlagUseCase: any;
    let mockRepository: any;
    let req: Partial<Request>;
    let res: Partial<Response>;

    beforeEach(() => {
        jest.clearAllMocks();
        mockBlockUseCase = { execute: jest.fn().mockResolvedValue(undefined) };
        mockFlagUseCase = { execute: jest.fn().mockResolvedValue(undefined) };
        mockRepository = { findAll: jest.fn().mockResolvedValue([]) };
        controller = new PaymentAdminController(
            mockBlockUseCase,
            mockFlagUseCase,
            mockRepository
        );
        req = { headers: {}, params: {}, body: {}, query: {} };
        res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as any;
    });

    describe('listPayments', () => {
        it('should return admin payment summaries matching the frontend shape', async () => {
            mockRepository.findAll.mockResolvedValue([makePayment()]);

            await controller.listPayments(req as Request, res as Response);

            expect(mockRepository.findAll).toHaveBeenCalledWith(50, 0);
            expect(res.status).toHaveBeenCalledWith(200);
            const payload = (res.json as jest.Mock).mock.calls[0][0];
            expect(payload.success).toBe(true);
            expect(payload.data[0]).toMatchObject({
                id: 'pay-1',
                method: 'MPESA',
                status: 'PROCESSING',
                amount: 33000,
                currency: 'TZS',
            });
            expect(payload.meta).toEqual({ count: 1, limit: 50, offset: 0 });
        });

        it('should clamp limit to the maximum and forward the offset', async () => {
            req.query = { limit: '5000', offset: '25' } as never;

            await controller.listPayments(req as Request, res as Response);

            expect(mockRepository.findAll).toHaveBeenCalledWith(200, 25);
        });

        it('should map repository failures to 500', async () => {
            mockRepository.findAll.mockRejectedValue(new Error('db down'));

            await controller.listPayments(req as Request, res as Response);

            expect(res.status).toHaveBeenCalledWith(500);
        });
    });

    describe('blockPayment', () => {
        it('should block using the authenticated admin as actor', async () => {
            (req as any).user = { userId: 'usr-admin-1' };
            req.params = { id: 'pay-1' };
            req.body = { reason: 'Suspected fraud' };

            await controller.blockPayment(req as Request, res as Response);

            expect(mockBlockUseCase.execute).toHaveBeenCalledWith(expect.objectContaining({
                transactionId: 'pay-1',
                adminId: 'usr-admin-1',
                reason: 'Suspected fraud',
            }));
            expect(res.status).toHaveBeenCalledWith(200);
            expect((res.json as jest.Mock).mock.calls[0][0].success).toBe(true);
        });

        it('should fall back to service identity for system calls', async () => {
            (req as any).service = { serviceKey: 'svc-ops' };
            req.params = { id: 'pay-1' };
            req.body = { reason: 'Automated risk hold' };

            await controller.blockPayment(req as Request, res as Response);

            expect(mockBlockUseCase.execute).toHaveBeenCalledWith(expect.objectContaining({
                adminId: 'system:svc-ops',
            }));
        });

        it('should 404 when the payment does not exist', async () => {
            (req as any).user = { userId: 'usr-admin-1' };
            req.params = { id: 'pay-x' };
            mockBlockUseCase.execute.mockRejectedValue(
                new Error('Transaction pay-x not found')
            );

            await controller.blockPayment(req as Request, res as Response);

            expect(res.status).toHaveBeenCalledWith(404);
        });

        it('should 409 when the payment is already settled', async () => {
            (req as any).user = { userId: 'usr-admin-1' };
            req.params = { id: 'pay-1' };
            mockBlockUseCase.execute.mockRejectedValue(
                new Error('Cannot block a COMPLETED payment')
            );

            await controller.blockPayment(req as Request, res as Response);

            expect(res.status).toHaveBeenCalledWith(409);
            expect((res.json as jest.Mock).mock.calls[0][0].error.code).toBe('PAYMENT_NOT_BLOCKABLE');
        });
    });

    describe('flagPayment', () => {
        it('should flag with the supplied flag type', async () => {
            (req as any).user = { userId: 'usr-admin-1' };
            req.params = { id: 'pay-1' };
            req.body = { reason: 'Unusual pattern', flagType: 'FRAUD' };

            await controller.flagPayment(req as Request, res as Response);

            expect(mockFlagUseCase.execute).toHaveBeenCalledWith(expect.objectContaining({
                transactionId: 'pay-1',
                adminId: 'usr-admin-1',
                flagType: 'FRAUD',
                reason: 'Unusual pattern',
            }));
            expect(res.status).toHaveBeenCalledWith(200);
        });

        it('should 404 when the payment does not exist', async () => {
            (req as any).user = { userId: 'usr-admin-1' };
            req.params = { id: 'pay-x' };
            mockFlagUseCase.execute.mockRejectedValue(
                new Error('Transaction pay-x not found')
            );

            await controller.flagPayment(req as Request, res as Response);

            expect(res.status).toHaveBeenCalledWith(404);
        });

        it('should 401 when no actor can be resolved', async () => {
            req.params = { id: 'pay-1' };
            req.body = { reason: 'No identity supplied' };

            await controller.flagPayment(req as Request, res as Response);

            expect(res.status).toHaveBeenCalledWith(401);
            expect(mockFlagUseCase.execute).not.toHaveBeenCalled();
        });
    });
});