import { PaymentRepository } from '../payment.repository';
import { PrismaClient } from '@prisma/client';

const mockPrisma = {
    payment: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        findMany: jest.fn()
    }
} as unknown as PrismaClient;

describe('PaymentRepository', () => {
    let repository: PaymentRepository;

    beforeEach(() => {
        jest.clearAllMocks();
        repository = new PaymentRepository(mockPrisma);
    });

    it('should create payment', async () => {
        (mockPrisma.payment.create as jest.Mock).mockResolvedValue({ id: 'p1', amount: 100 });
        const result = await repository.create({} as any);
        expect(mockPrisma.payment.create).toHaveBeenCalled();
    });

    it('should find payment by id', async () => {
        (mockPrisma.payment.findUnique as jest.Mock).mockResolvedValue({ id: 'p1' });
        const result = await repository.findById('p1');
        expect(result).toBeDefined();
    });
});
