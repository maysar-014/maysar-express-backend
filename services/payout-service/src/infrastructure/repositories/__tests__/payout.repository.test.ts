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

const mockPiiService = {
    encrypt: jest.fn((val) => val),
    decrypt: jest.fn((val) => val),
    hash: jest.fn((val) => val)
} as any;

describe('PayoutRepository', () => {
    let repository: PayoutRepository;

    beforeEach(() => {
        jest.clearAllMocks();
        repository = new PayoutRepository(mockPrisma, mockPiiService);
    });

    it('should create payout', async () => {
        (mockPrisma.payout.create as jest.Mock).mockResolvedValue({
            id: 'p1',
            recipientId: 'r1',
            amount: 100,
            currency: 'USD',
            status: 'PENDING'
        });

        const mockPayout = { toObject: () => ({ id: 'p1' }) };
        const result = await repository.save(mockPayout as any);

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
