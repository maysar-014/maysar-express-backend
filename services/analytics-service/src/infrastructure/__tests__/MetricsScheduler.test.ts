const loggerMock = {
    info: jest.fn(),
    error: jest.fn()
};

const executeMock = jest.fn();

jest.mock(
    '@modules/auth-service/src/infrastructure/services/logger.service',
    () => ({
        logger: loggerMock
    }),
    { virtual: true }
);

jest.mock('../SellerMetricsCalculationJob', () => ({
    SellerMetricsCalculationJob: jest.fn().mockImplementation(() => ({
        execute: executeMock
    }))
}));

import { MetricsScheduler } from '../MetricsScheduler';

describe('MetricsScheduler', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    it('starts scheduler, runs immediately, and schedules recurring runs', () => {
        const setIntervalSpy = jest.spyOn(global, 'setInterval').mockImplementation((() => 1) as any);
        executeMock.mockResolvedValue(undefined);

        const scheduler = new MetricsScheduler();
        scheduler.start(5);

        expect(loggerMock.info).toHaveBeenCalledWith('[MetricsScheduler] Starting with 5 minute interval');
        expect(executeMock).toHaveBeenCalledTimes(1);
        expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 5 * 60 * 1000);

        setIntervalSpy.mockRestore();
    });

    it('prevents duplicate starts and supports stop', () => {
        const setIntervalSpy = jest.spyOn(global, 'setInterval').mockImplementation((() => 1) as any);
        const clearIntervalSpy = jest.spyOn(global, 'clearInterval').mockImplementation(() => undefined as any);
        executeMock.mockResolvedValue(undefined);

        const scheduler = new MetricsScheduler();
        scheduler.start();
        scheduler.start();
        scheduler.stop();

        expect(loggerMock.info).toHaveBeenCalledWith('[MetricsScheduler] Already running');
        expect(clearIntervalSpy).toHaveBeenCalledWith(1 as any);
        expect(loggerMock.info).toHaveBeenCalledWith('[MetricsScheduler] Stopped');

        setIntervalSpy.mockRestore();
        clearIntervalSpy.mockRestore();
    });

    it('logs async execution failures for initial and scheduled runs', async () => {
        const failure = new Error('job failed');
        const setIntervalSpy = jest.spyOn(global, 'setInterval').mockImplementation((cb: any) => {
            cb();
            return 1 as any;
        });
        executeMock.mockRejectedValue(failure);

        const scheduler = new MetricsScheduler();
        scheduler.start(1);
        await Promise.resolve();
        await Promise.resolve();

        expect(loggerMock.error).toHaveBeenCalledWith('[MetricsScheduler] Initial run failed:', failure);
        expect(loggerMock.error).toHaveBeenCalledWith('[MetricsScheduler] Scheduled run failed:', failure);

        setIntervalSpy.mockRestore();
    });
});
