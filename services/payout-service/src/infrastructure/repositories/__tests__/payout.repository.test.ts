import { PayoutRepository } from '../payout.repository';
import { PrismaClient } from '@prisma/client';

const mockPrisma = {
    payout: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        findMany: jest.fn()
    }
} as unknown as PrismaClient;

describe('PayoutRepository', () => {
    let repository: PayoutRepository;

    beforeEach(() => {
        jest.clearAllMocks();
        repository = new PayoutRepository(mockPrisma);
    });

    it('should create payout', async () => {
        (mockPrisma.payout.create as jest.Mock).mockResolvedValue({
            id: 'p1',
            recipientId: 'r1',
            amount: 100,
            currency: 'USD',
            status: 'PENDING'
        });

        const result = await repository.create({} as any);

        expect(mockPrisma.payout.create).toHaveBeenCalled();
    });

    it('should find payout by id', async () => {
        (mockPrisma.payout.findUnique as jest.Mock).mockResolvedValue({
            id: 'p1',
            recipientId: 'r1',
            amount: 100,
            currency: 'USD',
            status: 'PENDING'
        });

        const result = await repository.findById('p1');

        expect(result).toBeDefined();
    });
});
