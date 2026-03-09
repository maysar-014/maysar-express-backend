const scheduleMock = jest.fn();

jest.mock('node-cron', () => ({
    __esModule: true,
    default: {
        schedule: scheduleMock
    }
}), { virtual: true });

import { SchedulerService } from '../SchedulerService';

describe('SchedulerService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('schedules tasks and executes provided handler', async () => {
        const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
        const task = jest.fn().mockResolvedValue(undefined);

        const service = new SchedulerService();
        service.scheduleTask('daily-rollup', '*/5 * * * *', task);

        expect(scheduleMock).toHaveBeenCalledWith('*/5 * * * *', expect.any(Function));
        const scheduledHandler = scheduleMock.mock.calls[0][1];
        await scheduledHandler();

        expect(task).toHaveBeenCalledTimes(1);
        expect(logSpy).toHaveBeenCalledWith('Scheduled task daily-rollup with cron */5 * * * *');
        expect(logSpy).toHaveBeenCalledWith('Executing task: daily-rollup');
        logSpy.mockRestore();
    });

    it('logs task execution errors', async () => {
        const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
        const service = new SchedulerService();
        const failure = new Error('boom');

        service.scheduleTask('failing-task', '* * * * *', async () => {
            throw failure;
        });

        const scheduledHandler = scheduleMock.mock.calls[0][1];
        await scheduledHandler();

        expect(errorSpy).toHaveBeenCalledWith('Error executing task failing-task:', failure);
        errorSpy.mockRestore();
    });

    it('runs batch processing placeholder without throwing', async () => {
        const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
        const service = new SchedulerService();
        await expect(service.runBatchProcessing()).resolves.toBeUndefined();
        expect(logSpy).toHaveBeenCalledWith('Running scheduled batch processing...');
        logSpy.mockRestore();
    });
});
