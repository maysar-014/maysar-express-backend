import { RefundRepository } from '../refund.repository';

const mockPrisma = {
    refund: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn()
    }
} as any;

describe('RefundRepository', () => {
    let repository: RefundRepository;

    beforeEach(() => {
        jest.clearAllMocks();
        repository = new RefundRepository(mockPrisma);
    });

    it('should create refund', async () => {
        const refund = {
            toObject: jest.fn().mockReturnValue({
                id: 'r1',
                paymentId: 'p1',
                orderId: 'o1',
                userId: 'u1',
                amount: 50,
                currency: 'TZS',
                reason: 'CUSTOMER_REQUEST',
                status: 'PENDING',
                createdAt: new Date('2026-03-28T00:00:00.000Z'),
                updatedAt: new Date('2026-03-28T00:00:00.000Z')
            })
        } as any;

        await repository.save(refund);

        expect(mockPrisma.refund.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    id: 'r1',
                    paymentId: 'p1',
                    orderId: 'o1'
                })
            })
        );
    });
});
