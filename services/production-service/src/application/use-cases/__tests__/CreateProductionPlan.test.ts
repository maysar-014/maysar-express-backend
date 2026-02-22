import { CreateProductionPlan } from '../CreateProductionPlan';

const mockRepository = { create: jest.fn() } as any;
const mockEngine = { createPlan: jest.fn() } as any;

describe('CreateProductionPlan', () => {
    let useCase: CreateProductionPlan;

    beforeEach(() => {
        jest.clearAllMocks();
        useCase = new CreateProductionPlan(mockRepository, mockEngine);
    });

    it('should create production plan', async () => {
        mockEngine.createPlan.mockReturnValue({ id: 'plan1', steps: [] });
        const result = await useCase.execute({ orderId: 'o1', quantity: 100 });
        expect(result.id).toBe('plan1');
    });
});
