const loggerMock = {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
};

const mockPrisma = {
    logistics_Courier: {
        findMany: jest.fn()
    },
    logistics_Delivery: {
        findFirst: jest.fn()
    },
    analytics_CourierAnalytics: {
        upsert: jest.fn()
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

import { CourierAnalyticsSyncJob } from '../CourierAnalyticsSyncJob';

describe('CourierAnalyticsSyncJob', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('upserts analytics rows for every courier with a blended performance score', async () => {
        mockPrisma.logistics_Courier.findMany.mockResolvedValue([
            {
                id: 'courier-1',
                status: 'online',
                onTimeDeliveryRate: 80,
                customerRating: 4,
                completedDeliveries: 10,
                totalEarnings: 500,
                updatedAt: new Date('2026-01-01T00:00:00.000Z')
            }
        ]);
        mockPrisma.logistics_Delivery.findFirst.mockResolvedValue({
            actualDeliveryTime: new Date('2026-01-02T00:00:00.000Z')
        });
        mockPrisma.analytics_CourierAnalytics.upsert.mockResolvedValue(undefined);

        const job = new CourierAnalyticsSyncJob();
        await job.execute();

        expect(mockPrisma.analytics_CourierAnalytics.upsert).toHaveBeenCalledTimes(1);
        const arg = mockPrisma.analytics_CourierAnalytics.upsert.mock.calls[0][0];
        expect(arg.where).toEqual({ courierId: 'courier-1' });
        // rating 4 → 80; blended with on-time 80 → 80
        expect(arg.create).toEqual(expect.objectContaining({
            courierId: 'courier-1',
            performanceScore: 80,
            deliveriesCompleted: 10,
            totalEarnings: 500,
            vehicleStatus: 'online'
        }));
        expect(loggerMock.info).toHaveBeenCalledWith('[CourierAnalyticsSyncJob] Completed for 1 couriers');
    });

    it('logs per-courier errors and continues', async () => {
        mockPrisma.logistics_Courier.findMany.mockResolvedValue([
            { id: 'courier-1', status: 'online', onTimeDeliveryRate: 80, customerRating: 4, completedDeliveries: 10, totalEarnings: 500, updatedAt: new Date() }
        ]);
        const failure = new Error('upsert failed');
        mockPrisma.logistics_Delivery.findFirst.mockRejectedValue(failure);

        const job = new CourierAnalyticsSyncJob();
        await expect(job.execute()).resolves.toBeUndefined();
        expect(loggerMock.error).toHaveBeenCalledWith('[CourierAnalyticsSyncJob] Error for courier courier-1:', failure);
    });

    it('logs outer errors when courier discovery fails', async () => {
        const failure = new Error('db down');
        mockPrisma.logistics_Courier.findMany.mockRejectedValue(failure);

        const job = new CourierAnalyticsSyncJob();
        await expect(job.execute()).resolves.toBeUndefined();
        expect(loggerMock.error).toHaveBeenCalledWith('[CourierAnalyticsSyncJob] Error:', failure);
    });
});