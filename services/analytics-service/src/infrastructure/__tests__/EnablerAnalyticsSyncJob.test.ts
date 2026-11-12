const loggerMock = {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
};

const mockPrisma = {
    enabler_Profile: {
        findMany: jest.fn()
    },
    analytics_EnablerAnalytics: {
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

import { EnablerAnalyticsSyncJob } from '../EnablerAnalyticsSyncJob';

describe('EnablerAnalyticsSyncJob', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('upserts analytics rows mapped from the enabler profile', async () => {
        mockPrisma.enabler_Profile.findMany.mockResolvedValue([
            {
                id: 'enabler-1',
                status: 'ACTIVE',
                tier: 'GOLD',
                totalSales: 1000,
                totalOrders: 20,
                conversionRate: 0.4,
                totalCommissionEarned: 250,
                updatedAt: new Date('2026-01-01T00:00:00.000Z'),
                trainingCompletedAt: new Date('2025-12-01T00:00:00.000Z')
            }
        ]);
        mockPrisma.analytics_EnablerAnalytics.upsert.mockResolvedValue(undefined);

        const job = new EnablerAnalyticsSyncJob();
        await job.execute();

        expect(mockPrisma.analytics_EnablerAnalytics.upsert).toHaveBeenCalledTimes(1);
        const arg = mockPrisma.analytics_EnablerAnalytics.upsert.mock.calls[0][0];
        expect(arg.where).toEqual({ enablerId: 'enabler-1' });
        expect(arg.create).toEqual(expect.objectContaining({
            enablerId: 'enabler-1',
            totalEarnings: 250,
            salesSupported: 20,
            totalSalesValue: 1000,
            conversionRate: 0.4,
            successRate: 1,
            certificatesIssued: 1,
            skillLevel: 'gold'
        }));
        expect(loggerMock.info).toHaveBeenCalledWith('[EnablerAnalyticsSyncJob] Completed for 1 enablers');
    });

    it('logs per-enabler errors and continues', async () => {
        mockPrisma.enabler_Profile.findMany.mockResolvedValue([
            { id: 'enabler-1', status: 'PENDING', tier: 'BRONZE', totalSales: 0, totalOrders: 0, conversionRate: 0, totalCommissionEarned: 0, updatedAt: new Date(), trainingCompletedAt: null }
        ]);
        const failure = new Error('upsert failed');
        mockPrisma.analytics_EnablerAnalytics.upsert.mockRejectedValue(failure);

        const job = new EnablerAnalyticsSyncJob();
        await expect(job.execute()).resolves.toBeUndefined();
        expect(loggerMock.error).toHaveBeenCalledWith('[EnablerAnalyticsSyncJob] Error for enabler enabler-1:', failure);
    });

    it('logs outer errors when enabler discovery fails', async () => {
        const failure = new Error('db down');
        mockPrisma.enabler_Profile.findMany.mockRejectedValue(failure);

        const job = new EnablerAnalyticsSyncJob();
        await expect(job.execute()).resolves.toBeUndefined();
        expect(loggerMock.error).toHaveBeenCalledWith('[EnablerAnalyticsSyncJob] Error:', failure);
    });
});