import { OutboxProcessorJob } from './outbox-processor.job';

describe('OutboxProcessorJob', () => {
  it('publishes pending events and marks them as published', async () => {
    const findMany = jest.fn().mockResolvedValue([
      { id: 'evt-1', type: 'TrainingCompleted.v1' },
      { id: 'evt-2', type: 'BadgeEarned.v1' }
    ]);
    const update = jest.fn().mockResolvedValue(undefined);
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);

    const job = new OutboxProcessorJob({ outbox: { findMany, update } } as never);
    await job.run();

    expect(findMany).toHaveBeenCalledWith({ where: { published: false }, take: 50 });
    expect(update).toHaveBeenCalledTimes(2);
    expect(logSpy).toHaveBeenCalledWith('Publishing event evt-1 of type TrainingCompleted.v1');
    expect(logSpy).toHaveBeenCalledWith('Publishing event evt-2 of type BadgeEarned.v1');
    logSpy.mockRestore();
  });

  it('throws when no outbox delegate exists on prisma client', async () => {
    const job = new OutboxProcessorJob({} as never);

    await expect(job.run()).rejects.toThrow('Outbox delegate is not configured on prisma client');
  });
});
