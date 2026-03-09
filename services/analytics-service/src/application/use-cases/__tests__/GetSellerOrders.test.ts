const mockPrisma = {
    order_Order: {
        findMany: jest.fn()
    }
};

jest.mock('../../../infrastructure/database/prisma', () => ({
    __esModule: true,
    default: mockPrisma
}));

import { GetSellerOrders } from '../GetSellerOrders';

describe('GetSellerOrders', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('groups orders by status buckets', async () => {
        mockPrisma.order_Order.findMany.mockResolvedValue([
            {
                id: 'o1',
                buyerId: 'b1',
                totalAmount: 100,
                status: 'PENDING',
                createdAt: new Date('2026-01-01T00:00:00.000Z'),
                items: [{ id: 'i1' }]
            },
            {
                id: 'o2',
                buyerId: 'b2',
                totalAmount: 200,
                status: 'DELIVERED',
                createdAt: new Date('2026-01-02T00:00:00.000Z'),
                items: [{ id: 'i1' }, { id: 'i2' }]
            },
            {
                id: 'o3',
                buyerId: 'b3',
                totalAmount: 150,
                status: 'CANCELLED',
                createdAt: new Date('2026-01-03T00:00:00.000Z'),
                items: []
            }
        ]);

        const useCase = new GetSellerOrders();
        const result = await useCase.execute('seller-1');

        expect(mockPrisma.order_Order.findMany).toHaveBeenCalledWith({
            where: { sellerId: 'seller-1' },
            include: { items: true },
            orderBy: { createdAt: 'desc' }
        });
        expect(result.new).toHaveLength(1);
        expect(result.completed).toHaveLength(1);
        expect(result.disputed).toHaveLength(1);
        expect(result.processing).toHaveLength(0);
        expect(result.shipped).toHaveLength(0);
        expect(result.completed[0]).toEqual({
            id: 'o2',
            buyerId: 'b2',
            amount: 200,
            paymentStatus: 'DELIVERED',
            createdAt: new Date('2026-01-02T00:00:00.000Z'),
            itemCount: 2
        });
    });
});
