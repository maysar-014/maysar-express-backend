import { ProductionPlanRepository } from '../ProductionPlanRepository';
import { PrismaClient } from '@prisma/client';

const mockPrisma = {
    productionPlan: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn()
    }
} as unknown as PrismaClient;

describe('ProductionPlanRepository', () => {
    let repository: ProductionPlanRepository;

    beforeEach(() => {
        jest.clearAllMocks();
        repository = new ProductionPlanRepository(mockPrisma);
    });

    it('should create plan', async () => {
        (mockPrisma.productionPlan.create as jest.Mock).mockResolvedValue({ id: 'plan1' });
        const result = await repository.create({} as any);
        expect(mockPrisma.productionPlan.create).toHaveBeenCalled();
    });
});
