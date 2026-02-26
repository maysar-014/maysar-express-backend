import { CalculatePriceUseCase } from '../calculate-price.use-case';

const mockEngine = { calculate: jest.fn() } as any;

describe('CalculatePriceUseCase', () => {
    let useCase: CalculatePriceUseCase;

    beforeEach(() => {
        jest.clearAllMocks();
        useCase = new CalculatePriceUseCase(mockEngine);
    });

    it('should calculate price', async () => {
        mockEngine.calculate.mockReturnValue({ amount: 100, currency: 'USD' });
        const result = await useCase.execute({ productId: 'p1', quantity: 2 });
        expect(result.amount).toBe(100);
    });
});
