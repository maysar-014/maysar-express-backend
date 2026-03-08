import { PaymentRepository } from '../payment.repository';
import { Payment } from '../../../domain/entities/payment.entity';

interface MockPaymentDelegate {
    create: jest.Mock;
    findUnique: jest.Mock;
    update: jest.Mock;
    findMany: jest.Mock;
    findFirst: jest.Mock;
    updateMany: jest.Mock;
    aggregate: jest.Mock;
    count: jest.Mock;
}

interface MockPrisma {
    payment: MockPaymentDelegate;
}

const mockPrisma = {
    payment: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        updateMany: jest.fn(),
        aggregate: jest.fn(),
        count: jest.fn()
    }
} as MockPrisma;

describe('PaymentRepository', () => {
    let repository: PaymentRepository;

    beforeEach(() => {
        jest.clearAllMocks();
        repository = new PaymentRepository(mockPrisma);
    });

    it('should create payment', async () => {
        (mockPrisma.payment.create as jest.Mock).mockResolvedValue({ id: 'p1', amount: 100 });
        await repository.create({} as Payment);
        expect(mockPrisma.payment.create).toHaveBeenCalled();
    });

    it('should find payment by id', async () => {
        (mockPrisma.payment.findUnique as jest.Mock).mockResolvedValue({ id: 'p1' });
        const result = await repository.findById('p1');
        expect(result).toBeDefined();
    });
});
