import { CheckCODEligibilityUseCase, CheckCODEligibilityInput } from '../check-cod-eligibility.use-case';

describe('CheckCODEligibilityUseCase', () => {
    let useCase: CheckCODEligibilityUseCase;
    let mockEligibilityEngine: any;

    const validInput: CheckCODEligibilityInput = {
        buyerId: 'buyer-1',
        sellerId: 'seller-1',
        totalAmount: 50000,
        currency: 'TZS',
        deliveryAddress: { city: 'Dar es Salaam', country: 'Tanzania' },
        sellerAddress: { city: 'Arusha', country: 'Tanzania' },
        items: [{ productId: 'prod-1', quantity: 2, price: 25000 }],
    };

    beforeEach(() => {
        jest.clearAllMocks();

        mockEligibilityEngine = {
            checkBuyerEligibility: jest.fn().mockResolvedValue({ eligible: true }),
            checkSellerEligibility: jest.fn().mockResolvedValue({ eligible: true }),
            checkOrderEligibility: jest.fn().mockResolvedValue({ eligible: true }),
            calculateCommitmentFee: jest.fn().mockReturnValue(2500),
        };

        useCase = new CheckCODEligibilityUseCase(mockEligibilityEngine);
    });

    it('should return eligible when all checks pass', async () => {
        const result = await useCase.execute(validInput);

        expect(result.eligible).toBe(true);
        expect(result.commitmentFee).toBe(2500);
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

        expect(mockEligibilityEngine.calculateCommitmentFee).toHaveBeenCalledWith(50000);
    });

    it('should handle different order amounts', async () => {
        const amounts = [10000, 50000, 100000, 200000];

        for (const totalAmount of amounts) {
            jest.clearAllMocks();
            await useCase.execute({ ...validInput, totalAmount });
            expect(mockEligibilityEngine.calculateCommitmentFee).toHaveBeenCalledWith(totalAmount);
        }
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
