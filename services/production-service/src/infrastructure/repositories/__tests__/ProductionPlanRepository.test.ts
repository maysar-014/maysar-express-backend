import { ProductionPlanRepository } from '../ProductionPlanRepository';

const mockPrisma = {
    productionPlan: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn()
    }
} as any;

describe('ProductionPlanRepository', () => {
    let repository: ProductionPlanRepository;

    beforeEach(() => {
        jest.clearAllMocks();
        repository = new ProductionPlanRepository(mockPrisma);
    });

    it('should create plan', async () => {
        (mockPrisma.productionPlan.create as jest.Mock).mockResolvedValue({
            id: 'plan1',
            supplierId: 's1',
            name: 'Test Plan',
            status: 'DRAFT',
            priority: 'MEDIUM',
            startDate: new Date(),
            endDate: new Date(Date.now() + 60 * 60 * 1000),
            targetQuantity: 10,
            actualQuantity: 0,
            version: 1,
            createdAt: new Date(),
            updatedAt: new Date()
        });
        const result = await repository.create({
            id: 'plan1',
            supplierId: 's1',
            name: 'Test Plan',
            status: 'DRAFT',
            priority: 'MEDIUM',
            schedule: {
                startTime: new Date(),
                endTime: new Date(Date.now() + 60 * 60 * 1000)
            },
            targetQuantity: 10,
            actualQuantity: 0
        } as any);
        expect(mockPrisma.productionPlan.create).toHaveBeenCalled();
    });
});
