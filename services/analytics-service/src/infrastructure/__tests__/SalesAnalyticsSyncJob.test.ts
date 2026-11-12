const loggerMock = {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
};

const mockPrisma = {
    order_Order: {
        groupBy: jest.fn(),
        findMany: jest.fn()
    },
    analytics_SalesAnalytics: {
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn()
    }
};

jest.mock(
    '@modules/auth-service/src/infrastructure/services/logger.service',
    () => ({
        logger: loggerMock
    }),
    { virtual: true }
);

jest.mock('../database/prisma', () => ({
    __esModule: true,
    default: mockPrisma
}));

import { SalesAnalyticsSyncJob } from '../SalesAnalyticsSyncJob';

describe('SalesAnalyticsSyncJob', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('creates an insights row for a seller with no existing row today', async () => {
        mockPrisma.order_Order.groupBy.mockResolvedValue([{ sellerId: 'seller-1' }]);
        mockPrisma.order_Order.findMany.mockResolvedValue([
            { totalAmount: 100 },
            { totalAmount: 200 }
        ]);
        mockPrisma.analytics_SalesAnalytics.findFirst.mockResolvedValue(null);
        mockPrisma.analytics_SalesAnalytics.create.mockResolvedValue(undefined);

        const job = new SalesAnalyticsSyncJob();
        await job.execute();

        expect(mockPrisma.analytics_SalesAnalytics.create).toHaveBeenCalledTimes(1);
        const created = mockPrisma.analytics_SalesAnalytics.create.mock.calls[0][0].data;
        expect(created.sellerId).toBe('seller-1');
        const insights = JSON.parse(created.insights);
        expect(insights.revenue).toBe(300);
        expect(insights.orderCount).toBe(2);
        expect(insights.averageOrderValue).toBe(150);
        expect(loggerMock.info).toHaveBeenCalledWith('[SalesAnalyticsSyncJob] Completed for 1 sellers');
    });

    it('updates an existing row instead of duplicating when one exists today', async () => {
        mockPrisma.order_Order.groupBy.mockResolvedValue([{ sellerId: 'seller-1' }]);
        mockPrisma.order_Order.findMany.mockResolvedValue([{ totalAmount: 50 }]);
        mockPrisma.analytics_SalesAnalytics.findFirst.mockResolvedValue({ id: 'existing-1' });
        mockPrisma.analytics_SalesAnalytics.update.mockResolvedValue(undefined);

        const job = new SalesAnalyticsSyncJob();
        await job.execute();

        expect(mockPrisma.analytics_SalesAnalytics.create).not.toHaveBeenCalled();
        expect(mockPrisma.analytics_SalesAnalytics.update).toHaveBeenCalledTimes(1);
        expect(mockPrisma.analytics_SalesAnalytics.update.mock.calls[0][0].where).toEqual({ id: 'existing-1' });
    });

    it('logs per-seller errors and continues', async () => {
        mockPrisma.order_Order.groupBy.mockResolvedValue([{ sellerId: 'seller-1' }]);
        const failure = new Error('find failed');
        mockPrisma.order_Order.findMany.mockRejectedValue(failure);

        const job = new SalesAnalyticsSyncJob();
        await expect(job.execute()).resolves.toBeUndefined();
        expect(loggerMock.error).toHaveBeenCalledWith('[SalesAnalyticsSyncJob] Error for seller seller-1:', failure);
    });

    it('logs outer errors when seller discovery fails', async () => {
        const failure = new Error('db down');
        mockPrisma.order_Order.groupBy.mockRejectedValue(failure);

        const job = new SalesAnalyticsSyncJob();
        await expect(job.execute()).resolves.toBeUndefined();
        expect(loggerMock.error).toHaveBeenCalledWith('[SalesAnalyticsSyncJob] Error:', failure);
    });
});