import { CalculateProductionCapacity } from '../CalculateProductionCapacity';

const mockEngine = { calculateCapacity: jest.fn() } as any;

describe('CalculateProductionCapacity', () => {
    let useCase: CalculateProductionCapacity;

    beforeEach(() => {
        jest.clearAllMocks();
        useCase = new CalculateProductionCapacity(mockEngine);
    });

    it('should calculate capacity', async () => {
        mockEngine.calculateCapacity.mockReturnValue({ available: 100, used: 60 });
        const result = await useCase.execute({ timeframe: 'daily' });
        expect(result.available).toBe(100);
    });
});
