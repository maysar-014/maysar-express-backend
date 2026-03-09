const loggerMock = {
    info: jest.fn(),
    error: jest.fn()
};

const mockPrisma = {
    user_User: {
        findMany: jest.fn()
    },
    analytics_SellerMetrics: {
        update: jest.fn()
    }
};

const repeatExecuteMock = jest.fn();
const bestProductExecuteMock = jest.fn();
const salesTrendExecuteMock = jest.fn();
const inventoryExecuteMock = jest.fn();
const profitabilityExecuteMock = jest.fn();

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

jest.mock('../../application/use-cases/CalculateRepeatCustomers', () => ({
    CalculateRepeatCustomers: jest.fn().mockImplementation(() => ({
        execute: repeatExecuteMock
    }))
}));

jest.mock('../../application/use-cases/IdentifyBestPerformingProduct', () => ({
    IdentifyBestPerformingProduct: jest.fn().mockImplementation(() => ({
        execute: bestProductExecuteMock
    }))
}));

jest.mock('../../application/use-cases/GenerateSalesTrend', () => ({
    GenerateSalesTrend: jest.fn().mockImplementation(() => ({
        execute: salesTrendExecuteMock
    }))
}));

jest.mock('../../application/use-cases/CalculateInventoryHealth', () => ({
    CalculateInventoryHealth: jest.fn().mockImplementation(() => ({
        execute: inventoryExecuteMock
    }))
}));

jest.mock('../../application/use-cases/CalculateProfitabilityScore', () => ({
    CalculateProfitabilityScore: jest.fn().mockImplementation(() => ({
        execute: profitabilityExecuteMock
    }))
}));

import { SellerMetricsCalculationJob } from '../SellerMetricsCalculationJob';

describe('SellerMetricsCalculationJob', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('calculates all metrics for each active seller', async () => {
        mockPrisma.user_User.findMany.mockResolvedValue([{ id: 'seller-1' }, { id: 'seller-2' }]);
        repeatExecuteMock.mockResolvedValue(undefined);
        bestProductExecuteMock.mockResolvedValue(undefined);
        salesTrendExecuteMock.mockResolvedValue(undefined);
        inventoryExecuteMock.mockResolvedValue(undefined);
        profitabilityExecuteMock.mockResolvedValue(undefined);
        mockPrisma.analytics_SellerMetrics.update.mockResolvedValue(undefined);

        const job = new SellerMetricsCalculationJob();
        await job.execute();

        expect(repeatExecuteMock).toHaveBeenCalledTimes(2);
        expect(bestProductExecuteMock).toHaveBeenCalledTimes(2);
        expect(salesTrendExecuteMock).toHaveBeenCalledTimes(2);
        expect(inventoryExecuteMock).toHaveBeenCalledTimes(2);
        expect(profitabilityExecuteMock).toHaveBeenCalledTimes(2);
        expect(mockPrisma.analytics_SellerMetrics.update).toHaveBeenCalledTimes(2);
        expect(loggerMock.info).toHaveBeenCalledWith('[SellerMetricsCalculationJob] Completed for 2 sellers');
    });

    it('logs per-seller calculation errors and continues safely', async () => {
        mockPrisma.user_User.findMany.mockResolvedValue([{ id: 'seller-1' }]);
        const failure = new Error('calculation failed');
        repeatExecuteMock.mockRejectedValue(failure);

        const job = new SellerMetricsCalculationJob();
        await expect(job.execute()).resolves.toBeUndefined();
        expect(loggerMock.error).toHaveBeenCalledWith(
            '[SellerMetricsCalculationJob] Error for seller seller-1:',
            failure
        );
    });

    it('logs outer execution errors when seller discovery fails', async () => {
        const failure = new Error('db down');
        mockPrisma.user_User.findMany.mockRejectedValue(failure);

        const job = new SellerMetricsCalculationJob();
        await expect(job.execute()).resolves.toBeUndefined();
        expect(loggerMock.error).toHaveBeenCalledWith('[SellerMetricsCalculationJob] Error:', failure);
    });
});
