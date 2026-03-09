const mockRepository = {
    getGMV: jest.fn(),
    getActiveSellersCount: jest.fn(),
    getProductVelocityData: jest.fn()
};

const retentionExecuteMock = jest.fn();
const revenueExecuteMock = jest.fn();
const growthExecuteMock = jest.fn();

jest.mock('../../repositories/SellerAnalyticsRepository', () => ({
    SellerAnalyticsRepository: jest.fn().mockImplementation(() => mockRepository)
}));

jest.mock('../../../application/use-cases/GetRetentionMetrics', () => ({
    GetRetentionMetrics: jest.fn().mockImplementation(() => ({
        execute: retentionExecuteMock
    }))
}));

jest.mock('../../../application/use-cases/GetRevenueHealthMetrics', () => ({
    GetRevenueHealthMetrics: jest.fn().mockImplementation(() => ({
        execute: revenueExecuteMock
    }))
}));

jest.mock('../../../application/use-cases/GetGrowthIndicators', () => ({
    GetGrowthIndicators: jest.fn().mockImplementation(() => ({
        execute: growthExecuteMock
    }))
}));

import { SchedulerService as EnhancedSchedulerService } from '../EnhancedSchedulerService';

describe('EnhancedSchedulerService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('computes hourly metrics', async () => {
        const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
        mockRepository.getGMV.mockResolvedValue(1200);
        mockRepository.getActiveSellersCount.mockResolvedValue([{ id: 's1' }, { id: 's2' }]);

        const service = new EnhancedSchedulerService();
        await service.computeHourlyMetrics();

        expect(mockRepository.getGMV).toHaveBeenCalledWith(expect.any(Date), expect.any(Date));
        expect(mockRepository.getActiveSellersCount).toHaveBeenCalledWith(30);
        expect(logSpy).toHaveBeenCalledWith('[Hourly] GMV: 1200, Active Sellers: 2');
        logSpy.mockRestore();
    });

    it('computes daily/weekly/monthly metrics using corresponding use-cases', async () => {
        const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
        retentionExecuteMock.mockResolvedValue({ retentionRate90Days: 80, churnRateMonthly: 4 });
        revenueExecuteMock.mockResolvedValue({ arpsWeekly: 10, revenueDistributionTop20: 65 });
        growthExecuteMock.mockResolvedValue({ revenueGrowthMoM: 12, repeatBuyerRate: 40 });
        mockRepository.getProductVelocityData.mockResolvedValue([]);

        const service = new EnhancedSchedulerService();
        await service.computeDailyMetrics();
        await service.computeWeeklyMetrics();
        await service.computeMonthlyMetrics();

        expect(retentionExecuteMock).toHaveBeenCalledTimes(1);
        expect(revenueExecuteMock).toHaveBeenCalledWith('weekly');
        expect(growthExecuteMock).toHaveBeenCalledTimes(1);
        expect(logSpy).toHaveBeenCalledWith('[Daily] Retention: 80%, Churn: 4%');
        expect(logSpy).toHaveBeenCalledWith('[Weekly] ARPS: 10, Distribution: 65%');
        expect(logSpy).toHaveBeenCalledWith('[Monthly] MoM Growth: 12%, Repeat Buyers: 40%');
        logSpy.mockRestore();
    });

    it('logs errors on failed computations', async () => {
        const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
        const failure = new Error('failure');
        mockRepository.getGMV.mockRejectedValue(failure);

        const service = new EnhancedSchedulerService();
        await service.computeHourlyMetrics();

        expect(errorSpy).toHaveBeenCalledWith('Error computing hourly metrics:', failure);
        errorSpy.mockRestore();
    });

    it('starts interval scheduling for all computation windows', () => {
        const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
        const intervalSpy = jest.spyOn(global, 'setInterval').mockImplementation((() => 1) as any);
        const service = new EnhancedSchedulerService();

        service.startScheduler();

        expect(intervalSpy).toHaveBeenCalledTimes(4);
        expect(intervalSpy.mock.calls[0][1]).toBe(60 * 60 * 1000);
        expect(intervalSpy.mock.calls[1][1]).toBe(24 * 60 * 60 * 1000);
        expect(intervalSpy.mock.calls[2][1]).toBe(7 * 24 * 60 * 60 * 1000);
        expect(intervalSpy.mock.calls[3][1]).toBe(30 * 24 * 60 * 60 * 1000);
        expect(logSpy).toHaveBeenCalledWith('Metric scheduler started');

        intervalSpy.mockRestore();
        logSpy.mockRestore();
    });
});
