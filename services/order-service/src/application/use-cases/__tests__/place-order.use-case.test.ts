import { PlaceOrderUseCase, PlaceOrderRequest } from '../place-order.use-case';

describe('PlaceOrderUseCase', () => {
    let useCase: PlaceOrderUseCase;
    let mockRepository: any;
    let mockEventPublisher: any;
    let mockSagaOrchestrator: any;
    let mockCODEligibilityEngine: any;
    let mockCODCommitmentService: any;
    let mockWalletClient: any;

    const validRequest: PlaceOrderRequest = {
        buyerId: 'buyer-1',
        sellerId: 'seller-1',
        items: [
            { productId: 'prod-1', quantity: 1, price: 25000, weight: 1.5 },
            { productId: 'prod-2', quantity: 1, price: 25000, weight: 2.0 },
        ],
        currency: 'TZS',
        paymentMethod: 'WALLET',
        deliveryFee: 10,
        deliveryAddress: {
            street: '123 Main St',
            city: 'Dar es Salaam',
            postalCode: '12345',
            country: 'Tanzania',
        },
    };

    // The catalog lookup and verification audit sink are injected into
    // PlaceOrderUseCase. Left unstubbed, the use case built real repositories
    // mid-execution, which reached for an uninitialised database and threw
    // ("Database not initialized. Call initialize() first.") before any
    // assertion under test could run. That is why all 7 tests in this suite
    // failed regardless of what they asserted.
    let mockCatalogLookup: any;
    let mockVerificationAudit: any;
    let mockEnablerAuthorizationLookup: any;

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
        mockWalletClient = {
            debitWallet: jest.fn().mockResolvedValue('wallet-tx-123')
        };

        mockCatalogLookup = {
            findNonCodProductIds: jest.fn().mockResolvedValue([]),
            findSupplierLocations: jest.fn().mockResolvedValue(new Map()),
        };
        mockVerificationAudit = {
            append: jest.fn().mockResolvedValue(undefined),
        };
        mockEnablerAuthorizationLookup = {
            findByCode: jest.fn().mockResolvedValue({ id: 'enb_01', userId: 'enabler-1', status: 'ACTIVE' }),
            getAuthorizedProductIds: jest.fn().mockResolvedValue(['prod-1']),
        };
        useCase = new PlaceOrderUseCase(
            mockRepository,
            mockEventPublisher,
            mockSagaOrchestrator,
            mockCODEligibilityEngine,
            mockCODCommitmentService,
            mockWalletClient,
            // Positional placeholder: `paymentGatewayAdapter` is the 7th parameter
            // and this suite does not exercise it. Without it the two injected
            // collaborators would land in the wrong slots.
            undefined,
            mockCatalogLookup,
            mockVerificationAudit,
            mockEnablerAuthorizationLookup,
        );
    });

    it('should place order successfully with WALLET payment', async () => {
        const result = await useCase.execute(validRequest);

        expect(result).toBeDefined();
        expect(result.orderId).toBeDefined();
        expect(mockRepository.save).toHaveBeenCalled();
        // Fulfilment is NOT started here. Placement ends at
        // PENDING_SELLER_VERIFICATION / AWAIT_VERIFICATION: stock must be
        // confirmed by the seller before stock is reserved or payment taken.
        expect(result.nextAction).toBe('AWAIT_VERIFICATION');
        expect(mockSagaOrchestrator.start).not.toHaveBeenCalled();
    });

    it('persists product-scoped attribution only for approved lines in a mixed seller order', async () => {
        await useCase.execute({
            ...validRequest,
            enablerId: 'enb_01',
            enablerCode: 'ENB-123456',
            enablerProductIds: ['prod-1', 'prod-2'],
        });

        expect(mockEnablerAuthorizationLookup.getAuthorizedProductIds).toHaveBeenCalledWith('enb_01', ['prod-1', 'prod-2']);
        const savedOrder = mockRepository.save.mock.calls[0][0];
        expect(savedOrder.enablerId).toBeUndefined();
        expect(savedOrder.enablerAttributionEnablerId).toBe('enb_01');
        expect(savedOrder.enablerAttributionProductIds).toEqual(['prod-1']);
    });

    it('stores legacy order-level attribution only when all seller-order lines are approved', async () => {
        mockEnablerAuthorizationLookup.getAuthorizedProductIds.mockResolvedValue(['prod-1', 'prod-2']);

        await useCase.execute({
            ...validRequest,
            enablerId: 'enb_01',
            enablerCode: 'ENB-123456',
            enablerProductIds: ['prod-1', 'prod-2'],
        });

        const savedOrder = mockRepository.save.mock.calls[0][0];
        expect(savedOrder.enablerId).toBe('enb_01');
        expect(savedOrder.enablerCode).toBe('ENB-123456');
        expect(savedOrder.enablerAttributionProductIds).toEqual(['prod-1', 'prod-2']);
    });

    it('defers the COD commitment to checkout rather than taking it at placement', async () => {
        const codRequest = { ...validRequest, paymentMethod: 'COD' as const };

        const result = await useCase.execute(codRequest);

        expect(result).toBeDefined();
        // Buyer eligibility IS enforced at placement - it is a risk control.
        expect(mockCODEligibilityEngine.checkBuyerEligibility).toHaveBeenCalledWith('buyer-1');
        // The commitment fee/hold is NOT taken here. `PlaceOrderUseCase` returns
        // `commitmentFee: 0` and defers it to `BuyerConfirmCheckoutUseCase`, which
        // is the component that actually calls calculateCommitmentFee and
        // secureCommitment. Taking it in both places would double-hold the buyer.
        expect(mockCODCommitmentService.calculateCommitmentFee).not.toHaveBeenCalled();
        expect(mockCODCommitmentService.secureCommitment).not.toHaveBeenCalled();
        expect(result.commitmentFee).toBe(0);
    });

    it('should allow COD order when delivery fee is missing', async () => {
        const codRequest = { ...validRequest, paymentMethod: 'COD' as const, deliveryFee: undefined };

        const result = await useCase.execute(codRequest);

        expect(result).toBeDefined();
        expect(result.cashOnDeliveryAmount).toBeLessThan(50000);
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

    it('should reject orders below the global minimum basket value', async () => {
        const smallRequest = {
            ...validRequest,
            items: [{ productId: 'prod-1', quantity: 1, price: 1000, weight: 1.5 }]
        };

        await expect(useCase.execute(smallRequest)).rejects.toThrow('Minimum basket value');
        expect(mockRepository.save).not.toHaveBeenCalled();
    });

    it('should calculate total amount correctly', async () => {
        await useCase.execute(validRequest);

        expect(mockRepository.save).toHaveBeenCalledWith(
            expect.objectContaining({
                totalAmount: expect.objectContaining({ amount: 50000, currency: 'TZS' })
            })
        );
    });

    it('should calculate total weight correctly', async () => {
        await useCase.execute(validRequest);

        expect(mockRepository.save).toHaveBeenCalledWith(
            expect.objectContaining({ totalWeight: 3.5 })
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

    it('does not start the fulfilment saga before the seller confirms stock', async () => {
        // This replaces an assertion that the use case DOES call
        // `sagaOrchestrator.start`. It does not - and must not, because placement
        // ends at PENDING_SELLER_VERIFICATION. Starting stock reservation or
        // payment here would act on an order the seller has not yet accepted.
        //
        // Note for follow-up: `sagaOrchestrator` and `codCommitmentService` are
        // constructor parameters that PlaceOrderUseCase never uses. They are not
        // dead by accident - both were deliberately moved to
        // BuyerConfirmCheckoutUseCase - but leaving unused dependencies on the
        // signature invites the next reader to reintroduce the double-charge
        // these tests now guard against. See the backlog.
        await useCase.execute(validRequest);

        expect(mockSagaOrchestrator.start).not.toHaveBeenCalled();
    });

    it('publishes the seller-verification event that gates fulfilment', async () => {
        await useCase.execute(validRequest);

        // The event the rest of the system waits on before reserving stock.
        expect(mockEventPublisher.publish).toHaveBeenCalledWith(
            expect.objectContaining({
                type: 'order.pending_seller_verification',
                orderId: expect.any(String),
                sellerId: 'seller-1',
                buyerId: 'buyer-1',
            })
        );
    });
});
