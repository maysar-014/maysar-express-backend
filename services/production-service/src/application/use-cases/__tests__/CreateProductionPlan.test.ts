import { CreateProductionPlan } from '../CreateProductionPlan';

const mockRepository = { save: jest.fn() } as any;
const mockEngine = { validatePlan: jest.fn() } as any;

describe('CreateProductionPlan', () => {
    let useCase: CreateProductionPlan;

    beforeEach(() => {
        jest.clearAllMocks();
        useCase = new CreateProductionPlan(mockRepository, mockEngine);
    });

    it('should create production plan', async () => {
        mockEngine.validatePlan.mockReturnValue(true);
        mockRepository.save.mockResolvedValue({
            id: 'plan1',
            supplierId: 's1',
            name: 'Test',
            targetQuantity: 100,
            actualQuantity: 0,
            status: 'DRAFT',
            priority: 'MEDIUM',
            version: 1,
            schedule: {
                startTime: new Date('2024-01-01T00:00:00.000Z'),
                endTime: new Date('2024-12-31T00:00:00.000Z')
            },
            createdAt: new Date(),
            updatedAt: new Date()
        });
        const result = await useCase.execute({ supplierId: 's1', name: 'Test Plan', targetQuantity: 100, startDate: '2024-01-01', endDate: '2024-12-31' });
        expect(result.id).toBe('plan1');
    });
});
