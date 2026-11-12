const mockPrisma = {
    order_Order: {
        aggregate: jest.fn(),
        count: jest.fn()
    },
    logistics_Delivery: {
        count: jest.fn()
    }
};

jest.mock('../../../infrastructure/database/prisma', () => ({
    __esModule: true,
    default: mockPrisma
}));

import { GetPlatformKpis } from '../GetPlatformKpis';

describe('GetPlatformKpis', () => {
    const repository = {
        getOrdersCount: jest.fn(),
        getActiveSellersCount: jest.fn(),
        getTotalSellersCount: jest.fn(),
        getDailyActiveUsersCount: jest.fn(),
        getBuyerConversionRate: jest.fn()
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('computes the full KPI payload with a consistent AOV and real rates', async () => {
        mockPrisma.order_Order.aggregate.mockResolvedValue({
            _sum: { totalAmount: 1000 },
            _count: { _all: 4 }
        });
        mockPrisma.order_Order.count
            .mockResolvedValueOnce(8) // COD delivered/completed
            .mockResolvedValueOnce(2); // COD cancelled
        mockPrisma.logistics_Delivery.count
            .mockResolvedValueOnce(9) // delivered
            .mockResolvedValueOnce(1); // failed/cancelled

        repository.getOrdersCount.mockResolvedValue(12);
        repository.getActiveSellersCount.mockResolvedValue([{ sellerId: 's1' }, { sellerId: 's2' }]);
        repository.getTotalSellersCount.mockResolvedValue(10);
        repository.getDailyActiveUsersCount.mockResolvedValue(5);
        repository.getBuyerConversionRate.mockResolvedValue(66.67);

        const result = await new GetPlatformKpis(repository as any).execute();

        expect(result).toEqual(expect.objectContaining({
            windowDays: 30,
            gmv: 1000,
            activeUsers: 5,
            activeSellers: 2,
            totalSellers: 10,
            orderCount: 12,
            conversionRate: 66.67,
            // AOV comes from the same aggregate as GMV: 1000 / 4 delivered.
            averageOrderValue: 250,
            // 8 / (8 + 2)
            codAcceptanceRate: 80,
            // 9 / (9 + 1)
            deliverySuccessRate: 90
        }));
        expect(typeof result.computedAt).toBe('string');
    });

    it('returns null (never a fake zero) when denominators have no data', async () => {
        mockPrisma.order_Order.aggregate.mockResolvedValue({
            _sum: { totalAmount: null },
            _count: { _all: 0 }
        });
        mockPrisma.order_Order.count.mockResolvedValue(0);
        mockPrisma.logistics_Delivery.count.mockResolvedValue(0);
        repository.getOrdersCount.mockResolvedValue(0);
        repository.getActiveSellersCount.mockResolvedValue([]);
        repository.getTotalSellersCount.mockResolvedValue(0);
        repository.getDailyActiveUsersCount.mockResolvedValue(0);
        repository.getBuyerConversionRate.mockResolvedValue(0);

        const result = await new GetPlatformKpis(repository as any).execute();

        expect(result.gmv).toBe(0);
        expect(result.activeSellers).toBe(0);
        expect(result.averageOrderValue).toBeNull();
        expect(result.codAcceptanceRate).toBeNull();
        expect(result.deliverySuccessRate).toBeNull();
    });
});