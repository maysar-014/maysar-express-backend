const mockPrisma = {
    analytics_SellerMetrics: {
        findFirst: jest.fn(),
        upsert: jest.fn()
    },
    analytics_SalesAnalytics: {
        findMany: jest.fn(),
        create: jest.fn()
    },
    order_Order: {
        findMany: jest.fn(),
        groupBy: jest.fn(),
        count: jest.fn(),
        aggregate: jest.fn()
    },
    order_OrderItem: {
        groupBy: jest.fn()
    },
    user_User: {
        findMany: jest.fn()
    },
    payout: {
        findMany: jest.fn()
    },
    support_Ticket: {
        findMany: jest.fn()
    },
    product: {
        findMany: jest.fn()
    },
    commission_Referral: {
        findMany: jest.fn()
    }
};

jest.mock('../../database/prisma', () => ({
    __esModule: true,
    default: mockPrisma
}));

import { SellerAnalyticsRepository } from '../SellerAnalyticsRepository';

describe('SellerAnalyticsRepository', () => {
    let repository: SellerAnalyticsRepository;

    beforeEach(() => {
        jest.clearAllMocks();
        repository = new SellerAnalyticsRepository();
    });

    it('gets and updates seller metrics', async () => {
        mockPrisma.analytics_SellerMetrics.findFirst.mockResolvedValue({ sellerId: 's1' });
        mockPrisma.analytics_SellerMetrics.upsert.mockResolvedValue({ sellerId: 's1', activeVisitors: 100 });

        const existing = await repository.getMetrics('s1');
        const updated = await repository.updateMetrics('s1', { activeVisitors: 100 });

        expect(mockPrisma.analytics_SellerMetrics.findFirst).toHaveBeenCalledWith({
            where: { sellerId: 's1' }
        });
        expect(mockPrisma.analytics_SellerMetrics.upsert).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { sellerId: 's1' },
                update: { activeVisitors: 100 }
            })
        );
        expect(existing).toEqual({ sellerId: 's1' });
        expect(updated).toEqual({ sellerId: 's1', activeVisitors: 100 });
    });

    it('gets and saves sales analytics', async () => {
        mockPrisma.analytics_SalesAnalytics.findMany.mockResolvedValue([{ sellerId: 's1' }]);
        mockPrisma.analytics_SalesAnalytics.create.mockResolvedValue({ sellerId: 's1' });

        const data = await repository.getSalesData('s1');
        const saved = await repository.saveSalesAnalytics('s1', { trend: 'up' });

        expect(mockPrisma.analytics_SalesAnalytics.findMany).toHaveBeenCalledWith({
            where: { sellerId: 's1' },
            orderBy: { date: 'desc' },
            take: 30
        });
        expect(mockPrisma.analytics_SalesAnalytics.create).toHaveBeenCalledWith({
            data: {
                sellerId: 's1',
                date: expect.any(Date),
                insights: JSON.stringify({ trend: 'up' })
            }
        });
        expect(data).toEqual([{ sellerId: 's1' }]);
        expect(saved).toEqual({ sellerId: 's1' });
    });
});
