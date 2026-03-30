import { PlaceOrderUseCase, PlaceOrderRequest } from '../place-order.use-case';

describe('PlaceOrderUseCase', () => {
    let useCase: PlaceOrderUseCase;
    let mockRepository: any;
    let mockEventPublisher: any;
    let mockSagaOrchestrator: any;
    let mockCODEligibilityEngine: any;
    let mockCODCommitmentService: any;

    const validRequest: PlaceOrderRequest = {
        buyerId: 'buyer-1',
        sellerId: 'seller-1',
        items: [
            { productId: 'prod-1', quantity: 2, price: 50, weight: 1.5 },
            { productId: 'prod-2', quantity: 1, price: 100, weight: 2.0 },
        ],
        currency: 'TZS',
        paymentMethod: 'WALLET',
        deliveryAddress: {
            street: '123 Main St',
            city: 'Dar es Salaam',
            postalCode: '12345',
            country: 'Tanzania',
        },
    };

    beforeEach(() => {
        jest.clearAllMocks();

        mockRepository = { save: jest.fn() };
        mockEventPublisher = { publish: jest.fn() };
        mockSagaOrchestrator = { start: jest.fn() };
        mockCODEligibilityEngine = {
            checkBuyerEligibility: jest.fn().mockResolvedValue({ eligible: true }),
            checkSellerEligibility: jest.fn().mockResolvedValue({ eligible: true }),
            checkOrderEligibility: jest.fn().mockResolvedValue({ eligible: true }),
        };
        mockCODCommitmentService = {
            calculateCommitmentFee: jest.fn().mockReturnValue(10),
            secureCommitment: jest.fn().mockResolvedValue('hold-123'),
        };

        useCase = new PlaceOrderUseCase(
            mockRepository,
            mockEventPublisher,
            mockSagaOrchestrator,
            mockCODEligibilityEngine,
            mockCODCommitmentService
        );
    });

    it('should place order successfully with WALLET payment', async () => {
        const result = await useCase.execute(validRequest);

        expect(result).toBeDefined();
        expect(result.orderId).toBeDefined();
        expect(mockRepository.save).toHaveBeenCalled();
        expect(mockSagaOrchestrator.start).toHaveBeenCalled();
    });

    it('should place COD order when buyer eligible', async () => {
        const codRequest = { ...validRequest, paymentMethod: 'COD' as const };

        const result = await useCase.execute(codRequest);

        expect(result).toBeDefined();
        expect(mockCODEligibilityEngine.checkBuyerEligibility).toHaveBeenCalledWith('buyer-1');
        expect(mockCODCommitmentService.secureCommitment).toHaveBeenCalled();
    });

    it('should fail COD order when buyer ineligible', async () => {
        mockCODEligibilityEngine.checkBuyerEligibility.mockResolvedValue({
            eligible: false,
            reason: 'Too many failed COD orders',
        });

        const codRequest = { ...validRequest, paymentMethod: 'COD' as const };

        await expect(useCase.execute(codRequest)).rejects.toThrow('COD Ineligible');
    });

    it('should fail COD order when seller ineligible', async () => {
        mockCODEligibilityEngine.checkSellerEligibility.mockResolvedValue({
            eligible: false,
            reason: 'Seller not verified',
        });

        const codRequest = { ...validRequest, paymentMethod: 'COD' as const };

        await expect(useCase.execute(codRequest)).rejects.toThrow('COD Ineligible');
    });

    it('should fail COD order when order ineligible', async () => {
        mockCODEligibilityEngine.checkOrderEligibility.mockResolvedValue({
            eligible: false,
            reason: 'Order value too high',
        });

        const codRequest = { ...validRequest, paymentMethod: 'COD' as const };

        await expect(useCase.execute(codRequest)).rejects.toThrow('COD Ineligible');
    });

    it('should calculate total amount correctly', async () => {
        await useCase.execute(validRequest);

        expect(mockRepository.save).toHaveBeenCalledWith(
            expect.objectContaining({
                totalAmount: expect.objectContaining({ amount: 200, currency: 'TZS' })
            })
        );
    });

    it('should calculate total weight correctly', async () => {
        await useCase.execute(validRequest);

        expect(mockRepository.save).toHaveBeenCalledWith(
            expect.objectContaining({ totalWeight: 5.0 })
        );
    });

    it('should use default currency when not provided', async () => {
        const requestWithoutCurrency = { ...validRequest, currency: undefined };

        await useCase.execute(requestWithoutCurrency);

        expect(mockRepository.save).toHaveBeenCalledWith(
            expect.objectContaining({
                totalAmount: expect.objectContaining({ currency: 'TZS' })
            })
        );
    });

    it('should handle different payment methods', async () => {
        const methods = ['WALLET', 'CARD', 'MOBILE_PAYMENT'] as const;

        for (const paymentMethod of methods) {
            jest.clearAllMocks();
            await useCase.execute({ ...validRequest, paymentMethod });
            expect(mockRepository.save).toHaveBeenCalled();
        }
    });

    it('should start saga orchestrator', async () => {
        await useCase.execute(validRequest);

        expect(mockSagaOrchestrator.start).toHaveBeenCalledWith(
            expect.objectContaining({
                buyerId: 'buyer-1',
                sellerId: 'seller-1',
            })
        );
    });
});
