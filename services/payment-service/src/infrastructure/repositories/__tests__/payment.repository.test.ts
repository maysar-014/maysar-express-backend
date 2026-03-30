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
        const payment = {
            toObject: jest.fn().mockReturnValue({
                id: 'p1',
                orderId: 'o1',
                userId: 'u1',
                amount: 100,
                currency: 'TZS',
                method: 'CARD',
                provider: 'PESAPAL',
                status: 'PENDING',
                metadata: {},
                refundedAmount: 0,
                failureReason: undefined,
                createdAt: new Date('2026-03-28T00:00:00.000Z'),
                updatedAt: new Date('2026-03-28T00:00:00.000Z'),
                completedAt: undefined,
                version: 1
            })
        } as unknown as Payment;

        await repository.create(payment);

        expect(mockPrisma.payment.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    id: 'p1',
                    orderId: 'o1',
                    userId: 'u1'
                })
            })
        );
    });

    it('should find payment by id', async () => {
        (mockPrisma.payment.findUnique as jest.Mock).mockResolvedValue({
            id: 'p1',
            orderId: 'o1',
            userId: 'u1',
            amount: 100,
            currency: 'TZS',
            method: 'CARD',
            provider: 'PESAPAL',
            status: 'COMPLETED',
            metadata: {},
            refundedAmount: 0,
            failureReason: null,
            createdAt: new Date('2026-03-28T00:00:00.000Z'),
            updatedAt: new Date('2026-03-28T00:00:00.000Z'),
            completedAt: new Date('2026-03-28T00:05:00.000Z'),
            version: 1
        });
        const result = await repository.findById('p1');
        expect(result).toBeDefined();
        expect(result?.id).toBe('p1');
    });
});
