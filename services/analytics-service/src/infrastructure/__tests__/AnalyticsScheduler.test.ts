const loggerMock = {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
};

const sellerMetricsExecute = jest.fn();
const actionCenterExecute = jest.fn();
const courierExecute = jest.fn();
const enablerExecute = jest.fn();
const salesExecute = jest.fn();

jest.mock(
    '@modules/auth-service/src/infrastructure/services/logger.service',
    () => ({
        logger: loggerMock
    }),
    { virtual: true }
);

jest.mock('../SellerMetricsCalculationJob', () => ({
    SellerMetricsCalculationJob: jest.fn().mockImplementation(() => ({ execute: sellerMetricsExecute }))
}));

jest.mock('../ActionCenterGenerationJob', () => ({
    ActionCenterGenerationJob: jest.fn().mockImplementation(() => ({ execute: actionCenterExecute }))
}));

jest.mock('../CourierAnalyticsSyncJob', () => ({
    CourierAnalyticsSyncJob: jest.fn().mockImplementation(() => ({ execute: courierExecute }))
}));

jest.mock('../EnablerAnalyticsSyncJob', () => ({
    EnablerAnalyticsSyncJob: jest.fn().mockImplementation(() => ({ execute: enablerExecute }))
}));

jest.mock('../SalesAnalyticsSyncJob', () => ({
    SalesAnalyticsSyncJob: jest.fn().mockImplementation(() => ({ execute: salesExecute }))
}));

import { AnalyticsScheduler } from '../AnalyticsScheduler';

describe('AnalyticsScheduler', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        jest.useFakeTimers();
        [sellerMetricsExecute, actionCenterExecute, courierExecute, enablerExecute, salesExecute]
            .forEach(mock => mock.mockResolvedValue(undefined));
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    it('runs all five jobs immediately on start and schedules them', () => {
        const setIntervalSpy = jest.spyOn(global, 'setInterval').mockImplementation((() => ({ unref: () => undefined })) as any);

        const scheduler = new AnalyticsScheduler();
        scheduler.start();

        expect(sellerMetricsExecute).toHaveBeenCalledTimes(1);
        expect(actionCenterExecute).toHaveBeenCalledTimes(1);
        expect(courierExecute).toHaveBeenCalledTimes(1);
        expect(enablerExecute).toHaveBeenCalledTimes(1);
        expect(salesExecute).toHaveBeenCalledTimes(1);
        // One interval per job.
        expect(setIntervalSpy).toHaveBeenCalledTimes(5);

        scheduler.stop();
        setIntervalSpy.mockRestore();
    });

    it('prevents duplicate starts and clears intervals on stop', () => {
        const setIntervalSpy = jest.spyOn(global, 'setInterval').mockImplementation((() => ({ unref: () => undefined })) as any);
        const clearIntervalSpy = jest.spyOn(global, 'clearInterval').mockImplementation(() => undefined as any);

        const scheduler = new AnalyticsScheduler();
        scheduler.start();
        scheduler.start();
        scheduler.stop();

        expect(loggerMock.info).toHaveBeenCalledWith('[AnalyticsScheduler] Already running');
        expect(clearIntervalSpy).toHaveBeenCalledTimes(5);
        expect(loggerMock.info).toHaveBeenCalledWith('[AnalyticsScheduler] Stopped SellerMetricsCalculationJob');

        setIntervalSpy.mockRestore();
        clearIntervalSpy.mockRestore();
    });

    it('logs failures from scheduled runs without throwing', async () => {
        const failure = new Error('job failed');
        sellerMetricsExecute.mockRejectedValue(failure);
        const setIntervalSpy = jest.spyOn(global, 'setInterval').mockImplementation((cb: any) => {
            cb();
            return { unref: () => undefined } as any;
        });

        const scheduler = new AnalyticsScheduler();
        scheduler.start();
        await Promise.resolve();
        await Promise.resolve();

        expect(loggerMock.error).toHaveBeenCalledWith(
            '[AnalyticsScheduler] Initial run of SellerMetricsCalculationJob failed:',
            failure
        );

        scheduler.stop();
        setIntervalSpy.mockRestore();
    });
});