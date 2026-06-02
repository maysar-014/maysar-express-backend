import { ProcessPaymentUseCase, ProcessPaymentDTO } from '../process-payment.use-case';
import { PaymentStatus, PaymentMethod, PaymentProvider } from '../../../domain/entities/payment.entity';

describe('ProcessPaymentUseCase', () => {
    let useCase: ProcessPaymentUseCase;
    let mockRepository: any;
    let mockProviderFactory: any;
    let mockProvider: any;
    let mockFraudEngine: any;
    let mockProcessingEngine: any;
    let mockLimitsPolicy: any;
    let mockFraudPolicy: any;

    const validDTO: ProcessPaymentDTO = {
        orderId: 'order-1',
        userId: 'user-1',
        amount: 100,
        currency: 'USD',
        method: PaymentMethod.CARD,
        customerInfo: {
            email: 'test@example.com',
            phoneNumber: '+1234567890',
            name: 'Test User',
            ipAddress: '192.168.1.1',
            deviceFingerprint: 'device-123',
        },
    };

    beforeEach(() => {
        jest.clearAllMocks();

        mockRepository = {
            save: jest.fn(),
            update: jest.fn(),
            getTotalAmountByUserId: jest.fn().mockResolvedValue(0),
            getPaymentCountByUserId: jest.fn().mockResolvedValue(0),
        };

        mockProvider = {
            processPayment: jest.fn().mockResolvedValue({
                success: true,
                status: 'PROCESSING',
                providerReference: 'prov-ref-123',
                providerTransactionId: 'tx-123',
            }),
        };

        mockProviderFactory = jest.fn().mockReturnValue(mockProvider);

        mockFraudEngine = {
            assessTransaction: jest.fn().mockResolvedValue({
                riskScore: 0.2,
                riskLevel: 'LOW',
                recommendation: 'APPROVE',
            }),
        };

        mockProcessingEngine = {
            validatePaymentRequest: jest.fn().mockReturnValue({ isValid: true, errors: [] }),
            selectPaymentProvider: jest.fn().mockReturnValue(PaymentProvider.PAYMENT_GATEWAY),
            calculateFees: jest.fn().mockReturnValue({ platformFee: 2, providerFee: 1, totalFee: 3 }),
        };

        mockLimitsPolicy = {
            isWithinLimits: jest.fn().mockReturnValue({ isWithinLimits: true, violations: [] }),
        };

        mockFraudPolicy = {
            getActionForRiskLevel: jest.fn().mockReturnValue({ autoDecline: false, requiresManualReview: false }),
        };

        useCase = new ProcessPaymentUseCase(
            mockRepository,
            mockProviderFactory,
            mockFraudEngine,
            mockProcessingEngine,
            mockLimitsPolicy,
            mockFraudPolicy
        );
    });

    it('should process payment successfully', async () => {
        const result = await useCase.execute(validDTO);

        expect(result.success).toBe(true);
        expect(result.status).toBe(PaymentStatus.PROCESSING);
        expect(result.paymentId).toBeDefined();
        expect(mockRepository.save).toHaveBeenCalled();
        expect(mockProvider.processPayment).toHaveBeenCalled();
    });

    it('should fail when validation fails', async () => {
        mockProcessingEngine.validatePaymentRequest.mockReturnValue({
            isValid: false,
            errors: ['Invalid amount'],
        });

        const result = await useCase.execute(validDTO);

        expect(result.success).toBe(false);
        expect(result.status).toBe(PaymentStatus.FAILED);
        expect(result.message).toContain('Invalid amount');
    });

    it('should fail when payment limits exceeded', async () => {
        mockLimitsPolicy.isWithinLimits.mockReturnValue({
            isWithinLimits: false,
            violations: ['Daily limit exceeded'],
        });

        const result = await useCase.execute(validDTO);

        expect(result.success).toBe(false);
        expect(result.message).toContain('Daily limit exceeded');
    });

    it('should decline payment when fraud detected', async () => {
        mockFraudEngine.assessTransaction.mockResolvedValue({
            riskScore: 0.9,
            riskLevel: 'HIGH',
            recommendation: 'DECLINE',
        });
        mockFraudPolicy.getActionForRiskLevel.mockReturnValue({
            autoDecline: true,
            reason: 'High fraud risk',
        });

        const result = await useCase.execute(validDTO);

        expect(result.success).toBe(false);
        expect(result.fraudAssessment?.riskLevel).toBe('HIGH');
    });

    it('should require manual review for medium risk', async () => {
        mockFraudEngine.assessTransaction.mockResolvedValue({
            riskScore: 0.5,
            riskLevel: 'MEDIUM',
            recommendation: 'REVIEW',
        });
        mockFraudPolicy.getActionForRiskLevel.mockReturnValue({
            requiresManualReview: true,
        });

        const result = await useCase.execute(validDTO);

        expect(result.success).toBe(false);
        expect(result.message).toContain('manual review');
    });

    it('should bypass fraud decline for contract-test payments outside production', async () => {
        const originalNodeEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = 'test';
        mockFraudEngine.assessTransaction.mockResolvedValue({
            riskScore: 0.95,
            riskLevel: 'CRITICAL',
            recommendation: 'DECLINE',
        });
        mockFraudPolicy.getActionForRiskLevel.mockReturnValue({
            autoDecline: true,
            requiresManualReview: true,
            reason: 'High fraud risk',
        });

        const result = await useCase.execute({
            ...validDTO,
            metadata: { contractTest: true },
        });

        expect(result.success).toBe(true);
        expect(mockProvider.processPayment).toHaveBeenCalled();
        expect(mockFraudEngine.assessTransaction).not.toHaveBeenCalled();
        expect(mockFraudPolicy.getActionForRiskLevel).not.toHaveBeenCalled();
        process.env.NODE_ENV = originalNodeEnv;
    });

    it('should handle provider failure', async () => {
        mockProvider.processPayment.mockResolvedValue({
            success: false,
            message: 'Provider error',
        });

        const result = await useCase.execute(validDTO);

        expect(result.success).toBe(false);
        expect(result.message).toContain('Provider error');
    });

    it('should handle provider exception', async () => {
        mockProvider.processPayment.mockRejectedValue(new Error('Network error'));

        const result = await useCase.execute(validDTO);

        expect(result.success).toBe(false);
        expect(mockRepository.update).toHaveBeenCalled();
    });

    it('should mark payment as completed for immediate completion', async () => {
        mockProvider.processPayment.mockResolvedValue({
            success: true,
            status: 'COMPLETED',
            providerReference: 'ref-123',
            providerTransactionId: 'tx-123',
        });

        const result = await useCase.execute(validDTO);

        expect(result.success).toBe(true);
        expect(mockRepository.update).toHaveBeenCalled();
    });
});

