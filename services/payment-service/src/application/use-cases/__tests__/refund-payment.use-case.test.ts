import { RefundPaymentUseCase, RefundPaymentDTO } from '../refund-payment.use-case';
import { RefundStatus, RefundReason } from '../../../domain/entities/refund.entity';
import { PaymentStatus } from '../../../domain/entities/payment.entity';

describe('RefundPaymentUseCase', () => {
    let useCase: RefundPaymentUseCase;
    let mockPaymentRepository: any;
    let mockRefundRepository: any;
    let mockRefundPolicy: any;

    const mockPayment = {
        id: 'pay-1',
        orderId: 'order-1',
        userId: 'user-1',
        amount: 100,
        currency: 'USD',
        status: PaymentStatus.COMPLETED,
        refundedAmount: 0,
        createdAt: new Date(),
        recordRefund: jest.fn(),
    };

    const validDTO: RefundPaymentDTO = {
        paymentId: 'pay-1',
        amount: 50,
        reason: RefundReason.CUSTOMER_REQUEST,
        reasonDetails: 'Customer changed mind',
        requestedBy: 'admin-1',
    };

    beforeEach(() => {
        jest.clearAllMocks();

        mockPaymentRepository = {
            findById: jest.fn().mockResolvedValue(mockPayment),
            update: jest.fn(),
        };

        mockRefundRepository = {
            save: jest.fn(),
        };

        mockRefundPolicy = {
            canRefund: jest.fn().mockReturnValue({
                canRefund: true,
                refundableAmount: 100,
                reasons: [],
            }),
            calculateRefundAmount: jest.fn().mockReturnValue(100),
        };

        useCase = new RefundPaymentUseCase(
            mockPaymentRepository,
            mockRefundRepository,
            mockRefundPolicy
        );
    });

    it('should refund payment successfully', async () => {
        const result = await useCase.execute(validDTO);

        expect(result.success).toBe(true);
        expect(result.refundId).toBeDefined();
        expect(result.status).toBe(RefundStatus.PENDING);
        expect(result.refundAmount).toBe(50);
        expect(mockRefundRepository.save).toHaveBeenCalled();
        expect(mockPayment.recordRefund).toHaveBeenCalledWith(50);
    });

    it('should fail when payment not found', async () => {
        mockPaymentRepository.findById.mockResolvedValue(null);

        const result = await useCase.execute(validDTO);

        expect(result.success).toBe(false);
        expect(result.status).toBe(RefundStatus.FAILED);
        expect(result.message).toContain('not found');
    });

    it('should fail when refund not eligible', async () => {
        mockRefundPolicy.canRefund.mockReturnValue({
            canRefund: false,
            reasons: ['Payment already refunded', 'Refund window expired'],
        });

        const result = await useCase.execute(validDTO);

        expect(result.success).toBe(false);
        expect(result.message).toContain('already refunded');
    });

    it('should fail when refund amount exceeds maximum', async () => {
        mockRefundPolicy.canRefund.mockReturnValue({
            canRefund: true,
            refundableAmount: 30,
        });

        const result = await useCase.execute({ ...validDTO, amount: 50 });

        expect(result.success).toBe(false);
        expect(result.message).toContain('exceeds maximum');
    });

    it('should apply policy-calculated refund amount', async () => {
        mockRefundPolicy.calculateRefundAmount.mockReturnValue(40);

        const result = await useCase.execute({ ...validDTO, amount: 50 });

        expect(result.success).toBe(true);
        expect(result.refundAmount).toBe(40);
    });

    it('should handle partial refunds', async () => {
        const partialDTO = { ...validDTO, amount: 25 };

        const result = await useCase.execute(partialDTO);

        expect(result.success).toBe(true);
        expect(result.refundAmount).toBe(25);
        expect(mockPayment.recordRefund).toHaveBeenCalledWith(25);
    });

    it('should handle full refunds', async () => {
        const fullDTO = { ...validDTO, amount: 100 };

        const result = await useCase.execute(fullDTO);

        expect(result.success).toBe(true);
        expect(result.refundAmount).toBe(100);
    });
});
