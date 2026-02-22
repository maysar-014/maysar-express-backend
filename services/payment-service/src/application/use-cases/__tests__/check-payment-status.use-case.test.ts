import { CheckPaymentStatusUseCase, CheckPaymentStatusDTO } from '../check-payment-status.use-case';
import { PaymentStatus, PaymentProvider } from '../../../domain/entities/payment.entity';

describe('CheckPaymentStatusUseCase', () => {
    let useCase: CheckPaymentStatusUseCase;
    let mockRepository: any;
    let mockProviderFactory: any;
    let mockProvider: any;

    const mockPayment = {
        id: 'pay-1',
        orderId: 'order-1',
        userId: 'user-1',
        amount: 100,
        currency: 'USD',
        status: PaymentStatus.PROCESSING,
        provider: PaymentProvider.PESAPAL,
        metadata: { providerReference: 'prov-ref-123' },
        completedAt: undefined,
        failureReason: undefined,
        updatedAt: new Date(),
        markAsCompleted: jest.fn(),
        markAsFailed: jest.fn(),
    };

    beforeEach(() => {
        jest.clearAllMocks();

        mockRepository = {
            findById: jest.fn(),
            findByProviderReference: jest.fn(),
            findByOrderId: jest.fn(),
            update: jest.fn(),
        };

        mockProvider = {
            checkPaymentStatus: jest.fn(),
        };

        mockProviderFactory = jest.fn().mockReturnValue(mockProvider);

        useCase = new CheckPaymentStatusUseCase(mockRepository, mockProviderFactory);
    });

    it('should return payment status by payment ID', async () => {
        mockRepository.findById.mockResolvedValue(mockPayment);
        mockProvider.checkPaymentStatus.mockResolvedValue({
            status: 'COMPLETED',
            providerReference: 'prov-ref-123',
        });

        const result = await useCase.execute({ paymentId: 'pay-1' });

        expect(result).toBeDefined();
        expect(result?.paymentId).toBe('pay-1');
        expect(mockRepository.findById).toHaveBeenCalledWith('pay-1');
    });

    it('should return payment status by provider reference', async () => {
        mockRepository.findByProviderReference.mockResolvedValue(mockPayment);
        mockProvider.checkPaymentStatus.mockResolvedValue({ status: 'PROCESSING' });

        const result = await useCase.execute({ providerReference: 'prov-ref-123' });

        expect(result).toBeDefined();
        expect(mockRepository.findByProviderReference).toHaveBeenCalledWith('prov-ref-123');
    });

    it('should return payment status by order ID', async () => {
        mockRepository.findByOrderId.mockResolvedValue(mockPayment);
        mockProvider.checkPaymentStatus.mockResolvedValue({ status: 'PROCESSING' });

        const result = await useCase.execute({ orderId: 'order-1' });

        expect(result).toBeDefined();
        expect(mockRepository.findByOrderId).toHaveBeenCalledWith('order-1');
    });

    it('should return null when payment not found', async () => {
        mockRepository.findById.mockResolvedValue(null);

        const result = await useCase.execute({ paymentId: 'invalid' });

        expect(result).toBeNull();
    });

    it('should return current status for completed payment without querying provider', async () => {
        const completedPayment = { ...mockPayment, status: PaymentStatus.COMPLETED };
        mockRepository.findById.mockResolvedValue(completedPayment);

        const result = await useCase.execute({ paymentId: 'pay-1' });

        expect(result?.status).toBe(PaymentStatus.COMPLETED);
        expect(mockProvider.checkPaymentStatus).not.toHaveBeenCalled();
    });

    it('should update payment status when provider reports completion', async () => {
        mockRepository.findById.mockResolvedValue(mockPayment);
        mockProvider.checkPaymentStatus.mockResolvedValue({
            status: 'COMPLETED',
            providerReference: 'prov-ref-123',
        });

        await useCase.execute({ paymentId: 'pay-1' });

        expect(mockPayment.markAsCompleted).toHaveBeenCalled();
        expect(mockRepository.update).toHaveBeenCalled();
    });

    it('should update payment status when provider reports failure', async () => {
        mockRepository.findById.mockResolvedValue(mockPayment);
        mockProvider.checkPaymentStatus.mockResolvedValue({
            status: 'FAILED',
            failureReason: 'Insufficient funds',
        });

        await useCase.execute({ paymentId: 'pay-1' });

        expect(mockPayment.markAsFailed).toHaveBeenCalledWith('Insufficient funds');
        expect(mockRepository.update).toHaveBeenCalled();
    });

    it('should handle provider query failure gracefully', async () => {
        mockRepository.findById.mockResolvedValue(mockPayment);
        mockProvider.checkPaymentStatus.mockRejectedValue(new Error('Provider unavailable'));

        const result = await useCase.execute({ paymentId: 'pay-1' });

        expect(result).toBeDefined();
        expect(result?.status).toBe(PaymentStatus.PROCESSING);
    });

    it('should return current status when no provider reference exists', async () => {
        const paymentWithoutRef = { ...mockPayment, metadata: {} };
        mockRepository.findById.mockResolvedValue(paymentWithoutRef);

        const result = await useCase.execute({ paymentId: 'pay-1' });

        expect(result).toBeDefined();
        expect(mockProvider.checkPaymentStatus).not.toHaveBeenCalled();
    });
});
