import { CheckCODEligibilityUseCase, CheckCODEligibilityInput } from '../check-cod-eligibility.use-case';

describe('CheckCODEligibilityUseCase', () => {
    let useCase: CheckCODEligibilityUseCase;
    let mockEligibilityEngine: any;
    let mockProductCodLookup: any;

    const validInput: CheckCODEligibilityInput = {
        buyerId: 'buyer-1',
        sellerId: 'seller-1',
        totalAmount: 50000,
        deliveryFee: 12000,
        currency: 'TZS',
        deliveryAddress: {
            street: '123 Market Street',
            city: 'Dar es Salaam',
            postalCode: '11101',
            country: 'Tanzania',
        },
        sellerAddress: {
            street: '45 Soko Road',
            city: 'Arusha',
            postalCode: '23100',
            country: 'Tanzania',
        },
        items: [{ productId: 'prod-1', quantity: 2, price: 25000 }],
    };

    beforeEach(() => {
        jest.clearAllMocks();

        mockEligibilityEngine = {
            checkBuyerEligibility: jest.fn().mockResolvedValue({ eligible: true }),
            checkSellerEligibility: jest.fn().mockResolvedValue({ eligible: true }),
            checkOrderEligibility: jest.fn().mockResolvedValue({ eligible: true }),
            calculateCommitmentFee: jest.fn().mockImplementation((fee: number) => fee),
        };

        // The product-level COD gate must be stubbed to allow COD. Unstubbed it
        // built a real CatalogProductRepository, could not reach the catalog,
        // failed closed, and returned before any eligibility check ran - so every
        // assertion in this suite passed vacuously.
        mockProductCodLookup = {
            findNonCodProductIds: jest.fn().mockResolvedValue([]),
        };
        useCase = new CheckCODEligibilityUseCase(mockEligibilityEngine, mockProductCodLookup);
    });

    it('should return eligible when all checks pass', async () => {
        const result = await useCase.execute(validInput);

        expect(result.eligible).toBe(true);
        expect(result.commitmentFee).toBe(12000);
    });

    it('should return ineligible when buyer check fails', async () => {
        mockEligibilityEngine.checkBuyerEligibility.mockResolvedValue({
            eligible: false,
            reason: 'Too many failed COD orders',
        });

        const result = await useCase.execute(validInput);

        expect(result.eligible).toBe(false);
        expect(result.reason).toBe('Too many failed COD orders');
    });

    it('should return ineligible when seller check fails', async () => {
        mockEligibilityEngine.checkSellerEligibility.mockResolvedValue({
            eligible: false,
            reason: 'Seller not verified',
        });

        const result = await useCase.execute(validInput);

        expect(result.eligible).toBe(false);
        expect(result.reason).toBe('Seller not verified');
    });

    it('should return ineligible when order check fails', async () => {
        mockEligibilityEngine.checkOrderEligibility.mockResolvedValue({
            eligible: false,
            reason: 'Order value exceeds COD limit',
        });

        const result = await useCase.execute(validInput);

        expect(result.eligible).toBe(false);
        expect(result.reason).toBe('Order value exceeds COD limit');
    });

    it('should check buyer eligibility first', async () => {
        await useCase.execute(validInput);

        expect(mockEligibilityEngine.checkBuyerEligibility).toHaveBeenCalledWith('buyer-1');
    });

    it('should not check seller if buyer ineligible', async () => {
        mockEligibilityEngine.checkBuyerEligibility.mockResolvedValue({ eligible: false, reason: 'Buyer blocked' });

        await useCase.execute(validInput);

        expect(mockEligibilityEngine.checkSellerEligibility).not.toHaveBeenCalled();
    });

    it('should not check order if seller ineligible', async () => {
        mockEligibilityEngine.checkSellerEligibility.mockResolvedValue({ eligible: false, reason: 'Seller blocked' });

        await useCase.execute(validInput);

        expect(mockEligibilityEngine.checkOrderEligibility).not.toHaveBeenCalled();
    });

    it('should calculate commitment fee for eligible orders', async () => {
        await useCase.execute(validInput);

        expect(mockEligibilityEngine.calculateCommitmentFee).toHaveBeenCalledWith(12000);
    });

    it('should keep commitment fee tied to the delivery fee even when order totals change', async () => {
        const amounts = [50000, 100000, 200000];

        for (const totalAmount of amounts) {
            jest.clearAllMocks();
            await useCase.execute({ ...validInput, totalAmount });
            expect(mockEligibilityEngine.calculateCommitmentFee).toHaveBeenCalledWith(12000);
        }
    });

    it('should reject baskets below the global minimum before engine checks', async () => {
        const result = await useCase.execute({ ...validInput, totalAmount: 49999 });

        expect(result.eligible).toBe(false);
        expect(result.reason).toContain('Minimum basket value');
        expect(mockEligibilityEngine.checkBuyerEligibility).not.toHaveBeenCalled();
    });

    it('should handle different currencies', async () => {
        const currencies = ['TZS', 'USD', 'KES'];

        for (const currency of currencies) {
            jest.clearAllMocks();
            await useCase.execute({ ...validInput, currency });
            expect(mockEligibilityEngine.checkBuyerEligibility).toHaveBeenCalled();
        }
    });
});


