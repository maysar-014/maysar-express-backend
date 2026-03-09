import { SchedulerService } from './scheduler.service';

describe('SchedulerService', () => {
  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('executes scheduled jobs after the configured delay', async () => {
    jest.useFakeTimers();
    const service = new SchedulerService();
    const job = jest.fn().mockResolvedValue(undefined);

    service.schedule(job, 1000);
    jest.advanceTimersByTime(1000);
    await Promise.resolve();

    expect(job).toHaveBeenCalledTimes(1);
  });

  it('logs job errors instead of throwing', async () => {
    jest.useFakeTimers();
    const service = new SchedulerService();
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const job = jest.fn().mockRejectedValue(new Error('boom'));

    service.schedule(job, 500);
    jest.advanceTimersByTime(500);
    await Promise.resolve();

    expect(job).toHaveBeenCalledTimes(1);
    expect(errorSpy).toHaveBeenCalled();
  });
});
