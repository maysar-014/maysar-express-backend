import { RefundRepository } from '../refund.repository';
import { PrismaClient } from '@prisma/client';

const mockPrisma = {
    refund: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn()
    }
} as unknown as PrismaClient;

describe('RefundRepository', () => {
    let repository: RefundRepository;

    beforeEach(() => {
        jest.clearAllMocks();
        repository = new RefundRepository(mockPrisma);
    });

    it('should create refund', async () => {
        (mockPrisma.refund.create as jest.Mock).mockResolvedValue({ id: 'r1', amount: 50 });
        const result = await repository.create({} as any);
        expect(mockPrisma.refund.create).toHaveBeenCalled();
    });
});