describe('CheckCODEligibilityUseCase - product-level COD gate', () => {
    // The product gate is a security control: a product whose catalog record does
    // not accept COD must not be payable on delivery, and the gate fails closed.
    // It had no coverage at all, because the repository it used was constructed
    // inline inside the use case and so was unreachable from a test. It is
    // injected now, which is what makes these cases possible.
    const gateInput: CheckCODEligibilityInput = {
        buyerId: 'buyer-1',
        sellerId: 'seller-1',
        totalAmount: 50000,
        deliveryFee: 12000,
        currency: 'TZS',
        deliveryAddress: { street: '123 Market Street', city: 'Dar es Salaam', postalCode: '11101', country: 'Tanzania' },
        sellerAddress: { street: '45 Soko Road', city: 'Arusha', postalCode: '23100', country: 'Tanzania' },
        items: [{ productId: 'prod-1', quantity: 2, price: 25000 }],
    };

    function makeGated(findNonCodProductIds: jest.Mock) {
        const engine: any = {
            checkBuyerEligibility: jest.fn().mockResolvedValue({ eligible: true }),
            checkSellerEligibility: jest.fn().mockResolvedValue({ eligible: true }),
            checkOrderEligibility: jest.fn().mockResolvedValue({ eligible: true }),
            calculateCommitmentFee: jest.fn().mockImplementation((fee: number) => fee),
        };
        return {
            engine,
            useCase: new CheckCODEligibilityUseCase(engine, { findNonCodProductIds }),
        };
    }

    it('refuses COD when a product does not accept it', async () => {
        const { useCase, engine } = makeGated(jest.fn().mockResolvedValue(['prod-1']));

        const result = await useCase.execute(gateInput);

        expect(result.eligible).toBe(false);
        expect(result.reason).toMatch(/do not support Cash on Delivery/i);
        // The gate must short-circuit before any eligibility engine call.
        expect(engine.checkBuyerEligibility).not.toHaveBeenCalled();
    });

    it('allows COD when every product accepts it', async () => {
        const { useCase, engine } = makeGated(jest.fn().mockResolvedValue([]));

        const result = await useCase.execute(gateInput);

        expect(result.eligible).toBe(true);
        expect(engine.checkBuyerEligibility).toHaveBeenCalledWith('buyer-1');
    });

    it('fails CLOSED when the catalog cannot be reached', async () => {
        const { useCase, engine } = makeGated(jest.fn().mockRejectedValue(new Error('catalog down')));

        const result = await useCase.execute(gateInput);

        expect(result.eligible).toBe(false);
        expect(result.reason).toMatch(/Unable to verify/i);
        expect(engine.checkBuyerEligibility).not.toHaveBeenCalled();
    });

    it('forwards every product id in the order to the catalog lookup', async () => {
        // The use case forwards ids as given; de-duplication belongs to the
        // repository layer (findNonCodProductIds applies a Set). Asserting
        // de-dup here would pin the wrong layer.
        const findNonCodProductIds = jest.fn().mockResolvedValue([]);
        const { useCase } = makeGated(findNonCodProductIds);

        await useCase.execute({
            ...gateInput,
            items: [
                { productId: 'prod-1', quantity: 1, price: 100 },
                { productId: 'prod-1', quantity: 2, price: 100 },
                { productId: 'prod-2', quantity: 1, price: 100 },
            ],
        });

        expect(findNonCodProductIds).toHaveBeenCalledWith(['prod-1', 'prod-1', 'prod-2']);
    });

    it('skips the catalog lookup entirely when the order has no items', async () => {
        const findNonCodProductIds = jest.fn().mockResolvedValue([]);
        const { useCase } = makeGated(findNonCodProductIds);

        const result = await useCase.execute({ ...gateInput, items: [] });

        expect(findNonCodProductIds).not.toHaveBeenCalled();
        expect(result.eligible).toBe(true);
    });
});