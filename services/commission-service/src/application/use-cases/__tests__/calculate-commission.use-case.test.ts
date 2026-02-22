import { CalculateCommissionUseCase } from '../calculate-commission.use-case';

const mockRepository = { save: jest.fn(), findByOrderId: jest.fn() } as any;
const mockRuleEngine = { calculate: jest.fn() } as any;

describe('CalculateCommissionUseCase', () => {
    let useCase: CalculateCommissionUseCase;

    beforeEach(() => {
        jest.clearAllMocks();
        useCase = new CalculateCommissionUseCase(mockRepository, mockRuleEngine);
    });

    it('should calculate commission successfully', async () => {
        mockRepository.findByOrderId.mockResolvedValue(null);
        mockRuleEngine.calculate.mockReturnValue({ amount: 10, rate: 0.1 });
        
        const result = await useCase.execute({ orderId: 'order-1', amount: 100 });
        expect(result.commission).toBe(10);
        expect(mockRepository.save).toHaveBeenCalled();
    });

    it('should fail if commission already calculated', async () => {
        mockRepository.findByOrderId.mockResolvedValue({ id: 'existing' });
        await expect(useCase.execute({ orderId: 'order-1', amount: 100 }))
            .rejects.toThrow('Commission already calculated');
    });

    it('should calculate different commission rates', async () => {
        const rates = [0.05, 0.1, 0.15, 0.2];
        for (const rate of rates) {
            jest.clearAllMocks();
            mockRepository.findByOrderId.mockResolvedValue(null);
            mockRuleEngine.calculate.mockReturnValue({ amount: 100 * rate, rate });
            const result = await useCase.execute({ orderId: 'order-1', amount: 100 });
            expect(result.commission).toBe(100 * rate);
        }
    });

    it('should handle zero commission', async () => {
        mockRepository.findByOrderId.mockResolvedValue(null);
        mockRuleEngine.calculate.mockReturnValue({ amount: 0, rate: 0 });
        const result = await useCase.execute({ orderId: 'order-1', amount: 100 });
        expect(result.commission).toBe(0);
    });

    it('should handle large amounts', async () => {
        mockRepository.findByOrderId.mockResolvedValue(null);
        mockRuleEngine.calculate.mockReturnValue({ amount: 10000, rate: 0.1 });
        const result = await useCase.execute({ orderId: 'order-1', amount: 100000 });
        expect(result.commission).toBe(10000);
    });

    it('should save commission to repository', async () => {
        mockRepository.findByOrderId.mockResolvedValue(null);
        mockRuleEngine.calculate.mockReturnValue({ amount: 10, rate: 0.1 });
        await useCase.execute({ orderId: 'order-1', amount: 100 });
        expect(mockRepository.save).toHaveBeenCalledWith(expect.objectContaining({ orderId: 'order-1' }));
    });
});
